import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerAdminThread } from './entities/customer-admin-thread.entity';
import { CustomerAdminMessage } from './entities/customer-admin-message.entity';
import { CustomerAdminMessageDeletion } from './entities/customer-admin-message-deletion.entity';
import { SendMessageDto } from './dto/send-message.dto';
import { ListMessagesDto } from './dto/list-messages.dto';
import { IUserInfo } from '../interfaces/IUserInfo';
import { userStatus, userType } from '../constants/user';
import { customerCanAccessCustomerId } from '../helpers/customer-scope';
import { Customer } from '../users/entities/customer.entity';
import { errorCode } from '../constants/errorCode';
import { ReportFault } from '../report-faults/entities/report-fault.entity';
import { UserTask } from '../user-tasks/entities/user-task.entity';
import { reportFaultStatus } from '../constants/status';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    @InjectRepository(CustomerAdminThread)
    private readonly threadRepo: Repository<CustomerAdminThread>,
    @InjectRepository(CustomerAdminMessage)
    private readonly messageRepo: Repository<CustomerAdminMessage>,
    @InjectRepository(CustomerAdminMessageDeletion)
    private readonly deletionRepo: Repository<CustomerAdminMessageDeletion>,
    @InjectRepository(ReportFault)
    private readonly reportFaultRepo: Repository<ReportFault>,
    @InjectRepository(UserTask)
    private readonly userTaskRepo: Repository<UserTask>,
  ) {}

  private preview(text: string, max = 120): string {
    const t = text.replace(/\s+/g, ' ').trim();
    return t.length <= max ? t : `${t.slice(0, max)}…`;
  }

  private parseAttachFiles(raw?: string): string[] {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((u) => typeof u === 'string' && u) : [];
    } catch {
      return [];
    }
  }

  private reportFaultLink(reportFaultId: number): string {
    return `/report-faults?faultId=${reportFaultId}`;
  }

  private newReportLink(userTaskId: number): string {
    return `/new-reports?reportId=${userTaskId}`;
  }

  private resolveMessageReportLink(
    reportFaultId?: number | null,
    userTaskId?: number | null,
    reportReference?: string | null,
    body?: string | null,
  ): string | null {
    if (reportFaultId) return this.reportFaultLink(+reportFaultId);
    if (userTaskId) return this.newReportLink(+userTaskId);
    const text = `${reportReference || ''}\n${body || ''}`;
    const faultPath = text.match(/\/report-faults\?faultId=(\d+)/i);
    if (faultPath?.[1]) return this.reportFaultLink(+faultPath[1]);
    const newReportPath = text.match(/\/new-reports\?reportId=(\d+)/i);
    if (newReportPath?.[1]) return this.newReportLink(+newReportPath[1]);
    const newReportRef = text.match(/New report #(\d+)/i);
    if (newReportRef?.[1]) return this.newReportLink(+newReportRef[1]);
    const faultRef = text.match(/Fault report #(\d+)/i);
    if (faultRef?.[1]) return this.reportFaultLink(+faultRef[1]);
    return null;
  }

  private buildReportFaultReferenceBlock(fault: ReportFault): { reference: string; fullBodyPrefix: string } {
    const link = this.reportFaultLink(fault.id);
    const reference = `Fault report #${fault.id}: ${fault.subject || 'Fault report'}`;
    const fullBodyPrefix =
      `📋 ${reference}\n` +
      `View report: ${link}\n` +
      `Site: ${fault.siteName || '—'} · ${fault.serviceName || '—'}\n` +
      `────────────────────\n\n`;
    return { reference, fullBodyPrefix };
  }

  private notDeletedForUserSql() {
    return `NOT EXISTS (
      SELECT 1 FROM customer_admin_message_deletions d
      WHERE d.message_id = m.id AND d.user_id = :viewerId
    )`;
  }

  private deletedForUserSql() {
    return `EXISTS (
      SELECT 1 FROM customer_admin_message_deletions d
      WHERE d.message_id = m.id AND d.user_id = :viewerId AND d.purged_at IS NULL
    )`;
  }

  private async loadSenderDisplayInfo(
    senderIds: number[],
  ): Promise<Map<number, { name: string; companyName: string | null }>> {
    const ids = [...new Set(senderIds.map((id) => +id).filter((id) => id > 0))];
    if (!ids.length) return new Map();
    const rows: { id: number; name: string; company_name: string | null }[] =
      await this.threadRepo.query(
        `SELECT u.id,
          COALESCE(
            NULLIF(TRIM(u.full_name), ''),
            NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''),
            u.username
          ) AS name,
          COALESCE(
            NULLIF(TRIM(org.name), ''),
            NULLIF(TRIM(c.company_name), '')
          ) AS company_name
         FROM users u
         LEFT JOIN customers c ON c.user_id = u.id
         LEFT JOIN customer_companies org ON org.id = c.company_id
         WHERE u.id = ANY($1::int[])`,
        [ids],
      );
    return new Map(
      rows.map((r) => [
        +r.id,
        { name: r.name, companyName: r.company_name?.trim() || null },
      ]),
    );
  }

  private mapMessageRow(
    m: CustomerAdminMessage,
    userInfo: IUserInfo,
    senderInfo: Map<number, { name: string; companyName: string | null }>,
  ) {
    const sender = senderInfo.get(+m.senderId);
    return {
      id: m.id,
      threadId: m.threadId,
      senderId: +m.senderId,
      senderType: m.senderType,
      senderName: sender?.name || null,
      senderCompanyName: sender?.companyName || null,
      body: m.body,
      reportFaultId: m.reportFaultId,
      userTaskId: m.userTaskId,
      reportReference: m.reportReference,
      reportLink: this.resolveMessageReportLink(
        m.reportFaultId,
        m.userTaskId,
        m.reportReference,
        m.body,
      ),
      attachFiles: this.parseAttachFiles(m.attachFiles),
      createdAt: m.createdAt,
      isMine: +m.senderId === +userInfo.userId,
    };
  }

  private canAccessThread(userInfo: IUserInfo, thread: CustomerAdminThread): boolean {
    const type = +userInfo.type;
    if (type === userType.CUSTOMER) {
      return +thread.customerId === +userInfo.userId && !thread.staffId && !thread.peerStaffId;
    }
    if (type === userType.STAFF) {
      if (thread.peerStaffId) {
        return (
          +thread.staffId === +userInfo.userId || +thread.peerStaffId === +userInfo.userId
        );
      }
      return +thread.staffId === +userInfo.userId && !thread.customerId;
    }
    if (type === userType.ADMIN) {
      return true;
    }
    return false;
  }

  private async listActiveAdminUsers(): Promise<
    Array<{ id: number; fullName: string }>
  > {
    const rows: Array<{ id: number; fullName: string }> = await this.threadRepo.query(
      `
      SELECT u.id,
        COALESCE(
          NULLIF(TRIM(u.full_name), ''),
          NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''),
          u.username
        ) AS "fullName"
      FROM users u
      WHERE u.type = $1 AND u.status != $2
      ORDER BY "fullName"
      `,
      [userType.ADMIN, userStatus.DELETE],
    );
    return rows.map((r) => ({
      id: +r.id,
      fullName: r.fullName || `Admin #${r.id}`,
    }));
  }

  /** Other staff at the same employer (staff.company_name). */
  private async sameCompanyStaffPeerRows(
    anchorStaffId: number,
    excludeStaffId?: number,
  ): Promise<Array<{ id: number; fullName: string; companyName: string | null }>> {
    const exclude = excludeStaffId ?? 0;
    const rows = await this.threadRepo.query(
      `
      SELECT u.id,
        COALESCE(
          NULLIF(TRIM(u.full_name), ''),
          NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''),
          u.username
        ) AS "fullName",
        NULLIF(TRIM(s2.company_name), '') AS "companyName"
      FROM staff s1
      INNER JOIN staff s2 ON (
        TRIM(COALESCE(s1.company_name, '')) <> ''
        AND LOWER(TRIM(s2.company_name)) = LOWER(TRIM(s1.company_name))
      )
      INNER JOIN users u ON u.id = s2.user_id
      WHERE s1.user_id = $1
        AND u.status != $3
        AND s2.user_id != $2
      ORDER BY "fullName"
      `,
      [anchorStaffId, exclude, userStatus.DELETE],
    );
    return rows.map((r: any) => ({
      id: +r.id,
      fullName: r.fullName || `User #${r.id}`,
      companyName: r.companyName?.trim() || null,
    }));
  }

  private applyConversationFilter(
    qb: ReturnType<Repository<CustomerAdminMessage>['createQueryBuilder']>,
    viewerId: number,
    filterSenderId?: number,
    filterSenderType?: number,
  ) {
    if (!filterSenderId) return qb;
    const fid = +filterSenderId;
    if (filterSenderType === userType.ADMIN) {
      return qb.andWhere(
        '(m.sender_id = :viewerId OR (m.sender_id = :fid AND m.sender_type = :adminType))',
        { viewerId, fid, adminType: userType.ADMIN },
      );
    }
    if (filterSenderType === userType.CUSTOMER) {
      return qb.andWhere(
        '(m.sender_id = :viewerId OR (m.sender_id = :fid AND m.sender_type = :custType))',
        { viewerId, fid, custType: userType.CUSTOMER },
      );
    }
    if (filterSenderType === userType.STAFF) {
      return qb.andWhere(
        '(m.sender_id = :viewerId OR (m.sender_id = :fid AND m.sender_type = :staffType))',
        { viewerId, fid, staffType: userType.STAFF },
      );
    }
    return qb.andWhere('(m.sender_id = :viewerId OR m.sender_id = :fid)', {
      viewerId,
      fid,
    });
  }

  /** Customers and staff only message Servicelink (admin), never each other. */
  private blockCustomerStaffCrossMessaging(
    userInfo: IUserInfo,
    opts: { customerId?: number; staffId?: number; peerStaffId?: number },
  ) {
    const type = +userInfo.type;
    if (type === userType.CUSTOMER && opts.staffId != null && +opts.staffId > 0) {
      return {
        ...errorCode.VALIDATION_ERROR,
        message:
          'Customers cannot message staff directly. Use your Servicelink Support conversation.',
      };
    }
    if (type === userType.CUSTOMER && opts.peerStaffId != null && +opts.peerStaffId > 0) {
      return {
        ...errorCode.VALIDATION_ERROR,
        message: 'Customers cannot message staff directly.',
      };
    }
    if (type === userType.STAFF && opts.customerId != null && +opts.customerId > 0) {
      return {
        ...errorCode.VALIDATION_ERROR,
        message:
          'Staff cannot message customers directly. Use Servicelink admin or a staff colleague.',
      };
    }
    return null;
  }

  private customerRepo() {
    return this.threadRepo.manager.getRepository(Customer);
  }

  private async resolveUserType(userId: number, fallback: number): Promise<number> {
    const t = +fallback;
    if (t === userType.ADMIN || t === userType.CUSTOMER || t === userType.STAFF) return t;
    const rows: Array<{ type: number }> = await this.threadRepo.query(
      `SELECT type FROM users WHERE id = $1`,
      [+userId],
    );
    const resolved = rows?.[0]?.type != null ? +rows[0].type : 0;
    if (resolved === userType.ADMIN || resolved === userType.CUSTOMER || resolved === userType.STAFF) {
      return resolved;
    }
    return t || userType.CUSTOMER;
  }

  /** Other active customer logins at the same organisation (for message CC). */
  private async sameCompanyPeerRows(
    anchorCustomerId: number,
    excludeCustomerId?: number,
  ): Promise<Array<{ id: number; fullName: string; companyName: string | null }>> {
    const exclude = excludeCustomerId ?? 0;
    const rows = await this.threadRepo.query(
      `
      SELECT c.user_id AS id,
        COALESCE(
          NULLIF(TRIM(u.full_name), ''),
          NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''),
          u.username
        ) AS "fullName",
        COALESCE(
          NULLIF(TRIM(org.name), ''),
          NULLIF(TRIM(c.company_name), '')
        ) AS "companyName"
      FROM customers anchor
      INNER JOIN customers c ON (
        (
          anchor.company_id IS NOT NULL
          AND c.company_id = anchor.company_id
        )
        OR (
          anchor.company_id IS NULL
          AND TRIM(COALESCE(anchor.company_name, '')) <> ''
          AND LOWER(TRIM(c.company_name)) = LOWER(TRIM(anchor.company_name))
        )
      )
      INNER JOIN users u ON u.id = c.user_id
      LEFT JOIN customer_companies org ON org.id = c.company_id
      WHERE anchor.user_id = $1
        AND u.status != $3
        AND c.user_id != $2
      ORDER BY "fullName"
      `,
      [anchorCustomerId, exclude, userStatus.DELETE],
    );
    return rows.map((r: any) => ({
      id: +r.id,
      fullName: r.fullName || `User #${r.id}`,
      companyName: r.companyName?.trim() || null,
    }));
  }

  async listCompanyCcRecipients(userInfo: IUserInfo, customerId?: number) {
    try {
      const type = await this.resolveUserType(+userInfo.userId, +userInfo.type);
      if (type === userType.STAFF) {
        return { ...errorCode.SUCCESS, data: { rows: [] } };
      }
      let anchorId = customerId ? +customerId : 0;
      if (type === userType.CUSTOMER) {
        anchorId = +userInfo.userId;
      } else if (type === userType.ADMIN && !anchorId) {
        // Avoid 400 loops if client calls without customerId.
        return { ...errorCode.SUCCESS, data: { rows: [] } };
      } else if (type !== userType.ADMIN || !anchorId) {
        return { ...errorCode.SUCCESS, data: { rows: [] } };
      }
      if (type === userType.CUSTOMER) {
        if (anchorId !== +userInfo.userId) {
          return errorCode.NOT_FOUND;
        }
      } else {
        const anchor = await this.customerRepo().findOne({
          where: { userId: anchorId },
        });
        if (!anchor) {
          return { ...errorCode.SUCCESS, data: { rows: [] } };
        }
      }
      const rows = await this.sameCompanyPeerRows(anchorId, anchorId);
      return { ...errorCode.SUCCESS, data: { rows } };
    } catch (error) {
      this.logger.error(error);
      return { ...errorCode.EXCEPTION, message: (error as Error).message };
    }
  }

  private async resolveCcCustomerIds(
    primaryCustomerId: number,
    requested?: number[],
  ): Promise<number[]> {
    let ids = [...new Set((requested || []).map((id) => +id).filter((id) => id > 0))];
    ids = ids.filter((id) => id !== primaryCustomerId);
    if (!ids.length) {
      const peers = await this.sameCompanyPeerRows(primaryCustomerId, primaryCustomerId);
      return peers.map((p) => p.id);
    }
    const valid: number[] = [];
    for (const id of ids) {
      if (await customerCanAccessCustomerId(this.customerRepo(), primaryCustomerId, id)) {
        valid.push(id);
      }
    }
    return valid;
  }

  private async saveMessageToThread(
    thread: CustomerAdminThread,
    userInfo: IUserInfo,
    fields: {
      body: string;
      reportFaultId?: number;
      userTaskId?: number;
      reportReference?: string;
      attachFiles: string | null;
    },
  ): Promise<CustomerAdminMessage> {
    const msg = this.messageRepo.create({
      threadId: thread.id,
      senderId: +userInfo.userId,
      senderType: +userInfo.type,
      body: fields.body,
      reportFaultId: fields.reportFaultId,
      userTaskId: fields.userTaskId,
      reportReference: fields.reportReference,
      attachFiles: fields.attachFiles,
    });
    await this.messageRepo.save(msg);
    thread.lastMessagePreview = this.preview(fields.body);
    thread.updatedAt = new Date();
    await this.threadRepo.save(thread);
    return msg;
  }

  private async deliverCcToCompanyPeers(
    userInfo: IUserInfo,
    anchorCustomerId: number,
    ccCustomerIds: number[] | undefined,
    fields: {
      body: string;
      reportFaultId?: number;
      userTaskId?: number;
      reportReference?: string;
      attachFiles: string | null;
    },
    alsoExcludeCustomerIds: number[] = [],
  ): Promise<void> {
    const exclude = new Set(
      [anchorCustomerId, ...alsoExcludeCustomerIds]
        .map((id) => +id)
        .filter((id) => id > 0),
    );
    let ccIds = await this.resolveCcCustomerIds(anchorCustomerId, ccCustomerIds);
    ccIds = ccIds.filter((id) => !exclude.has(id));
    for (const ccId of ccIds) {
      const ccThread = await this.getOrCreateCustomerThread(ccId);
      await this.saveMessageToThread(ccThread, userInfo, fields);
    }
  }

  private async getMessageInAccessibleThread(userInfo: IUserInfo, messageId: number) {
    const msg = await this.messageRepo.findOne({ where: { id: messageId } });
    if (!msg) return null;
    const thread = await this.threadRepo.findOne({ where: { id: msg.threadId } });
    if (!thread || !this.canAccessThread(userInfo, thread)) return null;
    return { msg, thread };
  }

  private buildNewReportReferenceBlock(task: UserTask): { reference: string; fullBodyPrefix: string } {
    const link = this.newReportLink(task.id);
    const title = task.taskName?.trim() || task.description?.trim() || 'New report';
    const reference = `New report #${task.id}: ${title}`;
    const fullBodyPrefix =
      `📋 ${reference}\n` +
      `View report: ${link}\n` +
      `Site: ${task.siteName || '—'} · ${task.serviceName || '—'}\n` +
      `────────────────────\n\n`;
    return { reference, fullBodyPrefix };
  }

  async getOrCreateCustomerThread(customerId: number): Promise<CustomerAdminThread> {
    let thread = await this.threadRepo
      .createQueryBuilder('t')
      .where('t.customer_id = :customerId', { customerId })
      .andWhere('t.staff_id IS NULL')
      .andWhere('t.peer_staff_id IS NULL')
      .getOne();
    if (!thread) {
      thread = this.threadRepo.create({ customerId });
      thread = await this.threadRepo.save(thread);
    }
    return thread;
  }

  async getOrCreateStaffThread(staffId: number): Promise<CustomerAdminThread> {
    let thread = await this.threadRepo
      .createQueryBuilder('t')
      .where('t.staff_id = :staffId', { staffId })
      .andWhere('t.customer_id IS NULL')
      .andWhere('t.peer_staff_id IS NULL')
      .getOne();
    if (!thread) {
      thread = this.threadRepo.create({ staffId });
      thread = await this.threadRepo.save(thread);
    }
    return thread;
  }

  async getOrCreateStaffPeerThread(
    staffId: number,
    peerStaffId: number,
  ): Promise<CustomerAdminThread> {
    const a = +staffId;
    const b = +peerStaffId;
    if (!a || !b || a === b) {
      throw new Error('Invalid staff peer');
    }
    let thread = await this.threadRepo.findOne({
      where: { staffId: a, peerStaffId: b },
    });
    if (!thread) {
      thread = await this.threadRepo.findOne({
        where: { staffId: b, peerStaffId: a },
      });
    }
    if (!thread) {
      thread = this.threadRepo.create({ staffId: a, peerStaffId: b });
      thread = await this.threadRepo.save(thread);
    }
    return thread;
  }

  private async resolveThreadForUser(
    userInfo: IUserInfo,
    customerId?: number,
    staffId?: number,
  ): Promise<CustomerAdminThread | null> {
    const type = +userInfo.type;
    if (type === userType.CUSTOMER) {
      return this.getOrCreateCustomerThread(+userInfo.userId);
    }
    if (type === userType.STAFF) {
      return this.getOrCreateStaffThread(+userInfo.userId);
    }
    if (type === userType.ADMIN) {
      if (staffId) return this.getOrCreateStaffThread(staffId);
      if (customerId) return this.getOrCreateCustomerThread(customerId);
      return null;
    }
    return null;
  }

  async listThreads(userInfo: IUserInfo) {
    const type = +userInfo.type;
    if (type === userType.ADMIN) {
      return this.listThreadsForAdmin(userInfo);
    }
    if (type === userType.CUSTOMER || type === userType.STAFF) {
      return this.listThreadsForSupportUser(userInfo);
    }
    return { ...errorCode.CAN_NOT_DELETE, message: 'Not allowed' };
  }

  /** Customer/staff inbox: admin users, colleagues, and (staff) peer threads. */
  async listThreadsForSupportUser(userInfo: IUserInfo) {
    try {
      const type = +userInfo.type;
      const viewerId = +userInfo.userId;
      const isStaff = type === userType.STAFF;

      const supportThread = isStaff
        ? await this.getOrCreateStaffThread(viewerId)
        : await this.getOrCreateCustomerThread(viewerId);

      const lastRead = isStaff
        ? supportThread.staffLastReadAt
        : supportThread.customerLastReadAt;

      const rows: any[] = [];
      const admins = await this.listActiveAdminUsers();

      for (const admin of admins) {
        const lastFromAdmin = await this.messageRepo
          .createQueryBuilder('m')
          .where('m.thread_id = :threadId', { threadId: supportThread.id })
          .andWhere('m.sender_id = :adminId', { adminId: admin.id })
          .andWhere('m.sender_type = :st', { st: userType.ADMIN })
          .andWhere(this.notDeletedForUserSql(), { viewerId })
          .orderBy('m.created_at', 'DESC')
          .getOne();

        const unreadQb = this.messageRepo
          .createQueryBuilder('m')
          .where('m.thread_id = :threadId', { threadId: supportThread.id })
          .andWhere('m.sender_id = :adminId', { adminId: admin.id })
          .andWhere('m.sender_type = :st', { st: userType.ADMIN })
          .andWhere(this.notDeletedForUserSql(), { viewerId });
        if (lastRead) {
          unreadQb.andWhere('m.created_at > :readAt', { readAt: lastRead });
        }
        const unreadCount = await unreadQb.getCount();

        rows.push({
          threadId: supportThread.id,
          peerType: 'admin',
          peerId: admin.id,
          customerId: isStaff ? null : viewerId,
          staffId: isStaff ? viewerId : null,
          customerName: admin.fullName,
          companyName: 'Servicelink',
          lastMessagePreview: lastFromAdmin
            ? this.preview(lastFromAdmin.body)
            : 'No messages yet',
          updatedAt: lastFromAdmin?.createdAt ?? supportThread.updatedAt,
          unreadCount,
          conversationKind: 'admin',
          filterSenderId: admin.id,
          filterSenderType: userType.ADMIN,
        });
      }

      if (!isStaff) {
        const peers = await this.sameCompanyPeerRows(viewerId, 0);
        for (const peer of peers) {
          const lastFromPeer = await this.messageRepo
            .createQueryBuilder('m')
            .where('m.thread_id = :threadId', { threadId: supportThread.id })
            .andWhere('m.sender_id = :peerId', { peerId: peer.id })
            .andWhere(this.notDeletedForUserSql(), { viewerId })
            .orderBy('m.created_at', 'DESC')
            .getOne();

          const peerUnreadQb = this.messageRepo
            .createQueryBuilder('m')
            .where('m.thread_id = :threadId', { threadId: supportThread.id })
            .andWhere('m.sender_id = :peerId', { peerId: peer.id })
            .andWhere(this.notDeletedForUserSql(), { viewerId });
          if (lastRead) {
            peerUnreadQb.andWhere('m.created_at > :readAt', { readAt: lastRead });
          }
          const peerUnread = await peerUnreadQb.getCount();

          rows.push({
            threadId: supportThread.id,
            peerType: 'customer',
            peerId: peer.id,
            customerId: viewerId,
            staffId: null,
            customerName: peer.fullName,
            companyName: peer.companyName,
            lastMessagePreview: lastFromPeer
              ? this.preview(lastFromPeer.body)
              : 'No messages yet',
            updatedAt: lastFromPeer?.createdAt ?? supportThread.updatedAt,
            unreadCount: peerUnread,
            conversationKind: 'colleague',
            filterSenderId: peer.id,
            filterSenderType: userType.CUSTOMER,
          });
        }
      } else {
        const staffPeers = await this.sameCompanyStaffPeerRows(viewerId, 0);
        for (const peer of staffPeers) {
          const peerThread = await this.getOrCreateStaffPeerThread(viewerId, peer.id);
          const lastMsg = await this.messageRepo
            .createQueryBuilder('m')
            .where('m.thread_id = :threadId', { threadId: peerThread.id })
            .andWhere(this.notDeletedForUserSql(), { viewerId })
            .orderBy('m.created_at', 'DESC')
            .getOne();

          const peerUnreadQb = this.messageRepo
            .createQueryBuilder('m')
            .where('m.thread_id = :threadId', { threadId: peerThread.id })
            .andWhere('m.sender_id != :viewerId', { viewerId })
            .andWhere(this.notDeletedForUserSql(), { viewerId });
          const peerUnread = await peerUnreadQb.getCount();

          rows.push({
            threadId: peerThread.id,
            peerType: 'staff',
            peerId: peer.id,
            customerId: null,
            staffId: viewerId,
            peerStaffId: peer.id,
            customerName: peer.fullName,
            companyName: peer.companyName,
            lastMessagePreview: lastMsg
              ? this.preview(lastMsg.body)
              : 'No messages yet',
            updatedAt: lastMsg?.createdAt ?? peerThread.updatedAt,
            unreadCount: peerUnread,
            conversationKind: 'colleague',
            filterSenderId: null,
            filterSenderType: null,
          });
        }
      }

      rows.sort(
        (a, b) =>
          new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime(),
      );

      return { ...errorCode.SUCCESS, data: { rows } };
    } catch (error) {
      this.logger.error(error);
      return { ...errorCode.EXCEPTION, message: (error as Error).message };
    }
  }

  async listNewMessageRecipients(userInfo: IUserInfo) {
    try {
      const type = +userInfo.type;
      if (type !== userType.CUSTOMER && type !== userType.STAFF) {
        return { ...errorCode.CAN_NOT_DELETE, message: 'Not allowed' };
      }
      const viewerId = +userInfo.userId;
      const admins = await this.listActiveAdminUsers();
      const colleagues =
        type === userType.STAFF
          ? await this.sameCompanyStaffPeerRows(viewerId, viewerId)
          : await this.sameCompanyPeerRows(viewerId, viewerId);
      return {
        ...errorCode.SUCCESS,
        data: {
          admins: admins.map((a) => ({ id: a.id, fullName: a.fullName })),
          colleagues: colleagues.map((c) => ({
            id: c.id,
            fullName: c.fullName,
            companyName: c.companyName,
          })),
        },
      };
    } catch (error) {
      this.logger.error(error);
      return { ...errorCode.EXCEPTION, message: (error as Error).message };
    }
  }

  async listThreadsForAdmin(userInfo: IUserInfo) {
    try {
      if (+userInfo.type !== userType.ADMIN) {
        return { ...errorCode.CAN_NOT_DELETE, message: 'Admin only' };
      }

      const rawThreads = await this.threadRepo.query(`
        SELECT
          t.id AS "threadId",
          t.customer_id AS "customerId",
          t.staff_id AS "staffId",
          t.last_message_preview AS "lastMessagePreview",
          t.updated_at AS "updatedAt",
          t.admin_last_read_at AS "adminLastReadAt",
          CASE
            WHEN t.staff_id IS NOT NULL THEN 'staff'
            ELSE 'customer'
          END AS "peerType",
          CASE
            WHEN t.staff_id IS NOT NULL THEN COALESCE(
              NULLIF(TRIM(us.full_name), ''),
              NULLIF(TRIM(CONCAT(COALESCE(us.first_name, ''), ' ', COALESCE(us.last_name, ''))), ''),
              us.username
            )
            ELSE COALESCE(
              NULLIF(TRIM(uc.full_name), ''),
              NULLIF(TRIM(CONCAT(COALESCE(uc.first_name, ''), ' ', COALESCE(uc.last_name, ''))), ''),
              uc.username
            )
          END AS "peerName",
          CASE
            WHEN t.staff_id IS NOT NULL THEN NULL
            ELSE COALESCE(
              NULLIF(TRIM(org.name), ''),
              NULLIF(TRIM(cc.company_name), '')
            )
          END AS "companyName"
        FROM customer_admin_threads t
        LEFT JOIN users uc ON uc.id = t.customer_id
        LEFT JOIN customers cc ON cc.user_id = t.customer_id
        LEFT JOIN customer_companies org ON org.id = cc.company_id
        LEFT JOIN users us ON us.id = t.staff_id
        WHERE t.customer_id IS NOT NULL OR t.staff_id IS NOT NULL
        ORDER BY t.updated_at DESC NULLS LAST
      `);

      const rows = await Promise.all(
        rawThreads.map(async (row: any) => {
          const peerSenderType =
            row.peerType === 'staff' ? userType.STAFF : userType.CUSTOMER;
          const viewerId = +userInfo.userId;
          let actualUnread = 0;
          const unreadQb = this.messageRepo
            .createQueryBuilder('m')
            .where('m.thread_id = :threadId', { threadId: +row.threadId })
            .andWhere('m.sender_type = :st', { st: peerSenderType })
            .andWhere(this.notDeletedForUserSql(), { viewerId });
          if (row.adminLastReadAt) {
            unreadQb.andWhere('m.created_at > :readAt', { readAt: row.adminLastReadAt });
          }
          actualUnread = await unreadQb.getCount();

          const peerId =
            row.peerType === 'staff' ? +row.staffId : +row.customerId;

          return {
            threadId: +row.threadId,
            peerType: row.peerType,
            peerId,
            customerId: row.customerId ? +row.customerId : null,
            staffId: row.staffId ? +row.staffId : null,
            customerName: row.peerName || `User #${peerId}`,
            companyName: row.companyName?.trim() || null,
            lastMessagePreview: row.lastMessagePreview,
            updatedAt: row.updatedAt,
            unreadCount: actualUnread,
          };
        }),
      );

      return { ...errorCode.SUCCESS, data: { rows } };
    } catch (error) {
      this.logger.error(error);
      return { ...errorCode.EXCEPTION, message: (error as Error).message };
    }
  }

  async listMessages(userInfo: IUserInfo, query: ListMessagesDto) {
    try {
      const type = +userInfo.type;
      if (type !== userType.ADMIN && type !== userType.CUSTOMER && type !== userType.STAFF) {
        return { ...errorCode.CAN_NOT_DELETE, message: 'Not allowed' };
      }

      const crossRole = this.blockCustomerStaffCrossMessaging(userInfo, {
        customerId: query.customerId,
        staffId: query.staffId,
        peerStaffId: query.peerStaffId,
      });
      if (crossRole) return crossRole;

      let thread: CustomerAdminThread | null = null;
      if (type === userType.CUSTOMER) {
        if (query.threadId) {
          thread = await this.threadRepo.findOne({ where: { id: query.threadId } });
        } else {
          thread = await this.getOrCreateCustomerThread(+userInfo.userId);
        }
      } else if (type === userType.STAFF) {
        if (query.peerStaffId) {
          thread = await this.getOrCreateStaffPeerThread(
            +userInfo.userId,
            +query.peerStaffId,
          );
        } else if (query.threadId) {
          thread = await this.threadRepo.findOne({ where: { id: query.threadId } });
        } else {
          thread = await this.getOrCreateStaffThread(+userInfo.userId);
        }
      } else if (query.threadId) {
        thread = await this.threadRepo.findOne({ where: { id: query.threadId } });
      } else {
        thread = await this.resolveThreadForUser(
          userInfo,
          query.customerId,
          query.staffId,
        );
      }

      if (!thread) {
        return { ...errorCode.NOT_FOUND, message: 'Conversation not found' };
      }

      if (!this.canAccessThread(userInfo, thread)) {
        return errorCode.NOT_FOUND;
      }

      const viewerId = +userInfo.userId;
      const showDeleted = Boolean(query.deleted);

      const qb = this.messageRepo
        .createQueryBuilder('m')
        .where('m.thread_id = :threadId', { threadId: thread.id })
        .andWhere(showDeleted ? this.deletedForUserSql() : this.notDeletedForUserSql(), {
          viewerId,
        })
        .orderBy('m.created_at', 'ASC');

      this.applyConversationFilter(
        qb,
        viewerId,
        query.filterSenderId,
        query.filterSenderType,
      );

      const keyword = query.keyword?.trim();
      if (keyword) {
        const kw = `%${keyword}%`;
        qb.andWhere(
          `(
            m.body ILIKE :kw
            OR COALESCE(m.report_reference, '') ILIKE :kw
            OR CAST(COALESCE(m.report_fault_id, 0) AS TEXT) ILIKE :kw
            OR CAST(COALESCE(m.user_task_id, 0) AS TEXT) ILIKE :kw
            OR COALESCE(m.attach_files, '') ILIKE :kw
          )`,
          { kw },
        );
      }

      const total = await qb.getCount();
      const messages = await qb
        .skip((query.page - 1) * query.limit)
        .take(query.limit)
        .getMany();

      const senderInfo = await this.loadSenderDisplayInfo(messages.map((m) => m.senderId));

      const countBase = () =>
        this.messageRepo
          .createQueryBuilder('m')
          .where('m.thread_id = :threadId', { threadId: thread.id });

      const activeQb = countBase().andWhere(this.notDeletedForUserSql(), { viewerId });
      this.applyConversationFilter(
        activeQb,
        viewerId,
        query.filterSenderId,
        query.filterSenderType,
      );
      const activeCount = await activeQb.getCount();

      const deletedQb = countBase().andWhere(this.deletedForUserSql(), { viewerId });
      this.applyConversationFilter(
        deletedQb,
        viewerId,
        query.filterSenderId,
        query.filterSenderType,
      );
      const deletedCount = await deletedQb.getCount();

      const sentQb = countBase()
        .andWhere(this.notDeletedForUserSql(), { viewerId })
        .andWhere('m.sender_id = :viewerId', { viewerId });
      this.applyConversationFilter(
        sentQb,
        viewerId,
        query.filterSenderId,
        query.filterSenderType,
      );
      const sentCount = await sentQb.getCount();
      const receivedCount = Math.max(0, activeCount - sentCount);

      return {
        ...errorCode.SUCCESS,
        data: {
          threadId: thread.id,
          customerId: thread.customerId ?? null,
          staffId: thread.staffId ?? null,
          peerType: thread.staffId ? 'staff' : 'customer',
          count: total,
          activeCount,
          deletedCount,
          receivedCount,
          sentCount,
          rows: messages.map((m) => this.mapMessageRow(m, userInfo, senderInfo)),
        },
      };
    } catch (error) {
      this.logger.error(error);
      return { ...errorCode.EXCEPTION, message: (error as Error).message };
    }
  }

  async sendMessage(userInfo: IUserInfo, body: SendMessageDto) {
    try {
      const type = +userInfo.type;
      const crossRole = this.blockCustomerStaffCrossMessaging(userInfo, {
        customerId: body.customerId,
        staffId: body.staffId,
        peerStaffId: body.peerStaffId,
      });
      if (crossRole) return crossRole;

      if (type === userType.STAFF && (body.reportFaultId || body.userTaskId)) {
        return {
          ...errorCode.VALIDATION_ERROR,
          message: 'Report links are only available in customer conversations',
        };
      }

      let thread: CustomerAdminThread;
      let reportFaultOwnerId: number | undefined;

      if (type === userType.CUSTOMER) {
        thread = await this.getOrCreateCustomerThread(+userInfo.userId);
      } else if (type === userType.STAFF) {
        if (body.peerStaffId) {
          thread = await this.getOrCreateStaffPeerThread(
            +userInfo.userId,
            +body.peerStaffId,
          );
        } else {
          thread = await this.getOrCreateStaffThread(+userInfo.userId);
        }
      } else if (body.staffId) {
        thread = await this.getOrCreateStaffThread(+body.staffId);
      } else if (body.customerId) {
        thread = await this.getOrCreateCustomerThread(+body.customerId);
      } else if (body.userTaskId) {
        const taskForCustomer = await this.userTaskRepo.findOne({
          where: { id: body.userTaskId },
        });
        if (!taskForCustomer || taskForCustomer.type !== 'CUSTOM') {
          return { ...errorCode.NOT_FOUND, message: 'New report not found' };
        }
        thread = await this.getOrCreateCustomerThread(+taskForCustomer.customerId);
      } else if (body.reportFaultId) {
        const faultForCustomer = await this.reportFaultRepo.findOne({
          where: { id: body.reportFaultId },
        });
        if (!faultForCustomer) return errorCode.NOT_FOUND;
        thread = await this.getOrCreateCustomerThread(+faultForCustomer.customerId);
      } else {
        return {
          ...errorCode.VALIDATION_ERROR,
          message: 'customerId or staffId is required',
        };
      }

      if (type === userType.CUSTOMER) {
        if (!thread.customerId || +thread.customerId !== +userInfo.userId) {
          return {
            ...errorCode.VALIDATION_ERROR,
            message: 'Customers can only use their Servicelink Support conversation',
          };
        }
      }
      if (type === userType.STAFF) {
        if (thread.peerStaffId) {
          const ok =
            +thread.staffId === +userInfo.userId ||
            +thread.peerStaffId === +userInfo.userId;
          if (!ok) {
            return {
              ...errorCode.VALIDATION_ERROR,
              message: 'Staff colleague conversation not found',
            };
          }
        } else if (!thread.staffId || +thread.staffId !== +userInfo.userId) {
          return {
            ...errorCode.VALIDATION_ERROR,
            message: 'Staff can only use their Servicelink Support conversation',
          };
        }
      }

      const customerId = thread.customerId ? +thread.customerId : 0;
      const attachments = this.parseAttachFiles(body.attachFiles);
      let messageBody = (body.body || '').trim();
      if (!messageBody && attachments.length === 0) {
        return {
          ...errorCode.VALIDATION_ERROR,
          message: 'Enter a message or attach at least one file',
        };
      }
      if (!messageBody && attachments.length > 0) {
        messageBody = '📎 Attachment';
      }
      let reportReference: string | undefined;
      let reportFaultId: number | undefined;
      let userTaskId: number | undefined;

      if (body.reportFaultId) {
        const fault = await this.reportFaultRepo.findOne({
          where: { id: body.reportFaultId },
        });
        if (!fault || +fault.status === reportFaultStatus.DELETED) {
          return { ...errorCode.NOT_FOUND, message: 'Report fault not found' };
        }
        if (type === userType.CUSTOMER) {
          const canAccess = await customerCanAccessCustomerId(
            this.customerRepo(),
            +userInfo.userId,
            +fault.customerId,
          );
          if (!canAccess) {
            return errorCode.NOT_FOUND;
          }
          reportFaultOwnerId = +fault.customerId;
          thread = await this.getOrCreateCustomerThread(reportFaultOwnerId);
        } else if (type === userType.ADMIN && thread.customerId && +fault.customerId !== customerId) {
          return errorCode.NOT_FOUND;
        }
        const ref = this.buildReportFaultReferenceBlock(fault);
        reportReference = ref.reference;
        reportFaultId = fault.id;
        if (!messageBody.includes(this.reportFaultLink(fault.id))) {
          messageBody = ref.fullBodyPrefix + messageBody;
        }
        if (+fault.status === reportFaultStatus.PENDING) {
          fault.status = reportFaultStatus.INPROGRESS;
          fault.updatedAt = new Date();
          await this.reportFaultRepo.save(fault);
        }
      }

      if (body.userTaskId) {
        const task = await this.userTaskRepo.findOne({
          where: { id: body.userTaskId },
        });
        if (!task || task.type !== 'CUSTOM') {
          return { ...errorCode.NOT_FOUND, message: 'New report not found' };
        }
        if (+task.staffId <= 0) {
          return {
            ...errorCode.VALIDATION_ERROR,
            message: 'Only staff-submitted new reports can be referenced',
          };
        }
        if (type === userType.CUSTOMER && +task.customerId !== +userInfo.userId) {
          return errorCode.NOT_FOUND;
        }
        if (type === userType.ADMIN && thread.customerId && +task.customerId !== customerId) {
          return errorCode.NOT_FOUND;
        }
        const ref = this.buildNewReportReferenceBlock(task);
        reportReference = ref.reference;
        userTaskId = task.id;
        if (!messageBody.includes(this.newReportLink(task.id))) {
          messageBody = ref.fullBodyPrefix + messageBody;
        }
        if (type === userType.CUSTOMER) {
          task.adminOpenedAt = null;
          task.updatedAt = new Date();
          await this.userTaskRepo.save(task);
        }
      }

      const attachJson = attachments.length > 0 ? JSON.stringify(attachments) : null;
      const messageFields = {
        body: messageBody,
        reportFaultId,
        userTaskId,
        reportReference,
        attachFiles: attachJson,
      };

      const msg = await this.saveMessageToThread(thread, userInfo, messageFields);

      const senderCustomerId = type === userType.CUSTOMER ? +userInfo.userId : 0;
      if (reportFaultOwnerId && senderCustomerId && senderCustomerId !== reportFaultOwnerId) {
        const senderThread = await this.getOrCreateCustomerThread(senderCustomerId);
        await this.saveMessageToThread(senderThread, userInfo, messageFields);
      }

      const ccAnchorId = reportFaultOwnerId ?? (thread.customerId ? +thread.customerId : 0);
      if (ccAnchorId) {
        const ccExclude =
          reportFaultOwnerId && senderCustomerId
            ? [senderCustomerId]
            : [];
        await this.deliverCcToCompanyPeers(
          userInfo,
          ccAnchorId,
          body.ccCustomerIds,
          messageFields,
          ccExclude,
        );
      }

      return {
        ...errorCode.SUCCESS,
        data: { id: msg.id, threadId: thread.id },
      };
    } catch (error) {
      this.logger.error(error);
      return { ...errorCode.EXCEPTION, message: (error as Error).message };
    }
  }

  async markRead(
    userInfo: IUserInfo,
    threadId?: number,
    customerId?: number,
    staffId?: number,
  ) {
    try {
      const type = +userInfo.type;
      const crossRole = this.blockCustomerStaffCrossMessaging(userInfo, {
        customerId,
        staffId,
      });
      if (crossRole) return crossRole;

      let thread: CustomerAdminThread | null = null;

      if (type === userType.CUSTOMER) {
        thread = await this.getOrCreateCustomerThread(+userInfo.userId);
      } else if (type === userType.STAFF) {
        thread = await this.getOrCreateStaffThread(+userInfo.userId);
      } else if (threadId) {
        thread = await this.threadRepo.findOne({ where: { id: threadId } });
      } else if (customerId) {
        thread = await this.threadRepo.findOne({ where: { customerId } });
      } else if (staffId) {
        thread = await this.threadRepo.findOne({ where: { staffId } });
      } else {
        thread = await this.resolveThreadForUser(userInfo, customerId, staffId);
      }

      if (!thread) return errorCode.NOT_FOUND;

      if (type === userType.CUSTOMER) {
        if (+thread.customerId !== +userInfo.userId) return errorCode.NOT_FOUND;
        thread.customerLastReadAt = new Date();
      } else if (type === userType.STAFF) {
        if (+thread.staffId !== +userInfo.userId) return errorCode.NOT_FOUND;
        thread.staffLastReadAt = new Date();
      } else if (type === userType.ADMIN) {
        if (customerId && thread.customerId && +thread.customerId !== +customerId) {
          return errorCode.NOT_FOUND;
        }
        if (staffId && thread.staffId && +thread.staffId !== +staffId) {
          return errorCode.NOT_FOUND;
        }
        thread.adminLastReadAt = new Date();
      } else {
        return errorCode.CAN_NOT_DELETE;
      }

      await this.threadRepo.save(thread);
      return errorCode.SUCCESS;
    } catch (error) {
      this.logger.error(error);
      return { ...errorCode.EXCEPTION, message: (error as Error).message };
    }
  }

  async unreadCount(userInfo: IUserInfo) {
    try {
      const type = +userInfo.type;
      const viewerId = +userInfo.userId;

      if (type === userType.CUSTOMER) {
        const thread = await this.threadRepo.findOne({
          where: { customerId: +userInfo.userId },
        });
        if (!thread) return { ...errorCode.SUCCESS, data: 0 };
        const unreadQb = this.messageRepo
          .createQueryBuilder('m')
          .where('m.thread_id = :tid', { tid: thread.id })
          // Customer dashboard badge should include unread from admins AND colleagues.
          // The UI shows separate conversations via filterSenderId, but unread total is overall.
          .andWhere('m.sender_id != :viewerId', { viewerId })
          .andWhere(this.notDeletedForUserSql(), { viewerId });
        if (thread.customerLastReadAt) {
          unreadQb.andWhere('m.created_at > :readAt', {
            readAt: thread.customerLastReadAt,
          });
        }
        const count = await unreadQb.getCount();
        return { ...errorCode.SUCCESS, data: count };
      }

      if (type === userType.STAFF) {
        const thread = await this.threadRepo.findOne({
          where: { staffId: +userInfo.userId },
        });
        if (!thread) return { ...errorCode.SUCCESS, data: 0 };
        const unreadQb = this.messageRepo
          .createQueryBuilder('m')
          .where('m.thread_id = :tid', { tid: thread.id })
          .andWhere('m.sender_type = :st', { st: userType.ADMIN })
          .andWhere(this.notDeletedForUserSql(), { viewerId });
        if (thread.staffLastReadAt) {
          unreadQb.andWhere('m.created_at > :readAt', { readAt: thread.staffLastReadAt });
        }
        const count = await unreadQb.getCount();
        return { ...errorCode.SUCCESS, data: count };
      }

      if (type === userType.ADMIN) {
        const count = await this.messageRepo
          .createQueryBuilder('m')
          .innerJoin(CustomerAdminThread, 't', 't.id = m.thread_id')
          .where(
            `(
              (t.customer_id IS NOT NULL AND m.sender_type = :customerType)
              OR (t.staff_id IS NOT NULL AND m.sender_type = :staffType)
            )`,
            { customerType: userType.CUSTOMER, staffType: userType.STAFF },
          )
          .andWhere(
            '(t.admin_last_read_at IS NULL OR m.created_at > t.admin_last_read_at)',
          )
          .andWhere(this.notDeletedForUserSql(), { viewerId })
          .getCount();
        return { ...errorCode.SUCCESS, data: count };
      }

      return { ...errorCode.SUCCESS, data: 0 };
    } catch (error) {
      this.logger.error(error);
      return { ...errorCode.EXCEPTION, message: (error as Error).message };
    }
  }

  async softDeleteMessage(userInfo: IUserInfo, messageId: number) {
    try {
      const found = await this.getMessageInAccessibleThread(userInfo, messageId);
      if (!found) return errorCode.NOT_FOUND;

      const existing = await this.deletionRepo.findOne({
        where: { messageId, userId: +userInfo.userId },
      });
      if (existing) {
        if (existing.purgedAt) {
          existing.purgedAt = null;
          existing.deletedAt = new Date();
          await this.deletionRepo.save(existing);
        }
      } else {
        await this.deletionRepo.save(
          this.deletionRepo.create({
            messageId,
            userId: +userInfo.userId,
          }),
        );
      }
      return { ...errorCode.SUCCESS, data: { id: messageId } };
    } catch (error) {
      this.logger.error(error);
      return { ...errorCode.EXCEPTION, message: (error as Error).message };
    }
  }

  async restoreMessage(userInfo: IUserInfo, messageId: number) {
    try {
      const found = await this.getMessageInAccessibleThread(userInfo, messageId);
      if (!found) return errorCode.NOT_FOUND;

      await this.deletionRepo.delete({
        messageId,
        userId: +userInfo.userId,
      });
      return { ...errorCode.SUCCESS, data: { id: messageId } };
    } catch (error) {
      this.logger.error(error);
      return { ...errorCode.EXCEPTION, message: (error as Error).message };
    }
  }

  async clearDeletedMessages(
    userInfo: IUserInfo,
    threadId?: number,
    customerId?: number,
    staffId?: number,
  ) {
    try {
      const type = +userInfo.type;
      if (type !== userType.ADMIN && type !== userType.CUSTOMER && type !== userType.STAFF) {
        return { ...errorCode.CAN_NOT_DELETE, message: 'Not allowed' };
      }

      const crossRole = this.blockCustomerStaffCrossMessaging(userInfo, {
        customerId,
        staffId,
      });
      if (crossRole) return crossRole;

      let thread: CustomerAdminThread | null = null;
      if (type === userType.CUSTOMER) {
        thread = await this.getOrCreateCustomerThread(+userInfo.userId);
      } else if (type === userType.STAFF) {
        thread = await this.getOrCreateStaffThread(+userInfo.userId);
      } else if (threadId) {
        thread = await this.threadRepo.findOne({ where: { id: threadId } });
      } else {
        thread = await this.resolveThreadForUser(userInfo, customerId, staffId);
      }
      if (!thread || !this.canAccessThread(userInfo, thread)) {
        return errorCode.NOT_FOUND;
      }

      const result = await this.deletionRepo
        .createQueryBuilder()
        .update(CustomerAdminMessageDeletion)
        .set({ purgedAt: new Date() })
        .where('user_id = :userId', { userId: +userInfo.userId })
        .andWhere('purged_at IS NULL')
        .andWhere(
          `message_id IN (SELECT id FROM customer_admin_messages WHERE thread_id = :threadId)`,
          { threadId: thread.id },
        )
        .execute();

      return {
        ...errorCode.SUCCESS,
        data: { cleared: result.affected ?? 0, threadId: thread.id },
      };
    } catch (error) {
      this.logger.error(error);
      return { ...errorCode.EXCEPTION, message: (error as Error).message };
    }
  }
}
