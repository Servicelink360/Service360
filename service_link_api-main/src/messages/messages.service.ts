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
import { CustomerNotificationsService } from '../users/customer-notifications.service';
import { Customer } from '../users/entities/customer.entity';
import { errorCode } from '../constants/errorCode';
import { ReportFault } from '../report-faults/entities/report-fault.entity';
import { UserTask } from '../user-tasks/entities/user-task.entity';
import { ConsumableDelivery } from '../consumables/entities/consumable-delivery.entity';
import { User } from '../users/entities/user.entity';
import { reportFaultStatus } from '../constants/status';
import { SendMail, isMailConfigured } from '../helpers/sendEmail';

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
    @InjectRepository(ConsumableDelivery)
    private readonly consumableDeliveryRepo: Repository<ConsumableDelivery>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly customerNotifications: CustomerNotificationsService,
  ) {}

  private async displayNameForUser(userId: number): Promise<string> {
    const u = await this.userRepo.findOne({ where: { id: userId } });
    if (!u) return `User #${userId}`;
    return (
      u.fullName?.trim() ||
      [u.firstName, u.lastName].filter(Boolean).join(' ').trim() ||
      u.username ||
      `User #${userId}`
    );
  }

  /** Company Cc should list people (e.g. Patricia Habib), not role mailboxes (facilities). */
  private isPersonColleagueName(fullName: string): boolean {
    const n = String(fullName || '').trim();
    if (!n || !/\s/.test(n)) return false;
    if (
      /^(facilities|info|admin|enquiry|enquiries|reception|office|support|helpdesk|noreply|no-reply)(\s|$)/i.test(
        n,
      )
    ) {
      return false;
    }
    return true;
  }

  /** Org name for service-provider threads — from email brand settings when set. */
  private async resolveServiceProviderOrgName(): Promise<string | null> {
    try {
      const rows: Array<{ brand_name?: string | null }> = await this.threadRepo.query(
        `SELECT NULLIF(TRIM(brand_name), '') AS brand_name
         FROM consumable_email_settings
         ORDER BY id ASC
         LIMIT 1`,
      );
      const brand = rows?.[0]?.brand_name?.trim();
      return brand || null;
    } catch {
      return null;
    }
  }

  /**
   * Resolve a customer To: peer for a consumables delivery.
   * Prefer linked customer, then emailed-to address, then a company contact —
   * never hardcode ServiceLink.
   */
  private async resolveDeliveryCustomerPeer(delivery: ConsumableDelivery): Promise<{
    peerType: 'customer';
    peerId: number;
    displayName: string;
    customerId: number;
  } | null> {
    if (delivery.customerId != null && +delivery.customerId > 0) {
      const id = +delivery.customerId;
      return {
        peerType: 'customer',
        peerId: id,
        displayName:
          delivery.customerName?.trim() || (await this.displayNameForUser(id)),
        customerId: id,
      };
    }

    const toEmails = String(delivery.emailedTo || '')
      .split(/[,;]/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    for (const email of toEmails) {
      const rows: Array<{ id: number }> = await this.threadRepo.query(
        `SELECT u.id
         FROM users u
         INNER JOIN customers c ON c.user_id = u.id
         WHERE LOWER(TRIM(u.email)) = $1
           AND u.status != $2
         LIMIT 1`,
        [email, userStatus.DELETE],
      );
      if (rows?.[0]?.id) {
        const id = +rows[0].id;
        return {
          peerType: 'customer',
          peerId: id,
          displayName: await this.displayNameForUser(id),
          customerId: id,
        };
      }
    }

    if (delivery.companyId != null && +delivery.companyId > 0) {
      const rows: Array<{ id: number; fullName: string }> = await this.threadRepo.query(
        `SELECT c.user_id AS id,
          COALESCE(
            NULLIF(TRIM(u.full_name), ''),
            NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''),
            u.username
          ) AS "fullName"
         FROM customers c
         INNER JOIN users u ON u.id = c.user_id
         WHERE c.company_id = $1
           AND u.status != $2
         ORDER BY "fullName"`,
        [+delivery.companyId, userStatus.DELETE],
      );
      const people = rows.filter((r) => this.isPersonColleagueName(r.fullName || ''));
      const pick = people[0] || rows[0];
      if (pick?.id) {
        const id = +pick.id;
        return {
          peerType: 'customer',
          peerId: id,
          displayName: pick.fullName?.trim() || (await this.displayNameForUser(id)),
          customerId: id,
        };
      }
    }

    return null;
  }

  /** Admin: open the company (or staff) conversation for a linked report/task/delivery. */
  private async resolveReportConversationPeer(
    userTaskId?: number,
    reportFaultId?: number,
    consumableDeliveryId?: number,
  ): Promise<{
    peerType: 'customer' | 'staff';
    peerId: number;
    displayName: string;
    customerId: number;
  } | null> {
    if (userTaskId) {
      const task = await this.userTaskRepo.findOne({ where: { id: userTaskId } });
      if (!task) return null;
      if (task.type !== 'CUSTOM' && task.type !== 'DYNAMIC') return null;
      const customerId = +task.customerId || 0;
      // Prefer the company contact person — do not hardcode To: staff.
      if (customerId > 0) {
        return {
          peerType: 'customer',
          peerId: customerId,
          displayName: await this.displayNameForUser(customerId),
          customerId,
        };
      }
      if (+task.staffId > 0) {
        return {
          peerType: 'staff',
          peerId: +task.staffId,
          displayName: await this.displayNameForUser(+task.staffId),
          customerId: 0,
        };
      }
      return null;
    }
    if (reportFaultId) {
      const fault = await this.reportFaultRepo.findOne({ where: { id: reportFaultId } });
      if (!fault || +fault.status === reportFaultStatus.DELETED) return null;
      const creator = fault.createdBy
        ? await this.userRepo.findOne({ where: { id: +fault.createdBy } })
        : null;
      if (creator && +creator.type === userType.STAFF) {
        return {
          peerType: 'staff',
          peerId: +creator.id,
          displayName: await this.displayNameForUser(+creator.id),
          customerId: +fault.customerId,
        };
      }
      return {
        peerType: 'customer',
        peerId: +fault.customerId,
        displayName:
          fault.customerName?.trim() ||
          (await this.displayNameForUser(+fault.customerId)),
        customerId: +fault.customerId,
      };
    }
    if (consumableDeliveryId) {
      const delivery = await this.consumableDeliveryRepo.findOne({
        where: { id: consumableDeliveryId },
      });
      if (!delivery || delivery.deletedAt) return null;
      return this.resolveDeliveryCustomerPeer(delivery);
    }
    return null;
  }

  async resolveReportConversation(
    userInfo: IUserInfo,
    userTaskId?: number,
    reportFaultId?: number,
    consumableDeliveryId?: number,
  ) {
    try {
      if (+userInfo.type !== userType.ADMIN) {
        return { ...errorCode.CAN_NOT_DELETE, message: 'Admin only' };
      }
      if (!userTaskId && !reportFaultId && !consumableDeliveryId) {
        return {
          ...errorCode.VALIDATION_ERROR,
          message: 'userTaskId, reportFaultId, or consumableDeliveryId required',
        };
      }
      const peer = await this.resolveReportConversationPeer(
        userTaskId,
        reportFaultId,
        consumableDeliveryId,
      );
      if (!peer) {
        return { ...errorCode.NOT_FOUND, message: 'Report not found' };
      }
      const thread =
        peer.peerType === 'staff'
          ? await this.getOrCreateStaffThread(peer.peerId)
          : await this.getOrCreateCustomerThread(peer.peerId);
      return {
        ...errorCode.SUCCESS,
        data: { ...peer, threadId: thread.id },
      };
    } catch (error) {
      this.logger.error(error);
      return { ...errorCode.EXCEPTION, message: (error as Error).message };
    }
  }

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

  private scheduledTaskLink(): string {
    return `/my-tasks`;
  }

  private userTaskLink(task: UserTask): string {
    return task.type === 'CUSTOM' ? this.newReportLink(task.id) : this.scheduledTaskLink();
  }

  private consumableDeliveryLink(deliveryId: number): string {
    return `/consumables?deliveryId=${deliveryId}`;
  }

  private resolveMessageReportLink(
    reportFaultId?: number | null,
    userTaskId?: number | null,
    reportReference?: string | null,
    body?: string | null,
    consumableDeliveryId?: number | null,
  ): string | null {
    if (reportFaultId) return this.reportFaultLink(+reportFaultId);
    if (userTaskId) return this.newReportLink(+userTaskId);
    if (consumableDeliveryId) return this.consumableDeliveryLink(+consumableDeliveryId);
    const text = `${reportReference || ''}\n${body || ''}`;
    const faultPath = text.match(/\/report-faults\?faultId=(\d+)/i);
    if (faultPath?.[1]) return this.reportFaultLink(+faultPath[1]);
    const newReportPath = text.match(/\/new-reports\?reportId=(\d+)/i);
    if (newReportPath?.[1]) return this.newReportLink(+newReportPath[1]);
    const consumablePath = text.match(/\/consumables\?deliveryId=(\d+)/i);
    if (consumablePath?.[1]) return this.consumableDeliveryLink(+consumablePath[1]);
    const newReportRef = text.match(/New report #(\d+)/i);
    if (newReportRef?.[1]) return this.newReportLink(+newReportRef[1]);
    const faultRef = text.match(/Fault report #(\d+)/i);
    if (faultRef?.[1]) return this.reportFaultLink(+faultRef[1]);
    const consumableRef = text.match(/Consumables delivery #(\d+)/i);
    if (consumableRef?.[1]) return this.consumableDeliveryLink(+consumableRef[1]);
    return null;
  }

  private async customerCanAccessDelivery(
    userId: number,
    delivery: ConsumableDelivery,
  ): Promise<boolean> {
    if (delivery.deletedAt) return false;
    if (delivery.customerId != null && +delivery.customerId === +userId) return true;
    const rows: Array<{ companyId: number | null }> = await this.messageRepo.manager.query(
      `SELECT company_id AS "companyId" FROM public.customers WHERE user_id = $1 LIMIT 1`,
      [+userId],
    );
    const companyId =
      rows?.[0]?.companyId != null && Number(rows[0].companyId) > 0
        ? +rows[0].companyId
        : null;
    if (!companyId) return false;
    if (delivery.companyId != null && +delivery.companyId === companyId && !delivery.supplierId) {
      return true;
    }
    if (delivery.customerId != null) {
      const peer: Array<{ ok: number }> = await this.messageRepo.manager.query(
        `SELECT 1 AS ok FROM public.customers WHERE user_id = $1 AND company_id = $2 LIMIT 1`,
        [+delivery.customerId, companyId],
      );
      return !!peer?.length;
    }
    return false;
  }

  private buildConsumableDeliveryReferenceBlock(
    delivery: ConsumableDelivery,
  ): { reference: string; fullBodyPrefix: string } {
    const link = this.consumableDeliveryLink(delivery.id);
    const title = String(delivery.subject || '').trim() || 'Consumables delivery';
    const reference = `Consumables delivery #${delivery.id}: ${title}`;
    const fullBodyPrefix =
      `📋 ${reference}\n` +
      `View delivery: ${link}\n` +
      `Company: ${delivery.companyName || delivery.customerName || '—'} · Site: ${delivery.siteName || '—'}\n` +
      `────────────────────\n\n`;
    return { reference, fullBodyPrefix };
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

  private parseCcCustomerIds(raw?: string | null): number[] {
    if (!raw?.trim()) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return [...new Set(parsed.map((id) => +id).filter((id) => id > 0))];
    } catch {
      return [];
    }
  }

  private escapeHtml(value: string): string {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private parseCcEmails(raw?: string | null | string[]): string[] {
    const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
    if (Array.isArray(raw)) {
      return [
        ...new Set(
          raw
            .map((e) => String(e || '').trim().toLowerCase())
            .filter((e) => emailOk(e)),
        ),
      ];
    }
    if (!raw?.trim()) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return [
        ...new Set(
          parsed
            .map((e) => String(e || '').trim().toLowerCase())
            .filter((e) => emailOk(e)),
        ),
      ];
    } catch {
      return String(raw)
        .split(/[;,]+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => emailOk(e));
    }
  }

  /** Customers may only email their own company personnel contacts. */
  private async filterCustomerOwnPersonnelEmails(
    customerUserId: number,
    emails: string[],
  ): Promise<string[]> {
    const wanted = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
    if (!wanted.length) return [];
    const rows: Array<{ email: string }> = await this.threadRepo.query(
      `
      SELECT DISTINCT LOWER(TRIM(p.email)) AS email
      FROM customers c
      INNER JOIN customer_personnel p ON p.company_id = c.company_id
      WHERE c.user_id = $1
        AND c.company_id IS NOT NULL
        AND p.is_active = true
        AND LOWER(TRIM(p.email)) = ANY($2::text[])
      `,
      [+customerUserId, wanted],
    );
    const allowed = new Set((rows || []).map((r) => String(r.email || '').toLowerCase()));
    return wanted.filter((e) => allowed.has(e));
  }

  private async loadCcDisplayInfo(customerIds: number[]): Promise<Map<number, string>> {
    const ids = [...new Set(customerIds.map((id) => +id).filter((id) => id > 0))];
    if (!ids.length) return new Map();
    const rows: {
      id: number;
      name: string;
      company_name: string | null;
      user_type: number | null;
    }[] = await this.threadRepo.query(
      `SELECT u.id,
          COALESCE(
            NULLIF(TRIM(u.full_name), ''),
            NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''),
            u.username
          ) AS name,
          COALESCE(
            NULLIF(TRIM(org.name), ''),
            NULLIF(TRIM(c.company_name), '')
          ) AS company_name,
          u.type AS user_type
         FROM users u
         LEFT JOIN customers c ON c.user_id = u.id
         LEFT JOIN customer_companies org ON org.id = c.company_id
         WHERE u.id = ANY($1::int[])`,
      [ids],
    );
    const serviceProviderOrgName = await this.resolveServiceProviderOrgName();
    const adminLabel = serviceProviderOrgName?.trim() || 'ServiceLink';
    return new Map(
      rows.map((r) => {
        if (+r.user_type === userType.ADMIN) {
          return [+r.id, adminLabel];
        }
        const org = r.company_name?.trim();
        const label = org ? `${r.name} — ${org}` : r.name;
        return [+r.id, label];
      }),
    );
  }

  /** Active admin user ids from a requested Cc list (for customer → ServiceLink Cc). */
  private async filterActiveAdminIds(ids: number[]): Promise<number[]> {
    const requested = [...new Set((ids || []).map((id) => +id).filter((id) => id > 0))];
    if (!requested.length) return [];
    const admins = await this.listActiveAdminUsers();
    const allow = new Set(admins.map((a) => +a.id));
    return requested.filter((id) => allow.has(+id));
  }

  /** Active staff user ids from a requested Cc list (admin → staff Cc). */
  private async filterActiveStaffIds(ids: number[]): Promise<number[]> {
    const requested = [...new Set((ids || []).map((id) => +id).filter((id) => id > 0))];
    if (!requested.length) return [];
    const rows: Array<{ id: number }> = await this.threadRepo.query(
      `SELECT u.id FROM users u WHERE u.type = $1 AND u.status != $2 AND u.id = ANY($3::int[])`,
      [userType.STAFF, userStatus.DELETE, requested],
    );
    const allow = new Set(rows.map((r) => +r.id));
    return requested.filter((id) => allow.has(+id));
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
    ccInfo: Map<number, string>,
  ) {
    const sender = senderInfo.get(+m.senderId);
    const ccIds = this.parseCcCustomerIds(m.ccCustomerIds);
    const ccEmails = this.parseCcEmails(m.ccEmails);
    const ccRecipients = [
      ...ccIds
        .map((id) => ccInfo.get(id))
        .filter((name): name is string => Boolean(name?.trim())),
      ...ccEmails,
    ];
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
      consumableDeliveryId: m.consumableDeliveryId,
      reportReference: m.reportReference,
      reportLink: this.resolveMessageReportLink(
        m.reportFaultId,
        m.userTaskId,
        m.reportReference,
        m.body,
        m.consumableDeliveryId,
      ),
      attachFiles: this.parseAttachFiles(m.attachFiles),
      ccCustomerIds: ccIds,
      ccEmails,
      ccRecipients,
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

  /** Latest message visible to viewer (respects per-user soft delete + conversation filter). */
  private async getLastVisibleMessagePreview(
    threadId: number,
    viewerId: number,
    opts?: {
      filterSenderId?: number;
      filterSenderType?: number;
      peerSenderType?: number;
    },
  ): Promise<{ preview: string; updatedAt: Date | null }> {
    const qb = this.messageRepo
      .createQueryBuilder('m')
      .where('m.thread_id = :threadId', { threadId })
      .andWhere(this.notDeletedForUserSql(), { viewerId })
      .orderBy('m.created_at', 'DESC')
      .take(1);
    if (opts?.peerSenderType != null) {
      qb.andWhere('m.sender_type = :peerSt', { peerSt: opts.peerSenderType });
    }
    this.applyConversationFilter(
      qb,
      viewerId,
      opts?.filterSenderId,
      opts?.filterSenderType,
    );
    const last = await qb.getOne();
    if (!last) return { preview: '', updatedAt: null };
    return { preview: this.preview(last.body), updatedAt: last.createdAt };
  }

  private async conversationHasVisibleMessages(
    threadId: number,
    viewerId: number,
    filterSenderId?: number,
    filterSenderType?: number,
  ): Promise<boolean> {
    const qb = this.messageRepo
      .createQueryBuilder('m')
      .where('m.thread_id = :threadId', { threadId })
      .andWhere(this.notDeletedForUserSql(), { viewerId });
    this.applyConversationFilter(qb, viewerId, filterSenderId, filterSenderType);
    const count = await qb.getCount();
    return count > 0;
  }

  /** Sent vs received visible counts for Inbox/Sent conversation folders. */
  private async conversationFolderCounts(
    threadId: number,
    viewerId: number,
    filterSenderId?: number,
    filterSenderType?: number,
  ): Promise<{ sentCount: number; receivedCount: number; deletedCount: number }> {
    const activeBase = () => {
      const qb = this.messageRepo
        .createQueryBuilder('m')
        .where('m.thread_id = :threadId', { threadId })
        .andWhere(this.notDeletedForUserSql(), { viewerId });
      this.applyConversationFilter(qb, viewerId, filterSenderId, filterSenderType);
      return qb;
    };
    const deletedQb = this.messageRepo
      .createQueryBuilder('m')
      .where('m.thread_id = :threadId', { threadId })
      .andWhere(this.deletedForUserSql(), { viewerId });
    this.applyConversationFilter(deletedQb, viewerId, filterSenderId, filterSenderType);
    const [sentCount, receivedCount, deletedCount] = await Promise.all([
      activeBase().andWhere('m.sender_id = :viewerId', { viewerId }).getCount(),
      activeBase().andWhere('m.sender_id != :viewerId', { viewerId }).getCount(),
      deletedQb.getCount(),
    ]);
    return { sentCount, receivedCount, deletedCount };
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
    return rows
      .map((r: any) => ({
        id: +r.id,
        fullName: r.fullName || `User #${r.id}`,
        companyName: r.companyName?.trim() || null,
      }))
      .filter((r) => this.isPersonColleagueName(r.fullName));
  }

  async listCompanyCcRecipients(
    userInfo: IUserInfo,
    customerId?: number,
    forStaffThread = false,
  ) {
    try {
      const type = await this.resolveUserType(+userInfo.userId, +userInfo.type);
      if (type === userType.STAFF) {
        return { ...errorCode.SUCCESS, data: { rows: [], companyName: null } };
      }
      let anchorId = customerId ? +customerId : 0;
      if (type === userType.CUSTOMER) {
        anchorId = +userInfo.userId;
      } else if (type === userType.ADMIN && !anchorId) {
        // Avoid 400 loops if client calls without customerId.
        return { ...errorCode.SUCCESS, data: { rows: [], companyName: null } };
      } else if (type !== userType.ADMIN || !anchorId) {
        return { ...errorCode.SUCCESS, data: { rows: [], companyName: null } };
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
          return { ...errorCode.SUCCESS, data: { rows: [], companyName: null } };
        }
      }
      // Admin → customer: omit the primary recipient from Cc list.
      // Customer → colleagues: omit self from Cc list.
      const excludeFromList =
        forStaffThread ? 0 : type === userType.CUSTOMER ? anchorId : anchorId;
      const rows = await this.sameCompanyPeerRows(anchorId, excludeFromList);
      const companyName =
        rows.map((r) => r.companyName?.trim()).find(Boolean) ||
        (await this.resolveCustomerOrgName(anchorId));
      return { ...errorCode.SUCCESS, data: { rows, companyName } };
    } catch (error) {
      this.logger.error(error);
      return { ...errorCode.EXCEPTION, message: (error as Error).message };
    }
  }

  /** Organisation display name for a customer user (company table or free-text). */
  private async resolveCustomerOrgName(customerUserId: number): Promise<string | null> {
    const rows: Array<{ companyName?: string | null }> = await this.threadRepo.query(
      `
      SELECT COALESCE(
        NULLIF(TRIM(org.name), ''),
        NULLIF(TRIM(c.company_name), '')
      ) AS "companyName"
      FROM customers c
      LEFT JOIN customer_companies org ON org.id = c.company_id
      WHERE c.user_id = $1
      LIMIT 1
      `,
      [+customerUserId],
    );
    return rows?.[0]?.companyName?.trim() || null;
  }

  private async resolveCcCustomerIds(
    primaryCustomerId: number,
    requested?: number[],
    excludeCustomerIds: number[] = [],
  ): Promise<number[]> {
    const exclude = new Set(
      [primaryCustomerId, ...excludeCustomerIds].map((id) => +id).filter((id) => id > 0),
    );
    let ids = [...new Set((requested || []).map((id) => +id).filter((id) => id > 0))];
    ids = ids.filter((id) => !exclude.has(id));
    if (!ids.length) {
      const peers = await this.sameCompanyPeerRows(primaryCustomerId, primaryCustomerId);
      return peers.map((p) => p.id).filter((id) => !exclude.has(id));
    }
    const valid: number[] = [];
    for (const id of ids) {
      if (await customerCanAccessCustomerId(this.customerRepo(), primaryCustomerId, id)) {
        valid.push(id);
      }
    }
    return valid.filter((id) => !exclude.has(id));
  }

  private async saveMessageToThread(
    thread: CustomerAdminThread,
    userInfo: IUserInfo,
    fields: {
      body: string;
      reportFaultId?: number;
      userTaskId?: number;
      consumableDeliveryId?: number;
      reportReference?: string;
      attachFiles: string | null;
      ccCustomerIds?: string | null;
      ccEmails?: string | null;
    },
  ): Promise<CustomerAdminMessage> {
    const msg = this.messageRepo.create({
      threadId: thread.id,
      senderId: +userInfo.userId,
      senderType: +userInfo.type,
      body: fields.body,
      reportFaultId: fields.reportFaultId,
      userTaskId: fields.userTaskId,
      consumableDeliveryId: fields.consumableDeliveryId,
      reportReference: fields.reportReference,
      attachFiles: fields.attachFiles,
      ccCustomerIds: fields.ccCustomerIds ?? null,
      ccEmails: fields.ccEmails ?? null,
    });
    await this.messageRepo.save(msg);
    thread.lastMessagePreview = this.preview(fields.body);
    thread.updatedAt = new Date();
    await this.threadRepo.save(thread);
    return msg;
  }

  private async deliverCcToCompanyPeers(
    userInfo: IUserInfo,
    resolvedCcIds: number[],
    fields: {
      body: string;
      reportFaultId?: number;
      userTaskId?: number;
      consumableDeliveryId?: number;
      reportReference?: string;
      attachFiles: string | null;
      ccCustomerIds?: string | null;
      ccEmails?: string | null;
    },
    alsoExcludeCustomerIds: number[] = [],
  ): Promise<void> {
    const exclude = new Set(
      alsoExcludeCustomerIds.map((id) => +id).filter((id) => id > 0),
    );
    const ccIds = resolvedCcIds.filter((id) => !exclude.has(id));
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

  private async threadAlreadyReferencesReport(
    threadId: number,
    reportFaultId?: number,
    userTaskId?: number,
    consumableDeliveryId?: number,
  ): Promise<boolean> {
    if (reportFaultId) {
      const n = await this.messageRepo.count({
        where: { threadId, reportFaultId },
      });
      return n > 0;
    }
    if (userTaskId) {
      const n = await this.messageRepo.count({
        where: { threadId, userTaskId },
      });
      return n > 0;
    }
    if (consumableDeliveryId) {
      const n = await this.messageRepo.count({
        where: { threadId, consumableDeliveryId },
      });
      return n > 0;
    }
    return false;
  }

  private buildNewReportReferenceBlock(task: UserTask): { reference: string; fullBodyPrefix: string } {
    const link = this.userTaskLink(task);
    const isCustom = task.type === 'CUSTOM';
    const title =
      task.taskName?.trim() ||
      task.description?.trim() ||
      (isCustom ? 'New report' : 'Scheduled task');
    const reference = isCustom
      ? `New report #${task.id}: ${title}`
      : `Scheduled task #${task.id}: ${title}`;
    const fullBodyPrefix =
      `📋 ${reference}\n` +
      `${isCustom ? 'View report' : 'Open task'}: ${link}\n` +
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
      const serviceProviderOrgName = await this.resolveServiceProviderOrgName();

      for (const admin of admins) {
        const last = await this.getLastVisibleMessagePreview(
          supportThread.id,
          viewerId,
          { filterSenderId: admin.id, filterSenderType: userType.ADMIN },
        );

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

        const folderCounts = await this.conversationFolderCounts(
          supportThread.id,
          viewerId,
          admin.id,
          userType.ADMIN,
        );
        if (
          !folderCounts.sentCount &&
          !folderCounts.receivedCount &&
          !folderCounts.deletedCount
        ) {
          continue;
        }

        rows.push({
          threadId: supportThread.id,
          peerType: 'admin',
          peerId: admin.id,
          customerId: isStaff ? null : viewerId,
          staffId: isStaff ? viewerId : null,
          customerName: admin.fullName,
          companyName: serviceProviderOrgName,
          roleLabel: 'Service provider',
          lastMessagePreview: last.preview,
          updatedAt: last.updatedAt,
          unreadCount,
          sentCount: folderCounts.sentCount,
          receivedCount: folderCounts.receivedCount,
          deletedCount: folderCounts.deletedCount,
          conversationKind: 'admin',
          filterSenderId: admin.id,
          filterSenderType: userType.ADMIN,
        });
      }

      if (!isStaff) {
        const peers = await this.sameCompanyPeerRows(viewerId, viewerId);
        for (const peer of peers) {
          const last = await this.getLastVisibleMessagePreview(
            supportThread.id,
            viewerId,
            { filterSenderId: peer.id, filterSenderType: userType.CUSTOMER },
          );

          const peerUnreadQb = this.messageRepo
            .createQueryBuilder('m')
            .where('m.thread_id = :threadId', { threadId: supportThread.id })
            .andWhere('m.sender_id = :peerId', { peerId: peer.id })
            .andWhere(this.notDeletedForUserSql(), { viewerId });
          if (lastRead) {
            peerUnreadQb.andWhere('m.created_at > :readAt', { readAt: lastRead });
          }
          const peerUnread = await peerUnreadQb.getCount();

          const folderCounts = await this.conversationFolderCounts(
            supportThread.id,
            viewerId,
            peer.id,
            userType.CUSTOMER,
          );
          if (
            !folderCounts.sentCount &&
            !folderCounts.receivedCount &&
            !folderCounts.deletedCount
          ) {
            continue;
          }

          rows.push({
            threadId: supportThread.id,
            peerType: 'customer',
            peerId: peer.id,
            customerId: viewerId,
            staffId: null,
            customerName: peer.fullName,
            companyName: peer.companyName,
            roleLabel: 'My colleague',
            lastMessagePreview: last.preview,
            updatedAt: last.updatedAt,
            unreadCount: peerUnread,
            sentCount: folderCounts.sentCount,
            receivedCount: folderCounts.receivedCount,
            deletedCount: folderCounts.deletedCount,
            conversationKind: 'colleague',
            filterSenderId: peer.id,
            filterSenderType: userType.CUSTOMER,
          });
        }
      } else {
        const staffPeers = await this.sameCompanyStaffPeerRows(viewerId, 0);
        for (const peer of staffPeers) {
          const peerThread = await this.getOrCreateStaffPeerThread(viewerId, peer.id);
          const last = await this.getLastVisibleMessagePreview(peerThread.id, viewerId);

          const peerUnreadQb = this.messageRepo
            .createQueryBuilder('m')
            .where('m.thread_id = :threadId', { threadId: peerThread.id })
            .andWhere('m.sender_id != :viewerId', { viewerId })
            .andWhere(this.notDeletedForUserSql(), { viewerId });
          const peerUnread = await peerUnreadQb.getCount();

          const folderCounts = await this.conversationFolderCounts(
            peerThread.id,
            viewerId,
          );
          if (
            !folderCounts.sentCount &&
            !folderCounts.receivedCount &&
            !folderCounts.deletedCount
          ) {
            continue;
          }

          rows.push({
            threadId: peerThread.id,
            peerType: 'staff',
            peerId: peer.id,
            customerId: null,
            staffId: viewerId,
            peerStaffId: peer.id,
            customerName: peer.fullName,
            companyName: peer.companyName,
            roleLabel: 'My colleague',
            lastMessagePreview: last.preview,
            updatedAt: last.updatedAt,
            unreadCount: peerUnread,
            sentCount: folderCounts.sentCount,
            receivedCount: folderCounts.receivedCount,
            deletedCount: folderCounts.deletedCount,
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
      const serviceProviderOrgName = await this.resolveServiceProviderOrgName();
      const colleagues =
        type === userType.STAFF
          ? await this.sameCompanyStaffPeerRows(viewerId, viewerId)
          : await this.sameCompanyPeerRows(viewerId, viewerId);
      return {
        ...errorCode.SUCCESS,
        data: {
          admins: admins.map((a) => ({
            id: a.id,
            fullName: a.fullName,
            companyName: serviceProviderOrgName,
          })),
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

      const viewerId = +userInfo.userId;
      const mapped = await Promise.all(
        rawThreads.map(async (row: any) => {
          const threadId = +row.threadId;
          const folderCounts = await this.conversationFolderCounts(threadId, viewerId);
          if (
            !folderCounts.sentCount &&
            !folderCounts.receivedCount &&
            !folderCounts.deletedCount
          ) {
            return null;
          }

          const peerSenderType =
            row.peerType === 'staff' ? userType.STAFF : userType.CUSTOMER;
          let actualUnread = 0;
          const unreadQb = this.messageRepo
            .createQueryBuilder('m')
            .where('m.thread_id = :threadId', { threadId })
            .andWhere('m.sender_type = :st', { st: peerSenderType })
            .andWhere(this.notDeletedForUserSql(), { viewerId });
          if (row.adminLastReadAt) {
            unreadQb.andWhere('m.created_at > :readAt', { readAt: row.adminLastReadAt });
          }
          actualUnread = await unreadQb.getCount();

          const peerId =
            row.peerType === 'staff' ? +row.staffId : +row.customerId;

          const last = await this.getLastVisibleMessagePreview(threadId, viewerId, {
            peerSenderType: peerSenderType,
          });

          return {
            threadId,
            peerType: row.peerType,
            peerId,
            customerId: row.customerId ? +row.customerId : null,
            staffId: row.staffId ? +row.staffId : null,
            customerName: row.peerName || `User #${peerId}`,
            companyName: row.companyName?.trim() || null,
            lastMessagePreview: last.preview,
            updatedAt: last.updatedAt,
            unreadCount: actualUnread,
            sentCount: folderCounts.sentCount,
            receivedCount: folderCounts.receivedCount,
            deletedCount: folderCounts.deletedCount,
          };
        }),
      );
      const rows = mapped.filter((row): row is NonNullable<(typeof mapped)[number]> => row != null);

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
            OR CAST(COALESCE(m.consumable_delivery_id, 0) AS TEXT) ILIKE :kw
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
      const serviceProviderOrgName = await this.resolveServiceProviderOrgName();
      if (serviceProviderOrgName) {
        for (const m of messages) {
          if (+m.senderType === userType.ADMIN) {
            const info = senderInfo.get(+m.senderId);
            if (info && !info.companyName) {
              info.companyName = serviceProviderOrgName;
            }
          }
        }
      }
      const allCcIds = messages.flatMap((m) => this.parseCcCustomerIds(m.ccCustomerIds));
      const ccInfo = await this.loadCcDisplayInfo(allCcIds);

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
          rows: messages.map((m) => this.mapMessageRow(m, userInfo, senderInfo, ccInfo)),
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

      if (
        type === userType.STAFF &&
        (body.reportFaultId || body.consumableDeliveryId)
      ) {
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
      } else if (body.userTaskId || body.reportFaultId || body.consumableDeliveryId) {
        const peer = await this.resolveReportConversationPeer(
          body.userTaskId ? +body.userTaskId : undefined,
          body.reportFaultId ? +body.reportFaultId : undefined,
          body.consumableDeliveryId ? +body.consumableDeliveryId : undefined,
        );
        if (!peer) {
          return {
            ...errorCode.NOT_FOUND,
            message: body.userTaskId
              ? 'Task not found'
              : body.reportFaultId
                ? 'Report fault not found'
                : 'Consumables delivery not found',
          };
        }
        thread =
          peer.peerType === 'staff'
            ? await this.getOrCreateStaffThread(peer.peerId)
            : await this.getOrCreateCustomerThread(peer.peerId);
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
      let consumableDeliveryId: number | undefined;
      let reportCustomerIdForCc = 0;

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
        reportCustomerIdForCc = +fault.customerId;
        const faultLink = this.reportFaultLink(fault.id);
        const faultAlreadyInThread = await this.threadAlreadyReferencesReport(
          thread.id,
          fault.id,
          undefined,
        );
        if (!messageBody.includes(faultLink) && !faultAlreadyInThread) {
          messageBody = ref.fullBodyPrefix + messageBody;
        }
      } else if (body.userTaskId) {
        const task = await this.userTaskRepo.findOne({
          where: { id: body.userTaskId },
        });
        if (!task || (task.type !== 'CUSTOM' && task.type !== 'DYNAMIC')) {
          return { ...errorCode.NOT_FOUND, message: 'Task not found' };
        }
        if (+task.staffId <= 0) {
          return {
            ...errorCode.VALIDATION_ERROR,
            message: 'Only staff-assigned tasks can be referenced',
          };
        }
        if (type === userType.STAFF && +task.staffId !== +userInfo.userId) {
          return { ...errorCode.VALIDATION_ERROR, message: 'Not allowed to reference this task' };
        }
        if (type === userType.CUSTOMER) {
          if (task.type !== 'CUSTOM' || +task.customerId !== +userInfo.userId) {
            return errorCode.NOT_FOUND;
          }
        }
        if (
          type === userType.ADMIN &&
          thread.customerId &&
          +task.customerId > 0 &&
          +task.customerId !== customerId
        ) {
          return errorCode.NOT_FOUND;
        }
        if (
          type === userType.ADMIN &&
          thread.staffId &&
          +task.staffId > 0 &&
          +task.staffId !== +thread.staffId
        ) {
          return {
            ...errorCode.VALIDATION_ERROR,
            message: 'Task staff does not match this conversation',
          };
        }
        const ref = this.buildNewReportReferenceBlock(task);
        reportReference = ref.reference;
        userTaskId = task.id;
        reportCustomerIdForCc = +task.customerId || 0;
        const taskLink = this.userTaskLink(task);
        const taskAlreadyInThread = await this.threadAlreadyReferencesReport(
          thread.id,
          undefined,
          task.id,
        );
        if (!messageBody.includes(taskLink) && !taskAlreadyInThread) {
          messageBody = ref.fullBodyPrefix + messageBody;
        }
        if (type === userType.CUSTOMER && task.type === 'CUSTOM') {
          task.adminOpenedAt = null;
          task.updatedAt = new Date();
          await this.userTaskRepo.save(task);
        }
      } else if (body.consumableDeliveryId) {
        const delivery = await this.consumableDeliveryRepo.findOne({
          where: { id: body.consumableDeliveryId },
        });
        if (!delivery || delivery.deletedAt) {
          return { ...errorCode.NOT_FOUND, message: 'Consumables delivery not found' };
        }
        if (type === userType.CUSTOMER) {
          const canAccess = await this.customerCanAccessDelivery(+userInfo.userId, delivery);
          if (!canAccess) {
            return errorCode.NOT_FOUND;
          }
          thread = await this.getOrCreateCustomerThread(+userInfo.userId);
          reportCustomerIdForCc = +userInfo.userId;
        } else if (type === userType.ADMIN) {
          // Prefer delivery contact / company peer — not ServiceLink.
          const deliveryPeer = await this.resolveDeliveryCustomerPeer(delivery);
          if (deliveryPeer) {
            reportCustomerIdForCc = deliveryPeer.customerId;
            if (!thread.customerId || +thread.customerId !== deliveryPeer.customerId) {
              // Keep explicit To: from the request when already set to a customer.
              if (!(body.customerId != null && +body.customerId > 0)) {
                thread = await this.getOrCreateCustomerThread(deliveryPeer.customerId);
              }
            }
          } else if (thread.customerId) {
            reportCustomerIdForCc = +thread.customerId;
          }
        }
        const ref = this.buildConsumableDeliveryReferenceBlock(delivery);
        reportReference = ref.reference;
        consumableDeliveryId = delivery.id;
        const deliveryLink = this.consumableDeliveryLink(delivery.id);
        const alreadyInThread = await this.threadAlreadyReferencesReport(
          thread.id,
          undefined,
          undefined,
          delivery.id,
        );
        if (!messageBody.includes(deliveryLink) && !alreadyInThread) {
          messageBody = ref.fullBodyPrefix + messageBody;
        }
      }

      const attachJson = attachments.length > 0 ? JSON.stringify(attachments) : null;

      const adminToStaff =
        type === userType.ADMIN && body.staffId != null && +body.staffId > 0;
      // Task/report messages still Cc company colleagues even when To: is staff.
      const ccAnchorId =
        reportFaultOwnerId ||
        reportCustomerIdForCc ||
        (adminToStaff ? 0 : thread.customerId ? +thread.customerId : 0);
      const senderCustomerId = type === userType.CUSTOMER ? +userInfo.userId : 0;
      const ccExclude: number[] = senderCustomerId ? [senderCustomerId] : [];
      const adminDirectCustomer =
        type === userType.ADMIN &&
        body.customerId != null &&
        +body.customerId > 0 &&
        !body.staffId;
      let resolvedCcIds: number[] = [];
      const requestedCcIds = [...new Set((body.ccCustomerIds || []).map((id) => +id).filter((id) => id > 0))];
      const adminCcIds =
        type === userType.CUSTOMER ? await this.filterActiveAdminIds(requestedCcIds) : [];
      const staffCcIds =
        type === userType.ADMIN ? await this.filterActiveStaffIds(requestedCcIds) : [];
      const adminCcSet = new Set(adminCcIds);
      const staffCcSet = new Set(staffCcIds);
      const requestedCustomerCcIds = requestedCcIds.filter(
        (id) => !adminCcSet.has(+id) && !staffCcSet.has(+id),
      );
      const isReportReply = Boolean(reportFaultId || userTaskId || consumableDeliveryId);
      if (ccAnchorId) {
        resolvedCcIds = await this.resolveCcCustomerIds(
          ccAnchorId,
          requestedCustomerCcIds,
          ccExclude,
        );
        const exclude = new Set(
          [...ccExclude].map((id) => +id).filter((id) => id > 0),
        );
        if (adminDirectCustomer) {
          exclude.add(ccAnchorId);
        }
        resolvedCcIds = resolvedCcIds.filter((id) => !exclude.has(id));
        // Report replies always Cc same-company colleagues (except sender / primary recipient).
        if (isReportReply && !resolvedCcIds.length) {
          const peers = await this.sameCompanyPeerRows(ccAnchorId, ccAnchorId);
          resolvedCcIds = peers
            .map((p) => p.id)
            .filter((id) => !exclude.has(id));
        }
      }
      const storedCcIds = [...new Set([...resolvedCcIds, ...adminCcIds, ...staffCcIds])];
      const ccCustomerIdsJson =
        storedCcIds.length > 0 ? JSON.stringify(storedCcIds) : null;
      let externalCcEmails = this.parseCcEmails(body.ccEmails);
      if (type === userType.CUSTOMER && externalCcEmails.length) {
        externalCcEmails = await this.filterCustomerOwnPersonnelEmails(
          +userInfo.userId,
          externalCcEmails,
        );
        if (!externalCcEmails.length && this.parseCcEmails(body.ccEmails).length) {
          return {
            ...errorCode.VALIDATION_ERROR,
            message: 'You can only email your own personnel contacts',
          };
        }
      }
      const ccEmailsJson =
        externalCcEmails.length > 0 ? JSON.stringify(externalCcEmails) : null;

      const messageFields = {
        body: messageBody,
        reportFaultId,
        userTaskId,
        consumableDeliveryId,
        reportReference,
        attachFiles: attachJson,
        ccCustomerIds: ccCustomerIdsJson,
        ccEmails: ccEmailsJson,
      };

      const msg = await this.saveMessageToThread(thread, userInfo, messageFields);

      if (reportFaultOwnerId && senderCustomerId && senderCustomerId !== reportFaultOwnerId) {
        const senderThread = await this.getOrCreateCustomerThread(senderCustomerId);
        await this.saveMessageToThread(senderThread, userInfo, messageFields);
      }

      if (ccAnchorId && resolvedCcIds.length > 0) {
        await this.deliverCcToCompanyPeers(
          userInfo,
          resolvedCcIds,
          messageFields,
          ccExclude,
        );
      }

      if (staffCcIds.length > 0) {
        const primaryStaff =
          adminToStaff && body.staffId != null ? +body.staffId : 0;
        for (const sid of staffCcIds) {
          if (primaryStaff && +sid === primaryStaff) continue;
          const staffThread = await this.getOrCreateStaffThread(+sid);
          await this.saveMessageToThread(staffThread, userInfo, messageFields);
        }
      }

      if (externalCcEmails.length && isMailConfigured()) {
        const senderName =
          (await this.displayNameForUser(+userInfo.userId)) || 'Service360 user';
        const preview = messageBody.replace(/<[^>]+>/g, ' ').trim().slice(0, 2000);
        const subject = reportReference
          ? `Service360 message — ${reportReference}`
          : 'Service360 message';
        const footer =
          type === userType.CUSTOMER
            ? 'This message was sent to you from Service360 by your organisation contact.'
            : 'You were Cc\'d on this Service360 conversation.';
        const html = `<p><strong>${this.escapeHtml(senderName)}</strong> shared a message with you:</p>
<p style="white-space:pre-wrap;">${this.escapeHtml(preview)}</p>
<p style="color:#6b7280;font-size:12px;">${this.escapeHtml(footer)}</p>`;
        for (const email of externalCcEmails) {
          void SendMail(email, subject, html).catch((err) =>
            this.logger.warn(`Cc email failed for ${email}: ${(err as Error)?.message || err}`),
          );
        }
      }

      if (
        (type === userType.ADMIN || type === userType.STAFF) &&
        thread.customerId
      ) {
        let linkPath = '/messages';
        if (reportFaultId) {
          linkPath = `/messages?reportFaultId=${reportFaultId}`;
        } else if (userTaskId) {
          linkPath = `/messages?userTaskId=${userTaskId}`;
        } else if (consumableDeliveryId) {
          linkPath = `/messages?consumableDeliveryId=${consumableDeliveryId}`;
        }
        const recipientIds = new Set<number>();
        recipientIds.add(+thread.customerId);
        for (const cid of resolvedCcIds) {
          if (+cid > 0) recipientIds.add(+cid);
        }
        void this.customerNotifications.notifyNewMessage({
          recipientCustomerIds: [...recipientIds],
          preview: messageBody.replace(/<[^>]+>/g, ' ').trim(),
          linkPath,
          createdByUserId: +userInfo.userId,
        });
      }

      if (type === userType.CUSTOMER || type === userType.STAFF) {
        let linkPath = '/messages';
        if (reportFaultId) {
          linkPath = `/messages?reportFaultId=${reportFaultId}`;
        } else if (userTaskId) {
          linkPath = `/messages?reportId=${userTaskId}`;
        }
        void this.customerNotifications.notifyAdminsNewMessage({
          preview: messageBody.replace(/<[^>]+>/g, ' ').trim(),
          linkPath,
          createdByUserId: +userInfo.userId,
        });
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

  async markUnread(
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
        thread.customerLastReadAt = null;
      } else if (type === userType.STAFF) {
        if (+thread.staffId !== +userInfo.userId) return errorCode.NOT_FOUND;
        thread.staffLastReadAt = null;
      } else if (type === userType.ADMIN) {
        if (customerId && thread.customerId && +thread.customerId !== +customerId) {
          return errorCode.NOT_FOUND;
        }
        if (staffId && thread.staffId && +thread.staffId !== +staffId) {
          return errorCode.NOT_FOUND;
        }
        thread.adminLastReadAt = null;
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
