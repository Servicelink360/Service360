


import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import { IUserInfo } from '../interfaces/IUserInfo';
import { IErrorData } from '../interfaces/IErrorData';
import { reportFaultStatus } from '../constants/status';
import { errorCode } from '../constants/errorCode';
import { ReportFault } from './entities/report-fault.entity';
import { ReportFaultAnswer } from './entities/report-fault-answer.entity';
import { CreateReportFaultDto } from './dto/create-report-fault.dto';
import { GetReportFaultsDto } from './entities/get-report-faults.dto';
import { UpdateReportFaultDto } from './dto/update-report-fault.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { CreateReportFaultAnswerDto } from './dto/create-report-fault-answer.dto';
import { UpdateReportFaultAnswerDto } from './dto/update-report-fault-answer.dto';
import { reportFaultSender, userType } from '../constants/user';
import * as moment from 'moment';
import {
  applyCustomerScopeToQuery,
  customerCanAccessCustomerId,
  customerScopeParams,
  customerScopeSql,
} from '../helpers/customer-scope';
import { Customer } from '../users/entities/customer.entity';
import { CustomerNotificationsService } from '../users/customer-notifications.service';
import { FaultIssuesService } from '../fault-issues/fault-issues.service';
import { isPublicAmenitiesCleaningService } from './report-fault-toilet-area.constants';
import { SetFaultDelegationDto } from './dto/set-fault-delegation.dto';
import { CustomerPersonnelService } from '../customer-personnel/customer-personnel.service';
import { AdminPersonnelService } from '../admin-personnel/admin-personnel.service';
import { UsersService } from '../users/users.service';
import { PersonnelFaultAccessService } from './personnel-fault-access.service';
import { computeDelegationOutcome } from './delegation-outcome.util';
import {
  emailLinkHtml,
  emailMyTasksUrl,
  emailSupportFooterHtml,
} from '../helpers/emailContent';
import { isMailConfigured, SendMail } from '../helpers/sendEmail';

@Injectable()
export class ReportFaultsService {
  private customerRepo() {
    return this.reportFaultsRepository.manager.getRepository(Customer);
  }

  private async customerCanAccessFault(
    userInfo: IUserInfo,
    recordCustomerId: number,
  ): Promise<boolean> {
    return customerCanAccessCustomerId(
      this.customerRepo(),
      +userInfo.userId,
      +recordCustomerId,
    );
  }

  /** PG lowercases unquoted identifiers; TypeORM uses camelCase aliases — must quote. */
  private quotedSqlRef(tableAlias: string, column: string): string {
    return `"${tableAlias}"."${column}"`;
  }

  private notHiddenForCustomerSql(faultIdExpr: string) {
    return `NOT EXISTS (
      SELECT 1 FROM public.report_fault_customer_visibility v
      WHERE v.report_fault_id = ${faultIdExpr}
        AND v.user_id = :customerViewerId
        AND v.hidden_at IS NOT NULL
    )`;
  }

  private applyCustomerPerUserHiddenFilter(
    query: { andWhere: (sql: string, params?: object) => unknown },
    userInfo: IUserInfo,
    faultIdExpr: string,
  ) {
    if (+userInfo.type === userType.CUSTOMER) {
      query.andWhere(this.notHiddenForCustomerSql(faultIdExpr), {
        customerViewerId: +userInfo.userId,
      });
    }
  }

  private async setCustomerFaultOpened(viewerId: number, faultId: number) {
    await this.reportFaultsRepository.query(
      `
      INSERT INTO public.report_fault_customer_visibility (report_fault_id, user_id, opened_at, badge_dismissed_at)
      VALUES ($1, $2, NOW(), NOW())
      ON CONFLICT (report_fault_id, user_id) DO UPDATE
      SET opened_at = COALESCE(public.report_fault_customer_visibility.opened_at, NOW()),
          badge_dismissed_at = COALESCE(public.report_fault_customer_visibility.badge_dismissed_at, NOW())
      `,
      [faultId, viewerId],
    );
  }

  private async clearCustomerFaultOpened(viewerId: number, faultId: number) {
    await this.reportFaultsRepository.query(
      `
      INSERT INTO public.report_fault_customer_visibility (report_fault_id, user_id, opened_at)
      VALUES ($1, $2, NULL)
      ON CONFLICT (report_fault_id, user_id) DO UPDATE
      SET opened_at = NULL
      `,
      [faultId, viewerId],
    );
  }

  private async applyCustomerOpenedStateToListRows(
    rows: Array<{ reportFaultId?: number; id?: number; customerOpenedAt?: Date | null }>,
    viewerId: number,
  ): Promise<void> {
    if (!rows?.length) {
      return;
    }
    const faultIds = [
      ...new Set(
        rows
          .map((r) => +(r.reportFaultId ?? r.id ?? 0))
          .filter((id) => id > 0),
      ),
    ];
    if (!faultIds.length) {
      return;
    }
    const effective: Array<{ id: number; opened_at: Date | null }> =
      await this.reportFaultsRepository.query(
        `SELECT rf.id,
                COALESCE(v.opened_at, rf.customer_opened_at) AS opened_at
         FROM public.report_faults rf
         LEFT JOIN public.report_fault_customer_visibility v
           ON v.report_fault_id = rf.id AND v.user_id = $1
         WHERE rf.id = ANY($2::int[])`,
        [viewerId, faultIds],
      );
    const byFault = new Map(
      effective.map((r) => [Number(r.id), r.opened_at]),
    );
    for (const row of rows) {
      const fid = +(row.reportFaultId ?? row.id ?? 0);
      row.customerOpenedAt = byFault.get(fid) ?? null;
    }
  }

  private async hideFaultForCustomer(userInfo: IUserInfo, faultId: number) {
    const viewerId = +userInfo.userId;
    await this.reportFaultsRepository.query(
      `
      INSERT INTO public.report_fault_customer_visibility (report_fault_id, user_id, hidden_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (report_fault_id, user_id) DO UPDATE
      SET hidden_at = COALESCE(public.report_fault_customer_visibility.hidden_at, NOW())
      `,
      [faultId, viewerId],
    );
  }

  constructor(
    @InjectRepository(ReportFault) private readonly reportFaultsRepository: Repository<ReportFault>,
    @InjectRepository(ReportFaultAnswer) private readonly reportFaultAnswersRepository: Repository<ReportFaultAnswer>,
    @Inject('winston') private readonly logger: Logger,
    private readonly customerNotifications: CustomerNotificationsService,
    private readonly faultIssuesService: FaultIssuesService,
    private readonly customerPersonnelService: CustomerPersonnelService,
    private readonly adminPersonnelService: AdminPersonnelService,
    private readonly usersService: UsersService,
    private readonly personnelFaultAccess: PersonnelFaultAccessService,
  ) { }

  getIssueOptions(serviceId?: string | number) {
    return this.faultIssuesService.getIssueOptionsForService(
      serviceId != null && String(serviceId).trim() !== ''
        ? +serviceId
        : undefined,
    );
  }

  /** Tables may lack SERIAL/IDENTITY on id (legacy MySQL-style schema). */
  private async nextTableId(
    manager: EntityManager,
    table: 'report_faults' | 'report_fault_answers',
  ): Promise<number> {
    const rows = await manager.query(
      `SELECT COALESCE(MAX(id), 0)::bigint AS "maxId" FROM public.${table}`,
    );
    const row = Array.isArray(rows) ? rows[0] : rows;
    const maxId = Number(row?.maxId ?? (row as any)?.maxid ?? 0);
    if (!Number.isFinite(maxId) || maxId < 0) {
      throw new Error(`Could not read MAX(id) from ${table}`);
    }
    return Math.floor(maxId) + 1;
  }

  /** Calendar day in app timezone (matches admin list display). */
  private answerDayKey(date: Date | string): string {
    return moment(date).utcOffset('+10:00').format('YYYY-MM-DD');
  }

  /**
   * On edit: update today's answer only, or create a new row when the last edit was on another day.
   * Never overwrite answers from previous dates.
   */
  private async upsertAnswerForEdit(
    userInfo: IUserInfo,
    reportFaultId: number,
    message: string | undefined,
    attachFiles: string | undefined,
  ) {
    if (message === undefined && attachFiles === undefined) {
      return;
    }

    const todayKey = this.answerDayKey(new Date());
    const answers = await this.reportFaultAnswersRepository.find({
      where: { reportFaultId },
      order: { id: 'DESC' },
    });

    const sameDayAnswer = answers.find(
      (a) => this.answerDayKey(a.createdAt) === todayKey,
    );

    if (sameDayAnswer) {
      if (message !== undefined) {
        sameDayAnswer.message = message;
      }
      if (attachFiles !== undefined) {
        sameDayAnswer.attachFiles = attachFiles;
      }
      sameDayAnswer.updatedBy = +userInfo.userId;
      sameDayAnswer.updatedAt = new Date();
      sameDayAnswer.type = userInfo.type === 1 ? 1 : 2;
      await this.reportFaultAnswersRepository.save(sameDayAnswer);
      return;
    }

    const content = new ReportFaultAnswer();
    content.reportFaultId = reportFaultId;
    content.message = message ?? '';
    content.attachFiles =
      attachFiles && String(attachFiles).trim() ? attachFiles : '[]';
    content.createdAt = new Date();
    content.updatedAt = new Date();
    content.createdBy = +userInfo.userId;
    content.updatedBy = +userInfo.userId;
    content.userId = +userInfo.userId;
    content.type = userInfo.type === 1 ? 1 : 2;

    await this.reportFaultAnswersRepository.manager.transaction(async (manager) => {
      await manager.query(`LOCK TABLE public.report_fault_answers IN EXCLUSIVE MODE`);
      content.id = await this.nextTableId(manager, 'report_fault_answers');
      await manager.save(ReportFaultAnswer, content);
    });
  }

  private isOtherSiteReport(body: CreateReportFaultDto): boolean {
    return body.isOtherSite === true || body.siteId === -1 || body.siteId === 0;
  }

  /** Returns an error payload if the user may not access this fault, else null. */
  private async assertFaultAccess(
    userInfo: IUserInfo,
    fault: ReportFault | null | undefined,
    opts?: { allowAdmin?: boolean; allowStaffReporter?: boolean; allowCustomer?: boolean },
  ): Promise<IErrorData | null> {
    if (!fault) {
      return errorCode.NOT_FOUND;
    }
    if (+fault.status === reportFaultStatus.DELETED && +userInfo.type !== userType.ADMIN) {
      return errorCode.NOT_FOUND;
    }
    const type = +userInfo.type;
    if (opts?.allowAdmin !== false && type === userType.ADMIN) {
      return null;
    }
    if (opts?.allowStaffReporter !== false && type === userType.STAFF) {
      if (+fault.staffId === +userInfo.userId) return null;
      return errorCode.NOT_FOUND;
    }
    if (opts?.allowCustomer !== false && type === userType.CUSTOMER) {
      if (await this.customerCanAccessFault(userInfo, fault.customerId)) return null;
      return errorCode.NOT_FOUND;
    }
    return { ...errorCode.CAN_NOT_DELETE, message: 'You are not allowed to modify this fault' };
  }

  async create(userInfo: IUserInfo, body: CreateReportFaultDto) {
    try {
      if (+userInfo.type !== userType.STAFF) {
        return { ...errorCode.CAN_NOT_DELETE, message: 'Only staff can create report faults' };
      }
      const otherSite = this.isOtherSiteReport(body);
      if (!otherSite && !body.siteId) {
        return { ...errorCode.VALIDATION_ERROR, message: 'Site is required' };
      }
      if (otherSite && !body.siteName?.trim()) {
        return { ...errorCode.VALIDATION_ERROR, message: 'Site name is required' };
      }
      if (!body.serviceId) {
        return { ...errorCode.VALIDATION_ERROR, message: 'Service is required' };
      }
      if (!body.customerId) {
        return { ...errorCode.VALIDATION_ERROR, message: 'Customer is required' };
      }
      const issue = body.issue?.trim();
      if (!issue) {
        return { ...errorCode.VALIDATION_ERROR, message: 'Issue is required' };
      }
      const issueAllowed = await this.faultIssuesService.isIssueAllowedForService(
        +body.serviceId,
        issue,
      );
      if (!issueAllowed) {
        return {
          ...errorCode.VALIDATION_ERROR,
          message: 'Selected issue is not valid for this service',
        };
      }

      const serviceName = body.serviceName?.trim() ?? '';
      const toiletArea = body.toiletArea?.trim() ?? '';
      if (isPublicAmenitiesCleaningService(serviceName) && !toiletArea) {
        return { ...errorCode.VALIDATION_ERROR, message: 'Toilet is required' };
      }

      const message = body.message?.trim() ?? '';

      const attachFiles =
        body.attachFiles && String(body.attachFiles).trim()
          ? String(body.attachFiles)
          : '[]';
      let parsedFiles: unknown[] = [];
      try {
        parsedFiles = JSON.parse(attachFiles);
      } catch {
        return { ...errorCode.VALIDATION_ERROR, message: 'Invalid attachFiles format' };
      }
      if (!Array.isArray(parsedFiles)) {
        return { ...errorCode.VALIDATION_ERROR, message: 'Invalid attachFiles format' };
      }
      const mediaRequired = +userInfo.type !== userType.STAFF;
      if (mediaRequired && parsedFiles.length === 0) {
        return { ...errorCode.VALIDATION_ERROR, message: 'At least one media file is required' };
      }

      const reportFault = new ReportFault();
      reportFault.message = message;
      reportFault.staffId = +userInfo.userId;
      reportFault.customerId = +body.customerId;
      reportFault.customerName = body.customerName?.trim() ?? '';
      reportFault.companyName = body.companyName?.trim() ?? '';
      reportFault.serviceId = +body.serviceId;
      reportFault.serviceName = body.serviceName?.trim() ?? '';
      reportFault.attachFiles = attachFiles;
      reportFault.priority = +body.priority === 1 ? 1 : 2;
      reportFault.siteId = otherSite ? null : +body.siteId;
      reportFault.siteName = body.siteName?.trim() ?? '';
      reportFault.subject = issue;
      reportFault.issue = issue;
      reportFault.toiletArea = toiletArea || null;
      reportFault.status = reportFaultStatus.PENDING;
      reportFault.createdBy = +userInfo.userId;
      reportFault.updatedBy = +userInfo.userId;
      reportFault.createdAt = new Date();
      reportFault.updatedAt = new Date();
      reportFault.sender = reportFaultSender.STAFF;

      await this.reportFaultsRepository.manager.transaction(async (manager) => {
        await manager.query(`LOCK TABLE public.report_faults IN EXCLUSIVE MODE`);
        await manager.query(`LOCK TABLE public.report_fault_answers IN EXCLUSIVE MODE`);
        reportFault.id = await this.nextTableId(manager, 'report_faults');
        const reportFaultSaved = await manager.save(ReportFault, reportFault);

        const content = new ReportFaultAnswer();
        content.id = await this.nextTableId(manager, 'report_fault_answers');
        content.reportFaultId = reportFaultSaved.id;
        content.createdBy = +userInfo.userId;
        content.updatedBy = +userInfo.userId;
        content.userId = +userInfo.userId;
        content.message = message;
        content.attachFiles = attachFiles;
        content.createdAt = new Date();
        content.updatedAt = new Date();
        content.type = userInfo.type === 1 ? 1 : 2;
        await manager.save(ReportFaultAnswer, content);
      });

      if (reportFault.customerId && +userInfo.type !== userType.CUSTOMER) {
        void this.customerNotifications.notifyFaultReportCreated({
          faultId: reportFault.id,
          customerId: reportFault.customerId,
          issue: reportFault.issue,
          siteName: reportFault.siteName,
          serviceName: reportFault.serviceName,
          priority: reportFault.priority,
          createdByUserId: +userInfo.userId,
        });
      }
      void this.customerNotifications.notifyAdminsFaultReportCreated({
        faultId: reportFault.id,
        issue: reportFault.issue,
        siteName: reportFault.siteName,
        serviceName: reportFault.serviceName,
        priority: reportFault.priority,
        createdByUserId: +userInfo.userId,
      });

      return errorCode.SUCCESS;
    } catch (error) {
      const err = error as Error;
      console.log('error', err);
      this.logger.error(err);
      return { ...errorCode.EXCEPTION, message: err?.message || errorCode.EXCEPTION.message };
    }


  }

  /** Deep-link from messages: load all answers for one fault (admin/customer/staff scoped). */
  private async findFaultRowsById(
    userInfo: IUserInfo,
    faultId: number,
    body: GetReportFaultsDto,
  ) {
    const fault = await this.reportFaultsRepository.findOne({
      where: { id: faultId },
    });
    if (fault) {
      fault.answers = await this.reportFaultAnswersRepository.find({
        where: { reportFaultId: fault.id },
        order: { createdAt: 'ASC' },
      });
    }
    if (!fault) {
      return { ...errorCode.SUCCESS, data: { count: 0, rows: [] } };
    }
    // Deep-link from messages: show deleted faults too (still in DB, hidden from normal lists).
    if (userInfo.type === userType.STAFF) {
      const isReporter = +fault.staffId === +userInfo.userId;
      const isAssignee =
        fault.delegatedToType === 'staff' &&
        +fault.delegatedToStaffId === +userInfo.userId;
      if (!isReporter && !isAssignee) {
        return { ...errorCode.SUCCESS, data: { count: 0, rows: [] } };
      }
    }
    if (
      userInfo.type === userType.CUSTOMER &&
      !(await this.customerCanAccessFault(userInfo, fault.customerId))
    ) {
      return { ...errorCode.SUCCESS, data: { count: 0, rows: [] } };
    }

    const answers = (fault.answers || []).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    let rows =
      answers.length > 0
        ? answers.map((answer) => this.mapAnswerToListRow(fault, answer))
        : [this.mapAnswerToListRow(fault, this.syntheticAnswerFromFault(fault))];

    const orderDir = body.orderValue && body.orderValue === 'ASC' ? 1 : -1;
    rows = rows.sort(
      (a, b) =>
        orderDir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    );

    if (+userInfo.type === userType.CUSTOMER) {
      await this.applyCustomerOpenedStateToListRows(rows, +userInfo.userId);
    }
    await this.enrichListRowsDelegationFromDb(rows, userInfo);
    return { ...errorCode.SUCCESS, data: { count: rows.length, rows } };
  }

  /** Default list hides soft-deleted faults only; in-progress reports stay visible. */
  private readonly listExcludedStatuses = [reportFaultStatus.DELETED];

  private applyListStatusFilter(
    query: { andWhere: (sql: string, params?: object) => unknown },
    body: GetReportFaultsDto,
    statusColumn: string,
  ) {
    if (+body.status) {
      query.andWhere(`${statusColumn} = :listStatus`, { listStatus: +body.status });
    } else {
      query.andWhere(`${statusColumn} NOT IN (:...listExcludedStatuses)`, {
        listExcludedStatuses: this.listExcludedStatuses,
      });
    }
  }

  private applyFaultListQueryFilters(
    query: { andWhere: (sql: string, params?: object) => unknown },
    body: GetReportFaultsDto,
    faultAlias: string,
  ) {
    if (+body.priority === 1 || +body.priority === 2) {
      query.andWhere(`${faultAlias}.priority = :faultListPriority`, {
        faultListPriority: +body.priority,
      });
    }
    const incompleteOnly =
      body.incompleteOnly === true ||
      body.incompleteOnly === 'true' ||
      body.incompleteOnly === '1';
    if (incompleteOnly) {
      query.andWhere(`${faultAlias}.status != :faultListCompletedStatus`, {
        faultListCompletedStatus: reportFaultStatus.COMPLETED,
      });
    }
  }

  private syntheticAnswerFromFault(fault: ReportFault): ReportFaultAnswer {
    return {
      id: 0,
      reportFaultId: fault.id,
      message: fault.message,
      attachFiles: fault.attachFiles,
      createdAt: fault.createdAt,
      updatedAt: fault.updatedAt,
      type: 0,
    } as ReportFaultAnswer;
  }

  /** Faults with no answer rows (message stored on fault only) — admin list only. */
  private async appendOrphanFaultsForAdmin(
    userInfo: IUserInfo,
    body: GetReportFaultsDto,
    rows: Array<ReturnType<ReportFaultsService['mapAnswerToListRow']>>,
  ) {
    if (+userInfo.type !== userType.ADMIN) return rows;

    const existingIds = new Set(rows.map((r) => r.reportFaultId ?? r.id));
    const q = this.reportFaultsRepository
      .createQueryBuilder('f')
      .leftJoin('f.answers', 'a')
      .where('a.id IS NULL');

    if (body.keyword) {
      q.andWhere(
        '(f.subject LIKE :keyword OR f.issue LIKE :keyword OR f.message LIKE :keyword)',
        { keyword: `%${body.keyword}%` },
      );
    }
    this.applyListStatusFilter(q, body, 'f.status');
    this.applyFaultListQueryFilters(q, body, 'f');
    if (body.startDate && body.endDate) {
      q.andWhere('f.created_at > :startDate AND f.created_at < :endDate', {
        startDate: moment(body.startDate).format('YYYY-MM-DD 00:00:00'),
        endDate: moment(body.endDate).format('YYYY-MM-DD 23:59:59'),
      });
    }

    const orphans = await q.getMany();
    let orphansAdded = false;
    for (const fault of orphans) {
      if (!existingIds.has(fault.id)) {
        rows.push(this.mapAnswerToListRow(fault, this.syntheticAnswerFromFault(fault)));
        orphansAdded = true;
      }
    }

    if (orphansAdded) {
      this.sortFaultListRows(rows, body, userInfo);
    }
    return rows;
  }

  /** One list row per answer so different dates are not grouped under one fault row. */
  private mapAnswerToListRow(fault: ReportFault, answer: ReportFaultAnswer) {
    return {
      listRowId: `${fault.id}-${answer.id}`,
      reportFaultId: fault.id,
      answerId: answer.id,
      id: fault.id,
      subject: fault.subject,
      issue: fault.issue,
      toiletArea: fault.toiletArea ?? null,
      message: answer.message,
      attachFiles: answer.attachFiles,
      createdAt: answer.createdAt,
      updatedAt: answer.updatedAt,
      answerType: answer.type,
      companyName: fault.companyName,
      companyId:
        (fault as ReportFault & { companyId?: number }).companyId ??
        (fault.customer as { customerInfo?: { companyId?: number } } | undefined)
          ?.customerInfo?.companyId ??
        null,
      customerName: fault.customerName,
      siteName: fault.siteName,
      serviceName: fault.serviceName,
      status: fault.status,
      priority: fault.priority,
      delegatedToType: fault.delegatedToType ?? null,
      delegatedToPersonnelId: fault.delegatedToPersonnelId ?? null,
      delegatedToStaffId: fault.delegatedToStaffId ?? null,
      delegatedUntil: fault.delegatedUntil ?? null,
      delegatedAt: fault.delegatedAt ?? null,
      delegatedBy: fault.delegatedBy ?? null,
      delegationNote: fault.delegationNote ?? null,
      delegatedActedAt: fault.delegatedActedAt ?? null,
      delegationViewedAt: fault.delegationViewedAt ?? null,
      delegationOutcome: computeDelegationOutcome(fault),
      delegatedAssigneeName: null as string | null,
      delegatedAssigneeRole: null as string | null,
      staffId: fault.staffId,
      customerId: fault.customerId,
      sender: fault.sender,
      siteId: fault.siteId,
      serviceId: fault.serviceId,
      adminOpenedAt: fault.adminOpenedAt,
      customerOpenedAt: fault.customerOpenedAt,
    };
  }

  private clearDelegationOnListRow(
    row: ReturnType<ReportFaultsService['mapAnswerToListRow']>,
  ) {
    row.delegatedToType = null;
    row.delegatedToPersonnelId = null;
    row.delegatedToStaffId = null;
    row.delegatedUntil = null;
    row.delegatedAt = null;
    row.delegatedBy = null;
    row.delegationNote = null;
    row.delegatedActedAt = null;
    row.delegationViewedAt = null;
    row.delegationOutcome = null;
    row.delegatedAssigneeName = null;
    row.delegatedAssigneeRole = null;
  }

  /** Resolve assignee labels from DB; drop stale delegation when ids no longer exist. */
  private async enrichListRowsDelegationFromDb(
    rows: Array<ReturnType<ReportFaultsService['mapAnswerToListRow']>>,
    userInfo: IUserInfo,
  ) {
    const customerPersonnelIds = new Set<number>();
    const adminPersonnelIds = new Set<number>();
    const staffIds = new Set<number>();

    for (const row of rows) {
      const type = String(row.delegatedToType ?? '').trim().toLowerCase();
      if (!type) {
        this.clearDelegationOnListRow(row);
        continue;
      }
      if (type === 'personnel') {
        if (!row.delegatedToPersonnelId) {
          this.clearDelegationOnListRow(row);
          continue;
        }
        customerPersonnelIds.add(+row.delegatedToPersonnelId);
      } else if (type === 'admin_personnel') {
        if (!row.delegatedToStaffId) {
          this.clearDelegationOnListRow(row);
          continue;
        }
        adminPersonnelIds.add(+row.delegatedToStaffId);
      } else if (type === 'staff') {
        if (!row.delegatedToStaffId) {
          this.clearDelegationOnListRow(row);
          continue;
        }
        staffIds.add(+row.delegatedToStaffId);
      } else if (type !== 'admin') {
        this.clearDelegationOnListRow(row);
      }
    }

    const [customerPersonnelMap, adminPersonnelMap, staffMap] = await Promise.all([
      this.customerPersonnelService.findActiveMapByIds([...customerPersonnelIds]),
      this.adminPersonnelService.findActiveMapByIds([...adminPersonnelIds]),
      this.usersService.findStaffMapForDelegation([...staffIds]),
    ]);

    const viewerIsCustomer = +userInfo.type === userType.CUSTOMER;

    for (const row of rows) {
      const type = String(row.delegatedToType ?? '').trim().toLowerCase();
      if (!type) continue;

      row.delegatedAssigneeName = null;
      row.delegatedAssigneeRole = null;

      if (type === 'admin') {
        row.delegatedAssigneeName = viewerIsCustomer ? 'Servicelink' : 'Service Provider';
        continue;
      }

      if (viewerIsCustomer && this.isAdminSideDelegationType(type)) {
        row.delegatedAssigneeName = 'Servicelink';
        continue;
      }

      if (type === 'personnel') {
        const person = customerPersonnelMap.get(+row.delegatedToPersonnelId!);
        if (!person?.name) {
          this.clearDelegationOnListRow(row);
          continue;
        }
        if (viewerIsCustomer) {
          row.delegatedAssigneeName = person.name;
          row.delegatedAssigneeRole = person.role || null;
        } else {
          row.delegatedAssigneeName =
            ReportFaultsService.CUSTOMER_PERSONNEL_MASK_LABEL;
          row.delegatedAssigneeRole = null;
        }
        continue;
      }

      if (type === 'admin_personnel') {
        const person = adminPersonnelMap.get(+row.delegatedToStaffId!);
        if (!person?.name) {
          this.clearDelegationOnListRow(row);
          continue;
        }
        row.delegatedAssigneeName = person.name;
        row.delegatedAssigneeRole = person.role || null;
        continue;
      }

      if (type === 'staff') {
        const staff = staffMap.get(+row.delegatedToStaffId!);
        if (!staff?.name) {
          this.clearDelegationOnListRow(row);
          continue;
        }
        row.delegatedAssigneeName = staff.name;
        row.delegatedAssigneeRole = staff.role || null;
      }
    }

    for (const row of rows) {
      this.applyEffectiveFaultStatusToListRow(row);
    }
  }

  private isAdminSideDelegationType(type: string): boolean {
    return type === 'admin' || type === 'admin_personnel' || type === 'staff';
  }

  /** Admin/staff must not see customer personnel identity (symmetric to customer → Servicelink). */
  private static readonly CUSTOMER_PERSONNEL_MASK_LABEL = 'Customer personnel';

  private isCustomerOwnedDelegationType(type: string): boolean {
    const t = String(type ?? '').trim().toLowerCase();
    return t === 'personnel' || t === 'admin';
  }

  private isAdminOwnedDelegationType(type: string): boolean {
    const t = String(type ?? '').trim().toLowerCase();
    return t === 'staff' || t === 'admin_personnel';
  }

  /** Customer-assigned faults cannot be reassigned by admin, and vice versa. */
  private async assertDelegationReassignmentAllowed(
    userInfo: IUserInfo,
    fault: { delegatedBy?: number | null; delegatedToType?: string | null },
  ): Promise<Record<string, unknown> | null> {
    const delegatedType = String(fault.delegatedToType ?? '').trim().toLowerCase();
    if (!delegatedType) return null;

    let assignerWasCustomer: boolean;
    let assignerWasAdmin: boolean;

    if (fault.delegatedBy) {
      const rows: { type: number }[] = await this.reportFaultsRepository.query(
        `SELECT type FROM users WHERE id = $1 LIMIT 1`,
        [+fault.delegatedBy],
      );
      const assignerType = rows?.[0]?.type != null ? +rows[0].type : null;
      if (assignerType === userType.CUSTOMER) {
        assignerWasCustomer = true;
        assignerWasAdmin = false;
      } else if (assignerType === userType.ADMIN) {
        assignerWasCustomer = false;
        assignerWasAdmin = true;
      } else {
        assignerWasCustomer = this.isCustomerOwnedDelegationType(delegatedType);
        assignerWasAdmin = this.isAdminOwnedDelegationType(delegatedType);
      }
    } else {
      assignerWasCustomer = this.isCustomerOwnedDelegationType(delegatedType);
      assignerWasAdmin = this.isAdminOwnedDelegationType(delegatedType);
    }

    if (assignerWasCustomer && +userInfo.type === userType.ADMIN) {
      return {
        ...errorCode.VALIDATION_ERROR,
        message:
          'This fault was assigned by the customer and cannot be reassigned by the service provider',
      };
    }
    if (assignerWasAdmin && +userInfo.type === userType.CUSTOMER) {
      return {
        ...errorCode.VALIDATION_ERROR,
        message:
          'This fault was assigned by the service provider and cannot be reassigned by the customer',
      };
    }
    return null;
  }

  private assertCanNudgeDelegation(
    userInfo: IUserInfo,
    fault: {
      delegatedToType?: string | null;
      delegatedActedAt?: Date | null;
      delegatedUntil?: Date | null;
      delegationViewedAt?: Date | null;
      status?: number;
    },
  ): Record<string, unknown> | null {
    const delegatedType = String(fault.delegatedToType ?? '').trim().toLowerCase();
    if (!delegatedType) {
      return { ...errorCode.VALIDATION_ERROR, message: 'Fault is not assigned' };
    }
    if (fault.delegatedActedAt) {
      return { ...errorCode.VALIDATION_ERROR, message: 'Assignee has already confirmed action' };
    }
    const outcome = computeDelegationOutcome(fault);
    if (outcome !== 'pending' && outcome !== 'viewed' && outcome !== 'not_done') {
      return { ...errorCode.VALIDATION_ERROR, message: 'No reminder needed for this assignment' };
    }
    if (+userInfo.type === userType.CUSTOMER) {
      if (delegatedType !== 'personnel') {
        return {
          ...errorCode.VALIDATION_ERROR,
          message: 'Only customer-assigned personnel can be reminded from here',
        };
      }
    } else if (+userInfo.type === userType.ADMIN) {
      if (!this.isAdminOwnedDelegationType(delegatedType)) {
        return {
          ...errorCode.VALIDATION_ERROR,
          message: 'Reminders for customer personnel are sent by the customer',
        };
      }
    }
    return null;
  }

  private applyEffectiveFaultStatusToListRow(
    row: ReturnType<ReportFaultsService['mapAnswerToListRow']>,
  ) {
    row.delegationOutcome = computeDelegationOutcome(row);
    if (
      row.delegatedToType &&
      row.delegationOutcome === 'not_done' &&
      +row.status! === reportFaultStatus.COMPLETED &&
      !row.delegatedActedAt
    ) {
      row.status = reportFaultStatus.NEW;
    }
  }

  /**
   * Admin Deleted tab: one list row per soft-deleted fault (not per answer).
   * Avoids mismatched counts and active faults appearing beside orphan rows.
   */
  private faultListStatusRankFromRow(record: {
    status?: number;
    delegatedToType?: string | null;
    delegatedActedAt?: Date | null;
    delegatedUntil?: Date | null;
    delegationViewedAt?: Date | null;
  }): number {
    const outcome =
      record.delegatedToType && record.delegatedUntil
        ? computeDelegationOutcome(record)
        : null;
    if (outcome === 'not_done') return 0;
    if (outcome === 'done_on_time' || outcome === 'done_late') return 2;
    if (+record.status! === reportFaultStatus.COMPLETED) return 2;
    if (record.delegatedActedAt) return 2;
    return 1;
  }

  private compareNullableDates(
    a: Date | null | undefined,
    b: Date | null | undefined,
    asc: boolean,
  ): number {
    const aNull = a == null;
    const bNull = b == null;
    if (aNull && bNull) return 0;
    if (aNull && !bNull) return asc ? -1 : 1;
    if (!aNull && bNull) return asc ? 1 : -1;
    const dir = asc ? 1 : -1;
    return dir * (new Date(a!).getTime() - new Date(b!).getTime());
  }

  private sortFaultListRows(
    rows: Array<ReturnType<ReportFaultsService['mapAnswerToListRow']>>,
    body: GetReportFaultsDto,
    userInfo: IUserInfo,
  ): void {
    const orderBy = String(body.orderBy || '').trim();
    const asc = body.orderValue === 'ASC';
    const dir = asc ? 1 : -1;
    const tieBreak = (
      a: ReturnType<ReportFaultsService['mapAnswerToListRow']>,
      b: ReturnType<ReportFaultsService['mapAnswerToListRow']>,
    ) => (b.reportFaultId ?? b.id ?? 0) - (a.reportFaultId ?? a.id ?? 0);

    if (orderBy === 'readStatus') {
      const field =
        +userInfo.type === userType.ADMIN ? 'adminOpenedAt' : 'customerOpenedAt';
      rows.sort((a, b) => {
        const cmp = this.compareNullableDates(a[field], b[field], asc);
        return cmp !== 0 ? cmp : tieBreak(a, b);
      });
      return;
    }

    if (orderBy === 'listStatus') {
      rows.sort((a, b) => {
        const cmp =
          dir * (this.faultListStatusRankFromRow(a) - this.faultListStatusRankFromRow(b));
        return cmp !== 0 ? cmp : tieBreak(a, b);
      });
      return;
    }

    if (orderBy === 'priority') {
      rows.sort((a, b) => {
        const cmp = dir * ((+a.priority || 99) - (+b.priority || 99));
        return cmp !== 0 ? cmp : tieBreak(a, b);
      });
      return;
    }

    const dateFields = new Set(['createdAt', 'updatedAt']);
    const scalarFields = new Set([
      'issue',
      'subject',
      'message',
      'siteName',
      'serviceName',
      'companyName',
      'customerName',
    ]);

    if (dateFields.has(orderBy)) {
      rows.sort((a, b) => {
        const cmp = this.compareNullableDates(
          a[orderBy as 'createdAt' | 'updatedAt'],
          b[orderBy as 'createdAt' | 'updatedAt'],
          asc,
        );
        return cmp !== 0 ? cmp : tieBreak(a, b);
      });
      return;
    }

    if (scalarFields.has(orderBy)) {
      rows.sort((a, b) => {
        const av = String((a as Record<string, unknown>)[orderBy] ?? '')
          .trim()
          .toLowerCase();
        const bv = String((b as Record<string, unknown>)[orderBy] ?? '')
          .trim()
          .toLowerCase();
        const cmp = dir * av.localeCompare(bv);
        return cmp !== 0 ? cmp : tieBreak(a, b);
      });
      return;
    }

    rows.sort((a, b) => {
      const cmp =
        dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      return cmp !== 0 ? cmp : tieBreak(a, b);
    });
  }

  private faultListStatusRankSql(faultAlias: string): string {
    const a = `"${faultAlias}"`;
    return `CASE
      WHEN ${a}."status" = :rfCompletedStatus THEN 2
      WHEN ${a}."delegated_acted_at" IS NOT NULL THEN 2
      WHEN ${a}."delegated_to_type" IS NOT NULL
        AND ${a}."delegated_acted_at" IS NULL
        AND ${a}."delegated_until" IS NOT NULL
        AND ${a}."delegated_until" < CURRENT_TIMESTAMP THEN 0
      ELSE 1
    END`;
  }

  private applyFaultListOrderBy(
    userInfo: IUserInfo,
    body: GetReportFaultsDto,
    query: SelectQueryBuilder<unknown>,
    faultAlias: string,
    options?: { answerAlias?: string },
  ): void {
    const orderDir = body.orderValue === 'ASC' ? 'ASC' : 'DESC';
    const nullsPlacement = orderDir === 'ASC' ? 'NULLS FIRST' : 'NULLS LAST';
    const orderBy = String(body.orderBy || '').trim();
    const f = faultAlias;
    const answerAlias = options?.answerAlias;

    if (orderBy === 'readStatus') {
      if (+userInfo.type === userType.ADMIN) {
        query
          .orderBy(`${f}.adminOpenedAt`, orderDir, nullsPlacement)
          .addOrderBy(`${f}.id`, 'DESC');
      } else if (+userInfo.type === userType.CUSTOMER) {
        const a = `"${f}"`;
        const openedAlias = 'fault_read_opened_at';
        query
          .leftJoin(
            'report_fault_customer_visibility',
            'custFaultVis',
            `"custFaultVis"."report_fault_id" = ${a}."id" AND "custFaultVis"."user_id" = :custFaultViewerId`,
          )
          .setParameter('custFaultViewerId', +userInfo.userId)
          .addSelect(
            `COALESCE("custFaultVis"."opened_at", ${a}."customer_opened_at")`,
            openedAlias,
          )
          .orderBy(openedAlias, orderDir, nullsPlacement)
          .addOrderBy(`${f}.id`, 'DESC');
      } else if (answerAlias) {
        query.orderBy(`${answerAlias}.createdAt`, orderDir);
      } else {
        query.orderBy(`${f}.createdAt`, orderDir);
      }
      return;
    }

    if (orderBy === 'listStatus') {
      const rankAlias = 'fault_list_status_rank';
      query
        .addSelect(this.faultListStatusRankSql(f), rankAlias)
        .orderBy(rankAlias, orderDir)
        .setParameter('rfCompletedStatus', reportFaultStatus.COMPLETED)
        .addOrderBy(`${f}.id`, 'DESC');
      return;
    }

    const faultScalarFields = new Set([
      'createdAt',
      'updatedAt',
      'subject',
      'issue',
      'message',
      'siteName',
      'serviceName',
      'companyName',
      'customerName',
      'status',
      'priority',
    ]);

    if (orderBy === 'createdAt' && answerAlias) {
      query.orderBy(`${answerAlias}.createdAt`, orderDir);
      return;
    }

    if (faultScalarFields.has(orderBy)) {
      query.orderBy(`${f}.${orderBy}`, orderDir);
      if (answerAlias) query.addOrderBy(`${answerAlias}.id`, 'DESC');
      return;
    }

    if (answerAlias) {
      query.orderBy(`${answerAlias}.createdAt`, orderDir);
    } else {
      query.orderBy(`${f}.createdAt`, orderDir);
    }
  }

  private async findDeletedFaultsForAdmin(
    userInfo: IUserInfo,
    body: GetReportFaultsDto,
  ) {
    const q = this.reportFaultsRepository
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.answers', 'a')
      .leftJoin('f.customer', 'faultCustomer')
      .leftJoin('faultCustomer.customerInfo', 'faultCustomerInfo')
      .addSelect(['faultCustomerInfo.companyId'])
      .where('f.status = :deletedStatus', {
        deletedStatus: reportFaultStatus.DELETED,
      });

    if (body.keyword) {
      q.andWhere(
        '(f.subject LIKE :keyword OR f.issue LIKE :keyword OR f.message LIKE :keyword)',
        { keyword: `%${body.keyword}%` },
      );
    }
    if (body.startDate && body.endDate) {
      q.andWhere('f.created_at > :startDate AND f.created_at < :endDate', {
        startDate: moment(body.startDate).format('YYYY-MM-DD 00:00:00'),
        endDate: moment(body.endDate).format('YYYY-MM-DD 23:59:59'),
      });
    }

    this.applyFaultListOrderBy(userInfo, body, q, 'f');

    const total = await q.getCount();

    if (+body.limit) {
      q.take(body.limit).skip((body.page - 1) * body.limit);
    }

    const faults = await q.getMany();
    const rows = faults.map((fault) => {
      const answers = (fault.answers || []).slice().sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      const answer =
        answers.length > 0 ? answers[0] : this.syntheticAnswerFromFault(fault);
      const row = this.mapAnswerToListRow(fault, answer);
      const companyId =
        (fault.customer as { customerInfo?: { companyId?: number } })
          ?.customerInfo?.companyId;
      if (companyId != null) {
        (row as { companyId?: number }).companyId = +companyId;
      }
      return row;
    });

    await this.enrichListRowsDelegationFromDb(rows, userInfo);

    return { ...errorCode.SUCCESS, data: { count: total, rows } };
  }

  async findAllGroupByDate(userInfo: IUserInfo, body: GetReportFaultsDto) {
    try {
      if (+body.faultId) {
        return this.findFaultRowsById(userInfo, +body.faultId, body);
      }

      if (
        +userInfo.type === userType.ADMIN &&
        +body.status === reportFaultStatus.DELETED
      ) {
        return this.findDeletedFaultsForAdmin(userInfo, body);
      }

      const query = this.reportFaultAnswersRepository
        .createQueryBuilder('answer')
        .innerJoinAndSelect('answer.reportFault', 'reportFaults')
        .leftJoin('reportFaults.customer', 'faultCustomer')
        .leftJoin('faultCustomer.customerInfo', 'faultCustomerInfo')
        .addSelect(['faultCustomerInfo.companyId']);

      if (body.keyword) {
        query.andWhere(
          `(reportFaults.subject LIKE :keyword OR reportFaults.issue LIKE :keyword OR reportFaults.message LIKE :keyword OR answer.message LIKE :keyword)`,
          { keyword: `%${body.keyword}%` },
        );
      }
      this.applyListStatusFilter(query, body, 'reportFaults.status');
      this.applyFaultListQueryFilters(query, body, 'reportFaults');
      if (userInfo.type === userType.STAFF) {
        query.andWhere('reportFaults.staffId = :staffId', {
          staffId: +userInfo.userId,
        });
      }
      if (userInfo.type === userType.CUSTOMER) {
        applyCustomerScopeToQuery(query, userInfo, 'reportFaults.customerId');
        this.applyCustomerPerUserHiddenFilter(
          query,
          userInfo,
          this.quotedSqlRef('answer', 'report_fault_id'),
        );
      }
      if (body.startDate && body.endDate) {
        query.andWhere(
          'answer.created_at > :startDate AND answer.created_at < :endDate',
          {
            startDate: moment(body.startDate).format('YYYY-MM-DD 00:00:00'),
            endDate: moment(body.endDate).format('YYYY-MM-DD 23:59:59'),
          },
        );
      }

      this.applyFaultListOrderBy(userInfo, body, query, 'reportFaults', {
        answerAlias: 'answer',
      });

      if (+body.limit) {
        query.take(body.limit).skip((body.page - 1) * body.limit);
      }

      const result = await query.getManyAndCount();
      let rows = result[0]
        .filter((answer) => answer.reportFault)
        .map((answer) => {
          const fault = answer.reportFault as ReportFault & {
            companyId?: number;
          };
          const companyId =
            (fault.customer as { customerInfo?: { companyId?: number } })
              ?.customerInfo?.companyId;
          if (companyId != null) {
            fault.companyId = +companyId;
          }
          return this.mapAnswerToListRow(fault, answer);
        });

      rows = await this.appendOrphanFaultsForAdmin(userInfo, body, rows);
      if (+body.status) {
        rows = rows.filter((r) => +r.status === +body.status);
      } else {
        rows = rows.filter(
          (r) => !this.listExcludedStatuses.includes(+r.status),
        );
      }

      if (+userInfo.type === userType.CUSTOMER) {
        await this.applyCustomerOpenedStateToListRows(rows, +userInfo.userId);
      }

      await this.enrichListRowsDelegationFromDb(rows, userInfo);

      return {
        ...errorCode.SUCCESS,
        data: { count: result[1], rows },
      };
    } catch (error) {
      this.logger.error(error.message);
      return { ...errorCode.EXCEPTION, message: error.message };
    }
  }

  async findAll(userInfo: IUserInfo, body: GetReportFaultsDto) {
    try {
      const query = this.reportFaultsRepository.createQueryBuilder('reportFaults')
        .leftJoin('reportFaults.customer', 'faultCustomer')
        .leftJoin('faultCustomer.customerInfo', 'faultCustomerInfo')
        .addSelect(['faultCustomerInfo.companyId'])
        .leftJoin('reportFaults.createdUser', 'createdUser').addSelect(['createdUser.fullName', 'createdUser.username'])
        .leftJoin('createdUser.customerInfo', 'customerInfo').addSelect(['customerInfo.companyName'])
        .leftJoin('reportFaults.updatedUser', 'updatedUser').addSelect(['updatedUser.fullName', 'updatedUser.username'])
        .leftJoinAndSelect('reportFaults.answers', 'answers')
        .leftJoin('answers.createdUser', 'answersCreatedUser').addSelect(['answersCreatedUser.fullName', 'answersCreatedUser.username'])
        .leftJoin('answersCreatedUser.customerInfo', 'answersCustomerInfo').addSelect(['answersCustomerInfo.companyName'])
        .leftJoin('answers.updatedUser', 'answersUpdatedUser').addSelect(['answersUpdatedUser.fullName', 'answersUpdatedUser.username'])
      if (body.keyword) {
        query.andWhere("( reportFaults.subject LIKE :keyword or reportFaults.message LIKE :keyword )", { keyword: `%${body.keyword}%` })
      }
      this.applyListStatusFilter(query, body, 'reportFaults.status');
      if (userInfo.type === userType.STAFF) {
        query.andWhere("( reportFaults.staffId = :staffId)", { staffId: +userInfo.userId })
      }
      if (userInfo.type === userType.CUSTOMER) {
        applyCustomerScopeToQuery(query, userInfo, 'reportFaults.customerId');
        this.applyCustomerPerUserHiddenFilter(
          query,
          userInfo,
          this.quotedSqlRef('reportFaults', 'id'),
        );
      }
      if (body.startDate && body.endDate) {
        query.andWhere(
          'reportFaults.created_at > :startDate AND reportFaults.created_at < :endDate',
          {
            startDate: moment(body.startDate).format('YYYY-MM-DD 00:00:00'),
            endDate: moment(body.endDate).format('YYYY-MM-DD 23:59:59'),
          },
        );
      }
      if (+body.limit) {
        query.take(body.limit).skip((body.page - 1) * body.limit)
      }
      if (body.orderBy) {
        // TypeORM orderBy expects entity property names (e.g. createdAt), not DB column names (created_at).
        const allowedOrderFields = new Set([
          'createdAt',
          'updatedAt',
          'subject',
          'issue',
          'message',
          'siteName',
          'serviceName',
          'companyName',
          'customerName',
          'status',
          'priority',
        ]);
        const orderField = allowedOrderFields.has(body.orderBy) ? body.orderBy : 'createdAt';
        query.orderBy(
          `reportFaults.${orderField}`,
          body.orderValue && body.orderValue === 'ASC' ? 'ASC' : 'DESC',
        );
      } else {
        query.orderBy('reportFaults.createdAt', 'DESC');
      }
      query.addOrderBy('answers.createdAt', 'ASC');
      const result = await query.getManyAndCount();
      if (!result)
        return errorCode.EXCEPTION;

      return { ...errorCode.SUCCESS, data: { count: result[1], rows: result[0] } };
    } catch (error) {
      this.logger.error(error.message);
      return { ...errorCode.EXCEPTION, message: error.message };
    }
  }

  async setFaultPriority(userInfo: IUserInfo, faultId: number, priority?: number) {
    try {
      if (priority === undefined || priority === null) {
        return { ...errorCode.VALIDATION_ERROR, message: 'Priority is required' };
      }
      const fault = await this.reportFaultsRepository.findOne({ where: { id: faultId } });
      if (!fault) {
        return errorCode.NOT_FOUND;
      }
      const denied = await this.assertFaultAccess(userInfo, fault, {
        allowCustomer: true,
      });
      if (denied) return denied;
      fault.priority = +priority === 1 ? 1 : 2;
      fault.updatedBy = +userInfo.userId;
      fault.updatedAt = new Date();
      await this.reportFaultsRepository.save(fault);
      return {
        ...errorCode.SUCCESS,
        data: { id: fault.id, priority: fault.priority },
      };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  private isPriorityOnlyUpdate(body: UpdateReportFaultDto): boolean {
    if (body.priority === undefined) return false;
    const otherFields: (keyof UpdateReportFaultDto)[] = [
      'subject',
      'issue',
      'message',
      'customerId',
      'customerName',
      'companyName',
      'serviceId',
      'serviceName',
      'siteId',
      'siteName',
      'toiletArea',
      'attachFiles',
      'isOtherSite',
    ];
    return !otherFields.some((key) => body[key] !== undefined);
  }

  async update(userInfo: IUserInfo, id: string, body: UpdateReportFaultDto) {
    try {
      const data = await this.reportFaultsRepository.findOne({ where: { id: +id } });
      if (!data) {
        return errorCode.NOT_FOUND;
      }
      if (this.isPriorityOnlyUpdate(body)) {
        const denied = await this.assertFaultAccess(userInfo, data, {
          allowCustomer: true,
        });
        if (denied) return denied;
        data.priority = +body.priority === 1 ? 1 : 2;
        data.updatedBy = +userInfo.userId;
        data.updatedAt = new Date();
        await this.reportFaultsRepository.save(data);
        return {
          ...errorCode.SUCCESS,
          data: { id: data.id, priority: data.priority },
        };
      }
      const denied = await this.assertFaultAccess(userInfo, data, {
        allowCustomer: false,
      });
      if (denied) return denied;
      if (body.subject !== undefined)
        data.subject = body.subject;
      if (body.issue !== undefined) {
        const issue = body.issue?.trim() ?? '';
        const serviceId = body.serviceId !== undefined ? +body.serviceId : +data.serviceId;
        if (issue) {
          const issueAllowed = await this.faultIssuesService.isIssueAllowedForService(
            serviceId,
            issue,
          );
          if (!issueAllowed) {
            return {
              ...errorCode.VALIDATION_ERROR,
              message: 'Selected issue is not valid for this service',
            };
          }
        }
        data.issue = issue;
        data.subject = issue;
      }
      if (body.message !== undefined)
        data.message = body.message;
      if (body.customerId !== undefined)
        data.customerId = body.customerId;
      if (body.customerName !== undefined)
        data.customerName = body.customerName;

      if (body.serviceId !== undefined)
        data.serviceId = body.serviceId;
      if (body.attachFiles !== undefined)
        data.attachFiles = body.attachFiles;
      if (body.priority !== undefined)
        data.priority = +body.priority === 1 ? 1 : 2;
      if (body.siteId !== undefined)
        data.siteId = body.siteId;
      if (body.serviceName != undefined)
        data.serviceName = body.serviceName;
      if (body.siteName != undefined)
        data.siteName = body.siteName;
      if (body.subject !== undefined)
        data.subject = body.subject;
      if (body.companyName !== undefined)
        data.companyName = body.companyName;
      if (body.toiletArea !== undefined) {
        const toiletArea = body.toiletArea?.trim() ?? '';
        const serviceName =
          body.serviceName !== undefined ? body.serviceName?.trim() ?? '' : data.serviceName;
        if (isPublicAmenitiesCleaningService(serviceName) && !toiletArea) {
          return { ...errorCode.VALIDATION_ERROR, message: 'Toilet is required' };
        }
        data.toiletArea = toiletArea || null;
      }
      data.updatedBy = userInfo.userId;
      data.updatedAt = new Date();
      const newItem = await this.reportFaultsRepository.update(+id, data);
      if (!newItem) {
        return errorCode.EXCEPTION;
      }
      await this.upsertAnswerForEdit(
        userInfo,
        data.id,
        body.message,
        body.attachFiles,
      );
      return errorCode.SUCCESS;
    } catch (error) {
      console.log("error", error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async removeAnswer(userInfo: IUserInfo, reportFaultId: number, answerId: number) {
    const data = await this.reportFaultsRepository.findOne({
      where: { id: reportFaultId },
    });
    if (!data || +data.status === reportFaultStatus.DELETED) {
      return errorCode.NOT_FOUND;
    }

    const answer = await this.reportFaultAnswersRepository.findOne({
      where: { id: answerId, reportFaultId },
    });
    if (!answer) {
      return errorCode.NOT_FOUND;
    }

    const userId = +userInfo.userId;
    const type = +userInfo.type;

    if (type === userType.STAFF && +data.staffId !== userId) {
      return {
        ...errorCode.CAN_NOT_DELETE,
        message: 'You can only delete your own report faults',
      };
    }
    if (
      type === userType.CUSTOMER &&
      !(await this.customerCanAccessFault(userInfo, data.customerId))
    ) {
      return {
        ...errorCode.CAN_NOT_DELETE,
        message: 'You can only delete your own report faults',
      };
    }

    if (type === userType.ADMIN) {
      if (+data.status === reportFaultStatus.DELETED) {
        await this.reportFaultAnswersRepository.delete({ reportFaultId });
        await this.reportFaultsRepository.delete(reportFaultId);
        return errorCode.SUCCESS;
      }
      data.status = reportFaultStatus.DELETED;
      data.updatedBy = userId;
      data.updatedAt = new Date();
      await this.reportFaultsRepository.save(data);
      return errorCode.SUCCESS;
    }

    if (type === userType.STAFF || type === userType.CUSTOMER) {
      await this.reportFaultAnswersRepository.delete(answerId);
      const remaining = await this.reportFaultAnswersRepository.count({
        where: { reportFaultId },
      });
      if (remaining === 0) {
        if (type === userType.CUSTOMER) {
          await this.hideFaultForCustomer(userInfo, reportFaultId);
        } else {
          data.status = reportFaultStatus.DELETED;
          data.updatedBy = userId;
          data.updatedAt = new Date();
          await this.reportFaultsRepository.save(data);
        }
      }
      return errorCode.SUCCESS;
    }

    return {
      ...errorCode.CAN_NOT_DELETE,
      message: 'You are not allowed to delete report faults',
    };
  }

  async remove(userInfo: IUserInfo, id: string, answerId?: string) {
    try {
      if (answerId) {
        return this.removeAnswer(userInfo, +id, +answerId);
      }

      const data = await this.reportFaultsRepository.findOne({ where: { id: +id } });
      if (!data) {
        return errorCode.NOT_FOUND;
      }

      const userId = +userInfo.userId;
      const type = +userInfo.type;

      if (type === userType.ADMIN) {
        if (+data.status === reportFaultStatus.DELETED) {
          await this.reportFaultAnswersRepository.delete({ reportFaultId: +id });
          await this.reportFaultsRepository.delete(+id);
          return errorCode.SUCCESS;
        }
        data.status = reportFaultStatus.DELETED;
        data.updatedBy = userId;
        data.updatedAt = new Date();
        await this.reportFaultsRepository.save(data);
        return errorCode.SUCCESS;
      }

      if (+data.status === reportFaultStatus.DELETED) {
        return errorCode.NOT_FOUND;
      }

      if (type === userType.STAFF) {
        if (+data.staffId !== userId) {
          return {
            ...errorCode.CAN_NOT_DELETE,
            message: 'You can only delete your own report faults',
          };
        }
        data.status = reportFaultStatus.DELETED;
        data.updatedBy = userId;
        data.updatedAt = new Date();
        await this.reportFaultsRepository.save(data);
        return errorCode.SUCCESS;
      }

      if (type === userType.CUSTOMER) {
        if (!(await this.customerCanAccessFault(userInfo, data.customerId))) {
          return {
            ...errorCode.CAN_NOT_DELETE,
            message: 'You can only remove faults you have access to',
          };
        }
        await this.hideFaultForCustomer(userInfo, +id);
        return errorCode.SUCCESS;
      }

      return {
        ...errorCode.CAN_NOT_DELETE,
        message: 'You are not allowed to delete report faults',
      };
    } catch (error) {
      console.log("error", error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async restoreFault(userInfo: IUserInfo, id: string) {
    try {
      if (+userInfo.type !== userType.ADMIN) {
        return errorCode.CAN_NOT_DELETE;
      }
      const data = await this.reportFaultsRepository.findOne({ where: { id: +id } });
      if (!data || +data.status !== reportFaultStatus.DELETED) {
        return errorCode.NOT_FOUND;
      }
      data.status = reportFaultStatus.NEW;
      data.updatedBy = +userInfo.userId;
      data.updatedAt = new Date();
      await this.reportFaultsRepository.save(data);
      return errorCode.SUCCESS;
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async purgeDeletedFaultsByIds(userInfo: IUserInfo, body: { ids?: number[] }) {
    try {
      if (+userInfo.type !== userType.ADMIN) {
        return errorCode.CAN_NOT_DELETE;
      }
      const ids = Array.from(
        new Set((body?.ids || []).map((n) => +n).filter((n) => Number.isFinite(n) && n > 0)),
      );
      if (!ids.length) {
        return { ...errorCode.SUCCESS, data: { clearedCount: 0 } };
      }
      const faults = await this.reportFaultsRepository
        .createQueryBuilder('f')
        .where('f.id IN (:...ids)', { ids })
        .andWhere('f.status = :deletedStatus', { deletedStatus: reportFaultStatus.DELETED })
        .getMany();
      let clearedCount = 0;
      for (const fault of faults) {
        await this.reportFaultAnswersRepository.delete({ reportFaultId: fault.id });
        await this.reportFaultsRepository.delete(fault.id);
        clearedCount += 1;
      }
      return { ...errorCode.SUCCESS, data: { clearedCount } };
    } catch (error) {
      this.logger.error((error as Error).message);
      return {
        ...errorCode.EXCEPTION,
        message: (error as Error).message || errorCode.EXCEPTION.message,
      };
    }
  }

  async setDelegation(userInfo: IUserInfo, faultId: number, body: SetFaultDelegationDto) {
    try {
      if (+userInfo.type !== userType.ADMIN && +userInfo.type !== userType.CUSTOMER) {
        return { ...errorCode.EXCEPTION, message: 'Admin or customer only' };
      }
      const fault = await this.reportFaultsRepository.findOne({ where: { id: faultId } });
      if (!fault) return errorCode.NOT_FOUND;
      if (+userInfo.type === userType.CUSTOMER) {
        if (!(await this.customerCanAccessFault(userInfo, fault.customerId))) {
          return errorCode.NOT_FOUND;
        }
      }
      const reassignmentBlocked = await this.assertDelegationReassignmentAllowed(userInfo, fault);
      if (reassignmentBlocked) return reassignmentBlocked;
      const delegatedToType = String(body.delegatedToType ?? '').trim().toLowerCase();
      if (
        +userInfo.type === userType.CUSTOMER &&
        (delegatedToType === 'staff' || delegatedToType === 'admin_personnel')
      ) {
        return {
          ...errorCode.VALIDATION_ERROR,
          message: 'Staff assignment is not available for customers',
        };
      }
      if (
        delegatedToType !== 'admin' &&
        delegatedToType !== 'personnel' &&
        delegatedToType !== 'staff' &&
        delegatedToType !== 'admin_personnel'
      ) {
        return { ...errorCode.VALIDATION_ERROR, message: 'Invalid delegation target' };
      }
      const untilRaw = body.delegatedUntil?.trim();
      if (!untilRaw) {
        return { ...errorCode.VALIDATION_ERROR, message: 'Act-by date is required' };
      }
      const delegatedUntil = new Date(untilRaw);
      if (Number.isNaN(delegatedUntil.getTime())) {
        return { ...errorCode.VALIDATION_ERROR, message: 'Invalid act-by date' };
      }
      const assignAt = new Date();
      if (delegatedUntil.getTime() <= assignAt.getTime()) {
        return {
          ...errorCode.VALIDATION_ERROR,
          message: 'Act-by date must be after the assignment time',
        };
      }
      const note = body.delegationNote?.trim() ?? '';

      await this.personnelFaultAccess.revokeAllTokensForFault(faultId);

      fault.delegatedToType = delegatedToType;
      fault.delegatedUntil = delegatedUntil;
      fault.delegationNote = note || null;
      fault.delegatedBy = +userInfo.userId;
      fault.delegatedAt = assignAt;
      fault.delegatedToPersonnelId = null;
      fault.delegatedToStaffId = null;
      fault.delegatedActedAt = null;
      fault.delegationViewedAt = null;
      if (+fault.status === reportFaultStatus.COMPLETED) {
        fault.status = reportFaultStatus.NEW;
      }
      fault.updatedBy = +userInfo.userId;
      fault.updatedAt = new Date();

      let personnel = null;
      let adminPersonnel = null;
      let staffUser = null;
      if (delegatedToType === 'personnel') {
        const personnelId = body.delegatedToPersonnelId != null ? +body.delegatedToPersonnelId : 0;
        if (!personnelId) {
          return { ...errorCode.VALIDATION_ERROR, message: 'Personnel is required' };
        }
        personnel = await this.customerPersonnelService.assertPersonnelBelongsToFaultCustomer(
          personnelId,
          fault.customerId,
        );
        if (!personnel) {
          return { ...errorCode.VALIDATION_ERROR, message: 'Personnel not found for this customer' };
        }
        fault.delegatedToPersonnelId = personnel.id;
      }

      if (delegatedToType === 'admin_personnel') {
        if (+userInfo.type !== userType.ADMIN) {
          return { ...errorCode.VALIDATION_ERROR, message: 'Admin personnel assignment is admin only' };
        }
        const personnelId = body.delegatedToStaffId != null ? +body.delegatedToStaffId : 0;
        if (!personnelId) {
          return { ...errorCode.VALIDATION_ERROR, message: 'Personnel is required' };
        }
        adminPersonnel = await this.adminPersonnelService.findActiveById(personnelId);
        if (!adminPersonnel) {
          return { ...errorCode.VALIDATION_ERROR, message: 'Personnel not found' };
        }
        fault.delegatedToStaffId = adminPersonnel.id;
      }

      if (delegatedToType === 'staff') {
        if (+userInfo.type !== userType.ADMIN) {
          return { ...errorCode.VALIDATION_ERROR, message: 'Staff assignment is admin only' };
        }
        const staffId = body.delegatedToStaffId != null ? +body.delegatedToStaffId : 0;
        if (!staffId) {
          return { ...errorCode.VALIDATION_ERROR, message: 'Staff is required' };
        }
        staffUser = await this.usersService.findStaffByIdForDelegation(staffId);
        if (!staffUser) {
          return { ...errorCode.VALIDATION_ERROR, message: 'Staff not found in Directory' };
        }
        fault.delegatedToStaffId = staffUser.id;
      }

      await this.reportFaultsRepository.save(fault);

      if (delegatedToType === 'personnel' && personnel) {
        const rawToken = await this.personnelFaultAccess.issueTokenForPersonnel(fault.id, personnel.id);
        const magicLink = this.personnelFaultAccess.buildMagicLinkUrl(rawToken);
        const assignerRows: { full_name: string }[] = await this.reportFaultsRepository.query(
          `SELECT full_name FROM users WHERE id = $1 LIMIT 1`,
          [+userInfo.userId],
        );
        void this.personnelFaultAccess.sendDelegationEmail({
          name: personnel.name,
          email: personnel.email,
          fault,
          magicLink,
          delegatedUntil,
          delegationNote: note,
          assignerName: assignerRows?.[0]?.full_name ?? '',
        });
      }

      if (delegatedToType === 'admin_personnel' && adminPersonnel) {
        const rawToken = await this.personnelFaultAccess.issueTokenForStaff(fault.id, adminPersonnel.id);
        const magicLink = this.personnelFaultAccess.buildMagicLinkUrl(rawToken);
        const assignerRows: { full_name: string }[] = await this.reportFaultsRepository.query(
          `SELECT full_name FROM users WHERE id = $1 LIMIT 1`,
          [+userInfo.userId],
        );
        void this.personnelFaultAccess.sendDelegationEmail({
          name: adminPersonnel.name,
          email: adminPersonnel.email,
          fault,
          magicLink,
          delegatedUntil,
          delegationNote: note,
          assignerName: assignerRows?.[0]?.full_name ?? '',
        });
      }

      if (delegatedToType === 'staff' && staffUser) {
        const assignerRows: { full_name: string }[] = await this.reportFaultsRepository.query(
          `SELECT full_name FROM users WHERE id = $1 LIMIT 1`,
          [+userInfo.userId],
        );
        void this.sendStaffMyTasksAssignmentEmail({
          name: staffUser.fullName,
          email: staffUser.email,
          fault,
          delegatedUntil,
          delegationNote: note,
          assignerName: assignerRows?.[0]?.full_name ?? '',
        });
      }

      if (
        delegatedToType === 'admin' &&
        +userInfo.type === userType.CUSTOMER
      ) {
        const assignerRows: { full_name: string }[] = await this.reportFaultsRepository.query(
          `SELECT full_name FROM users WHERE id = $1 LIMIT 1`,
          [+userInfo.userId],
        );
        void this.customerNotifications.notifyAdminsFaultDelegatedToProvider({
          faultId: fault.id,
          issue: fault.issue,
          siteName: fault.siteName,
          serviceName: fault.serviceName,
          priority: fault.priority,
          delegatedUntil,
          delegationNote: note,
          assignerName: assignerRows?.[0]?.full_name ?? '',
          customerName: fault.companyName || fault.customerName || '',
        });
      }

      return {
        ...errorCode.SUCCESS,
        data: await (async () => {
          const payload: Record<string, unknown> = {
            id: fault.id,
            delegatedToType: fault.delegatedToType,
            delegatedToPersonnelId: fault.delegatedToPersonnelId,
            delegatedToStaffId: fault.delegatedToStaffId,
            delegatedUntil: fault.delegatedUntil,
            delegationNote: fault.delegationNote,
            delegatedAt: fault.delegatedAt,
            delegatedBy: fault.delegatedBy,
            delegatedActedAt: fault.delegatedActedAt,
            delegationViewedAt: fault.delegationViewedAt,
            delegationOutcome: computeDelegationOutcome(fault),
          };
          const enrichedRow = this.mapAnswerToListRow(
            fault,
            this.syntheticAnswerFromFault(fault),
          );
          await this.enrichListRowsDelegationFromDb([enrichedRow], userInfo);
          payload.delegatedToType = enrichedRow.delegatedToType;
          payload.delegatedToPersonnelId = enrichedRow.delegatedToPersonnelId;
          payload.delegatedToStaffId = enrichedRow.delegatedToStaffId;
          payload.delegatedUntil = enrichedRow.delegatedUntil;
          payload.delegatedAt = enrichedRow.delegatedAt;
          payload.delegatedActedAt = enrichedRow.delegatedActedAt;
          payload.delegationViewedAt = enrichedRow.delegationViewedAt;
          payload.delegationOutcome = enrichedRow.delegationOutcome;
          payload.delegatedAssigneeName = enrichedRow.delegatedAssigneeName;
          payload.delegatedAssigneeRole = enrichedRow.delegatedAssigneeRole;
          return payload;
        })(),
      };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async completeFault(userInfo: IUserInfo, faultId: number) {
    try {
      if (+userInfo.type !== userType.ADMIN && +userInfo.type !== userType.CUSTOMER) {
        return { ...errorCode.EXCEPTION, message: 'Admin or customer only' };
      }
      const fault = await this.reportFaultsRepository.findOne({ where: { id: faultId } });
      if (!fault || +fault.status === reportFaultStatus.DELETED) {
        return errorCode.NOT_FOUND;
      }
      if (+userInfo.type === userType.CUSTOMER) {
        if (!(await this.customerCanAccessFault(userInfo, fault.customerId))) {
          return errorCode.NOT_FOUND;
        }
      }
      if (+fault.status === reportFaultStatus.COMPLETED) {
        return {
          ...errorCode.SUCCESS,
          data: {
            id: fault.id,
            status: fault.status,
            delegatedActedAt: fault.delegatedActedAt,
            delegationViewedAt: fault.delegationViewedAt,
            delegationOutcome: computeDelegationOutcome(fault),
          },
        };
      }
      const now = new Date();
      fault.status = reportFaultStatus.COMPLETED;
      fault.updatedAt = now;
      fault.updatedBy = +userInfo.userId;
      if (fault.delegatedToType && !fault.delegatedActedAt) {
        fault.delegatedActedAt = now;
      }
      await this.reportFaultsRepository.save(fault);
      return {
        ...errorCode.SUCCESS,
        data: {
          id: fault.id,
          status: fault.status,
          delegatedActedAt: fault.delegatedActedAt,
          delegationViewedAt: fault.delegationViewedAt,
          delegationOutcome: computeDelegationOutcome(fault),
        },
      };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async nudgeDelegationAssignee(userInfo: IUserInfo, faultId: number) {
    try {
      if (+userInfo.type !== userType.ADMIN && +userInfo.type !== userType.CUSTOMER) {
        return { ...errorCode.EXCEPTION, message: 'Admin or customer only' };
      }
      const fault = await this.reportFaultsRepository.findOne({ where: { id: faultId } });
      if (!fault || +fault.status === reportFaultStatus.DELETED) {
        return errorCode.NOT_FOUND;
      }
      if (+userInfo.type === userType.CUSTOMER) {
        if (!(await this.customerCanAccessFault(userInfo, fault.customerId))) {
          return errorCode.NOT_FOUND;
        }
      }
      const blocked = this.assertCanNudgeDelegation(userInfo, fault);
      if (blocked) return blocked;

      const assignerRows: { full_name: string }[] = await this.reportFaultsRepository.query(
        `SELECT full_name FROM users WHERE id = $1 LIMIT 1`,
        [+userInfo.userId],
      );
      const assignerName = assignerRows?.[0]?.full_name ?? '';

      const delegatedType = String(fault.delegatedToType ?? '').trim().toLowerCase();
      const delegatedUntil = fault.delegatedUntil ? new Date(fault.delegatedUntil) : null;
      if (!delegatedUntil || Number.isNaN(delegatedUntil.getTime())) {
        return { ...errorCode.VALIDATION_ERROR, message: 'Assignment has no act-by date' };
      }

      if (delegatedType === 'personnel') {
        const personnelId = fault.delegatedToPersonnelId ? +fault.delegatedToPersonnelId : 0;
        if (!personnelId) {
          return { ...errorCode.VALIDATION_ERROR, message: 'Personnel not found' };
        }
        const personnel = await this.customerPersonnelService.assertPersonnelBelongsToFaultCustomer(
          personnelId,
          fault.customerId,
        );
        if (!personnel?.email) {
          return { ...errorCode.VALIDATION_ERROR, message: 'Personnel has no email address' };
        }
        const rawToken = await this.personnelFaultAccess.issueTokenForPersonnel(fault.id, personnel.id);
        const magicLink = this.personnelFaultAccess.buildMagicLinkUrl(rawToken);
        await this.personnelFaultAccess.sendDelegationReminderEmail({
          name: personnel.name,
          email: personnel.email,
          fault,
          magicLink,
          delegatedUntil,
          delegationNote: fault.delegationNote ?? undefined,
          assignerName,
        });
      } else if (delegatedType === 'admin_personnel') {
        const personnelId = fault.delegatedToStaffId ? +fault.delegatedToStaffId : 0;
        if (!personnelId) {
          return { ...errorCode.VALIDATION_ERROR, message: 'Personnel not found' };
        }
        const adminPersonnel = await this.adminPersonnelService.findActiveById(personnelId);
        if (!adminPersonnel?.email) {
          return { ...errorCode.VALIDATION_ERROR, message: 'Personnel has no email address' };
        }
        const rawToken = await this.personnelFaultAccess.issueTokenForStaff(fault.id, adminPersonnel.id);
        const magicLink = this.personnelFaultAccess.buildMagicLinkUrl(rawToken);
        await this.personnelFaultAccess.sendDelegationReminderEmail({
          name: adminPersonnel.name,
          email: adminPersonnel.email,
          fault,
          magicLink,
          delegatedUntil,
          delegationNote: fault.delegationNote ?? undefined,
          assignerName,
        });
      } else if (delegatedType === 'staff') {
        const staffId = fault.delegatedToStaffId ? +fault.delegatedToStaffId : 0;
        if (!staffId) {
          return { ...errorCode.VALIDATION_ERROR, message: 'Staff not found' };
        }
        const staffUser = await this.usersService.findStaffByIdForDelegation(staffId);
        if (!staffUser?.email) {
          return { ...errorCode.VALIDATION_ERROR, message: 'Staff has no email address' };
        }
        await this.sendStaffMyTasksReminderEmail({
          name: staffUser.fullName,
          email: staffUser.email,
          fault,
          delegatedUntil,
          delegationNote: fault.delegationNote ?? undefined,
          assignerName,
        });
      } else {
        return { ...errorCode.VALIDATION_ERROR, message: 'This assignment cannot be reminded by email' };
      }

      return { ...errorCode.SUCCESS, data: { id: fault.id, reminded: true } };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async reopenFault(userInfo: IUserInfo, faultId: number) {
    try {
      if (+userInfo.type !== userType.ADMIN && +userInfo.type !== userType.CUSTOMER) {
        return { ...errorCode.EXCEPTION, message: 'Admin or customer only' };
      }
      const fault = await this.reportFaultsRepository.findOne({ where: { id: faultId } });
      if (!fault || +fault.status === reportFaultStatus.DELETED) {
        return errorCode.NOT_FOUND;
      }
      if (+userInfo.type === userType.CUSTOMER) {
        if (!(await this.customerCanAccessFault(userInfo, fault.customerId))) {
          return errorCode.NOT_FOUND;
        }
      }
      const now = new Date();
      fault.delegatedActedAt = null;
      if (+fault.status === reportFaultStatus.COMPLETED) {
        fault.status = reportFaultStatus.NEW;
      }
      fault.updatedAt = now;
      fault.updatedBy = +userInfo.userId;
      await this.reportFaultsRepository.save(fault);
      return {
        ...errorCode.SUCCESS,
        data: {
          id: fault.id,
          status: fault.status,
          delegatedActedAt: fault.delegatedActedAt,
          delegationViewedAt: fault.delegationViewedAt,
          delegationOutcome: computeDelegationOutcome(fault),
        },
      };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async changeStatus(userInfo: IUserInfo, body: ChangeStatusDto) {
    try {
      const data = await this.reportFaultsRepository.findOne({ where: { id: body.id } });
      if (!data) {
        return errorCode.NOT_FOUND;
      }
      const denied = await this.assertFaultAccess(userInfo, data, {
        allowStaffReporter: false,
      });
      if (denied) return denied;
      data.status = body.status
      data.updatedAt = new Date();
      data.updatedBy = userInfo.userId;
      if (
        +body.status === reportFaultStatus.COMPLETED &&
        data.delegatedToType &&
        !data.delegatedActedAt
      ) {
        data.delegatedActedAt = new Date();
      }
      await this.reportFaultsRepository.save(data);
      return errorCode.SUCCESS;
    } catch (error) {
      console.log("error", error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async count() {
    try {
      const count = await this.reportFaultsRepository.count();
      return { ...errorCode.SUCCESS, data: count };
    } catch (error) {
      console.log("error", error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  private nextSenderAfterComment(userTypeNum: number): number {
    if (userTypeNum === userType.CUSTOMER) {
      return reportFaultSender.ADMIN;
    }
    if (userTypeNum === userType.STAFF) {
      return reportFaultSender.CUSTOMER;
    }
    return reportFaultSender.CUSTOMER;
  }

  async createComment(userInfo: IUserInfo, body: CreateReportFaultAnswerDto) {
    try {
      const fault = await this.reportFaultsRepository.findOne({
        where: { id: body.reportFaultId },
      });
      if (!fault || +fault.status === reportFaultStatus.DELETED) {
        return errorCode.NOT_FOUND;
      }

      const actorType = +userInfo.type;

      if (actorType === userType.CUSTOMER || actorType === userType.ADMIN) {
        return {
          ...errorCode.VALIDATION_ERROR,
          message:
            'Please use Messages to communicate between customer and admin. Report fault comments are for staff only.',
        };
      }

      const currentSender = +fault.sender;

      if (actorType !== userType.STAFF) {
        return errorCode.CAN_NOT_DELETE;
      }
      if (+fault.staffId !== +userInfo.userId) {
        return errorCode.NOT_FOUND;
      }
      if (currentSender !== reportFaultSender.STAFF) {
        return {
          ...errorCode.VALIDATION_ERROR,
          message: 'This fault is waiting for the customer or admin, not staff',
        };
      }

      const reportFaultAnser = new ReportFaultAnswer();
      reportFaultAnser.attachFiles = body.attachFiles;
      reportFaultAnser.message = body.message;
      reportFaultAnser.createdAt = new Date();
      reportFaultAnser.updatedAt = new Date();
      reportFaultAnser.createdBy = +userInfo.userId;
      reportFaultAnser.updatedBy = +userInfo.userId;
      reportFaultAnser.userId = +userInfo.userId;
      reportFaultAnser.type = userInfo.type === 1 ? 1 : 2;
      reportFaultAnser.reportFaultId = body.reportFaultId;

      await this.reportFaultAnswersRepository.manager.transaction(async (manager) => {
        await manager.query(`LOCK TABLE public.report_fault_answers IN EXCLUSIVE MODE`);
        reportFaultAnser.id = await this.nextTableId(manager, 'report_fault_answers');
        await manager.save(ReportFaultAnswer, reportFaultAnser);
      });

      const nextSender = this.nextSenderAfterComment(actorType);
      const faultUpdate: Partial<ReportFault> = {
        sender: nextSender,
        updatedAt: new Date(),
        updatedBy: +userInfo.userId,
      };
      await this.reportFaultsRepository.update(body.reportFaultId, faultUpdate);
      await this.reportFaultsRepository.query(
        `UPDATE public.report_fault_customer_visibility
         SET opened_at = NULL
         WHERE report_fault_id = $1 AND opened_at IS NOT NULL`,
        [body.reportFaultId],
      );
      return errorCode.SUCCESS;
    } catch (error) {
      const err = error as Error;
      return { ...errorCode.EXCEPTION, message: err?.message || errorCode.EXCEPTION.message };
    }
  }
  async updateComment(userInfo: IUserInfo, id: number, body: UpdateReportFaultAnswerDto) {
    try {
      const reportFaultAnser = await this.reportFaultAnswersRepository.findOne({ where: { id } });
      if (!reportFaultAnser)
        return errorCode.NOT_FOUND;
      const fault = await this.reportFaultsRepository.findOne({
        where: { id: reportFaultAnser.reportFaultId },
      });
      const denied = await this.assertFaultAccess(userInfo, fault, {
        allowAdmin: false,
        allowCustomer: false,
      });
      if (denied) return denied;
      if (+reportFaultAnser.createdBy !== +userInfo.userId) {
        return { ...errorCode.CAN_NOT_DELETE, message: 'You can only edit your own comments' };
      }
      reportFaultAnser.attachFiles = body.attachFiles;
      reportFaultAnser.message = body.message;
      reportFaultAnser.createdAt = new Date();
      reportFaultAnser.updatedAt = new Date();
      reportFaultAnser.createdBy = userInfo.userId;
      reportFaultAnser.updatedBy = userInfo.userId;
      await this.reportFaultAnswersRepository.save(reportFaultAnser);
      return errorCode.SUCCESS
    } catch (error) {
      return errorCode.EXCEPTION;
    }
  }

  async deleteComment(userInfo: IUserInfo, id: number) {
    try {
      const reportFaultAnser = await this.reportFaultAnswersRepository.findOne({ where: { id } });
      if (!reportFaultAnser) {
        return errorCode.NOT_FOUND;
      }
      const fault = await this.reportFaultsRepository.findOne({
        where: { id: reportFaultAnser.reportFaultId },
      });
      const denied = await this.assertFaultAccess(userInfo, fault, {
        allowAdmin: false,
        allowCustomer: false,
      });
      if (denied) return denied;
      if (+reportFaultAnser.createdBy !== +userInfo.userId) {
        return { ...errorCode.CAN_NOT_DELETE, message: 'You can only delete your own comments' };
      }
      await this.reportFaultAnswersRepository.delete(reportFaultAnser);
      return errorCode.SUCCESS
    } catch (error) {
      return errorCode.EXCEPTION;
    }
  }

  async markAdminOpened(userInfo: IUserInfo, id: number) {
    try {
      if (+userInfo.type !== userType.ADMIN) {
        return errorCode.CAN_NOT_DELETE;
      }
      const data = await this.reportFaultsRepository.findOne({ where: { id } });
      if (!data || +data.status === reportFaultStatus.DELETED) {
        return errorCode.NOT_FOUND;
      }
      if (!data.adminOpenedAt) {
        data.adminOpenedAt = new Date();
        data.updatedAt = new Date();
        if (
          data.delegatedToType === 'admin' &&
          data.delegatedUntil &&
          !data.delegatedActedAt
        ) {
          data.delegatedActedAt = new Date();
        }
        await this.reportFaultsRepository.save(data);
      }
      await this.reportFaultsRepository.query(
        `
        INSERT INTO public.report_fault_admin_visibility (report_fault_id, user_id, badge_dismissed_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (report_fault_id, user_id) DO UPDATE
        SET badge_dismissed_at = COALESCE(
          public.report_fault_admin_visibility.badge_dismissed_at,
          EXCLUDED.badge_dismissed_at
        )
        `,
        [+id, +userInfo.userId],
      );
      return errorCode.SUCCESS;
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async markCustomerOpened(userInfo: IUserInfo, id: number) {
    try {
      if (+userInfo.type !== userType.CUSTOMER) {
        return errorCode.CAN_NOT_DELETE;
      }
      const data = await this.reportFaultsRepository.findOne({ where: { id } });
      if (!data || +data.status === reportFaultStatus.DELETED) {
        return errorCode.NOT_FOUND;
      }
      if (!(await this.customerCanAccessFault(userInfo, data.customerId))) {
        return errorCode.NOT_FOUND;
      }
      await this.setCustomerFaultOpened(+userInfo.userId, +id);
      return errorCode.SUCCESS;
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async markAdminUnread(userInfo: IUserInfo, id: number) {
    try {
      if (+userInfo.type !== userType.ADMIN) {
        return errorCode.CAN_NOT_DELETE;
      }
      const data = await this.reportFaultsRepository.findOne({ where: { id } });
      if (!data || +data.status === reportFaultStatus.DELETED) {
        return errorCode.NOT_FOUND;
      }
      await this.reportFaultsRepository.update(+id, {
        adminOpenedAt: null,
        updatedAt: new Date(),
      });
      return errorCode.SUCCESS;
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async markCustomerUnread(userInfo: IUserInfo, id: number) {
    try {
      if (+userInfo.type !== userType.CUSTOMER) {
        return errorCode.CAN_NOT_DELETE;
      }
      const data = await this.reportFaultsRepository.findOne({ where: { id } });
      if (!data || +data.status === reportFaultStatus.DELETED) {
        return errorCode.NOT_FOUND;
      }
      if (!(await this.customerCanAccessFault(userInfo, data.customerId))) {
        return errorCode.NOT_FOUND;
      }
      await this.clearCustomerFaultOpened(+userInfo.userId, +id);
      return errorCode.SUCCESS;
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  /** Clear dashboard faults badge when admin opens the Report Faults page (per login). */
  async markAllReportFaultsOpenedForAdmin(userInfo: IUserInfo) {
    try {
      if (+userInfo.type !== userType.ADMIN) {
        return errorCode.CAN_NOT_DELETE;
      }
      const deletedStatus = reportFaultStatus.DELETED;
      const viewerId = +userInfo.userId;
      await this.reportFaultsRepository.query(
        `
        INSERT INTO public.report_fault_admin_visibility (report_fault_id, user_id, badge_dismissed_at)
        SELECT rf.id, $1, NOW()
        FROM public.report_faults rf
        WHERE rf.status != $2
          AND rf.staff_id > 0
          AND NOT EXISTS (
            SELECT 1 FROM public.report_fault_admin_visibility v
            WHERE v.report_fault_id = rf.id
              AND v.user_id = $1
              AND v.badge_dismissed_at IS NOT NULL
          )
        ON CONFLICT (report_fault_id, user_id) DO UPDATE
        SET badge_dismissed_at = COALESCE(
          public.report_fault_admin_visibility.badge_dismissed_at,
          EXCLUDED.badge_dismissed_at
        )
        `,
        [viewerId, deletedStatus],
      );
      return errorCode.SUCCESS;
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  /** Clear dashboard faults badge when customer opens the Report Faults page (per login). */
  async markAllReportFaultsOpenedForCustomer(userInfo: IUserInfo) {
    try {
      if (+userInfo.type !== userType.CUSTOMER) {
        return errorCode.CAN_NOT_DELETE;
      }
      const deletedStatus = reportFaultStatus.DELETED;
      const viewerId = +userInfo.userId;
      await this.reportFaultsRepository.query(
        `
        INSERT INTO public.report_fault_customer_visibility (report_fault_id, user_id, badge_dismissed_at)
        SELECT rf.id, $1, NOW()
        FROM public.report_faults rf
        WHERE rf.status != $2
          AND rf.staff_id > 0
          AND (
            rf.customer_id = $1
            OR rf.customer_id IN (
              SELECT c.user_id FROM customers c
              INNER JOIN customers me ON me.user_id = $1
              WHERE me.company_id IS NOT NULL AND c.company_id = me.company_id
            )
            OR rf.customer_id IN (
              SELECT c.user_id FROM customers c
              INNER JOIN customers me ON me.user_id = $1
              WHERE me.company_id IS NULL
                AND TRIM(COALESCE(me.company_name, '')) <> ''
                AND LOWER(TRIM(c.company_name)) = LOWER(TRIM(me.company_name))
            )
          )
          AND NOT EXISTS (
            SELECT 1 FROM public.report_fault_customer_visibility v
            WHERE v.report_fault_id = rf.id
              AND v.user_id = $1
              AND v.badge_dismissed_at IS NOT NULL
          )
          AND NOT EXISTS (
            SELECT 1 FROM public.report_fault_customer_visibility v
            WHERE v.report_fault_id = rf.id
              AND v.user_id = $1
              AND v.hidden_at IS NOT NULL
          )
        ON CONFLICT (report_fault_id, user_id) DO UPDATE
        SET badge_dismissed_at = COALESCE(
          public.report_fault_customer_visibility.badge_dismissed_at,
          EXCLUDED.badge_dismissed_at
        ),
        opened_at = public.report_fault_customer_visibility.opened_at
        `,
        [viewerId, deletedStatus],
      );
      return errorCode.SUCCESS;
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async dashboard(userInfo: IUserInfo) {
    try {
      let rows = [];
      const deletedStatus = reportFaultStatus.DELETED;
      if (userInfo.type === 3) {
        rows = await this.reportFaultsRepository.query(
          `SELECT count(*)::int AS count FROM report_faults rf
           WHERE rf.status != $1
             AND rf.staff_id > 0
             AND NOT EXISTS (
               SELECT 1 FROM public.report_fault_admin_visibility v
               WHERE v.report_fault_id = rf.id
                 AND v.user_id = $2
                 AND v.badge_dismissed_at IS NOT NULL
             )`,
          [deletedStatus, +userInfo.userId],
        );
      } else if (userInfo.type === 1) {
        rows = await this.reportFaultsRepository.query(
          `SELECT count(*)::int AS count FROM report_faults rf
           WHERE (
             rf.customer_id = $1
             OR rf.customer_id IN (
               SELECT c.user_id FROM customers c
               INNER JOIN customers me ON me.user_id = $1
               WHERE me.company_id IS NOT NULL AND c.company_id = me.company_id
             )
             OR rf.customer_id IN (
               SELECT c.user_id FROM customers c
               INNER JOIN customers me ON me.user_id = $1
               WHERE me.company_id IS NULL
                 AND TRIM(COALESCE(me.company_name, '')) <> ''
                 AND LOWER(TRIM(c.company_name)) = LOWER(TRIM(me.company_name))
             )
           )
             AND rf.status != $2
             AND rf.staff_id > 0
             AND NOT EXISTS (
               SELECT 1 FROM public.report_fault_customer_visibility v
               WHERE v.report_fault_id = rf.id
                 AND v.user_id = $1
                 AND v.hidden_at IS NOT NULL
             )
             AND NOT EXISTS (
               SELECT 1 FROM public.report_fault_customer_visibility v
               WHERE v.report_fault_id = rf.id
                 AND v.user_id = $1
                 AND (v.opened_at IS NOT NULL OR v.badge_dismissed_at IS NOT NULL)
             )`,
          [userInfo.userId, deletedStatus],
        );
      } else if (userInfo.type === 2) {
        rows = await this.reportFaultsRepository.query(
          `select count(*) as count from report_faults where staff_id=$1 and status != $2`,
          [userInfo.userId, deletedStatus],
        );
      }
      return { ...errorCode.SUCCESS, data: rows };
    } catch (error) {
      console.log('error', error);
      return errorCode.EXCEPTION;
    }
  }

  private mapFaultToMyTaskRow(fault: ReportFault) {
    return {
      id: fault.id,
      reportFaultId: fault.id,
      siteName: fault.siteName,
      serviceName: fault.serviceName,
      issue: fault.issue || fault.subject,
      message: fault.message,
      priority: fault.priority,
      status: fault.status,
      delegatedToType: fault.delegatedToType,
      delegatedToStaffId: fault.delegatedToStaffId,
      delegatedUntil: fault.delegatedUntil,
      delegatedAt: fault.delegatedAt,
      delegationNote: fault.delegationNote,
      delegatedActedAt: fault.delegatedActedAt,
      delegationViewedAt: fault.delegationViewedAt,
      delegationOutcome: computeDelegationOutcome(fault),
      createdAt: fault.createdAt,
      attachFiles: fault.attachFiles,
      companyName: fault.companyName,
      customerName: fault.customerName,
      toiletArea: fault.toiletArea ?? null,
    };
  }

  private async sendStaffMyTasksAssignmentEmail(opts: {
    name: string;
    email: string;
    fault: ReportFault;
    delegatedUntil: Date;
    delegationNote?: string;
    assignerName?: string;
  }): Promise<void> {
    if (!isMailConfigured()) {
      this.logger.warn('Staff assignment email skipped: mail not configured');
      return;
    }
    const until = opts.delegatedUntil.toLocaleString('en-AU', {
      timeZone: 'Australia/Sydney',
      dateStyle: 'short',
      timeStyle: 'short',
    });
    const urgent = +opts.fault.priority === 1;
    const myTasksUrl = emailMyTasksUrl();
    const html = [
      `<p>Hello ${opts.name},</p>`,
      `<p>You have been assigned an <strong>${urgent ? 'urgent fault' : 'fault report'}</strong> on Service360.</p>`,
      `<p><strong>Site:</strong> ${opts.fault.siteName || '—'}</p>`,
      `<p><strong>Issue:</strong> ${opts.fault.issue || opts.fault.subject || '—'}</p>`,
      `<p><strong>Act by:</strong> ${until}</p>`,
      opts.delegationNote ? `<p><strong>Note:</strong> ${opts.delegationNote}</p>` : '',
      opts.assignerName ? `<p><strong>Assigned by:</strong> ${opts.assignerName}</p>` : '',
      `<p>Sign in and open <strong>My tasks</strong> on your dashboard to view and confirm this assignment.</p>`,
      `<p>${emailLinkHtml(myTasksUrl, 'Open My tasks')}</p>`,
      emailSupportFooterHtml(),
    ]
      .filter(Boolean)
      .join('\n');
    const ok = await SendMail(
      opts.email,
      urgent
        ? 'Service360 — Urgent fault assigned (My tasks)'
        : 'Service360 — Fault assigned (My tasks)',
      html,
    );
    if (!ok) {
      this.logger.warn(`Staff My tasks assignment email failed for ${opts.email}`);
    }
  }

  private async sendStaffMyTasksReminderEmail(opts: {
    name: string;
    email: string;
    fault: ReportFault;
    delegatedUntil: Date;
    delegationNote?: string;
    assignerName?: string;
  }): Promise<void> {
    if (!isMailConfigured()) {
      this.logger.warn('Staff assignment reminder skipped: mail not configured');
      return;
    }
    const until = opts.delegatedUntil.toLocaleString('en-AU', {
      timeZone: 'Australia/Sydney',
      dateStyle: 'short',
      timeStyle: 'short',
    });
    const urgent = +opts.fault.priority === 1;
    const myTasksUrl = emailMyTasksUrl();
    const html = [
      `<p>Hello ${opts.name},</p>`,
      `<p>This is a <strong>reminder</strong> to complete your assigned <strong>${urgent ? 'urgent fault' : 'fault report'}</strong> on Service360.</p>`,
      `<p><strong>Site:</strong> ${opts.fault.siteName || '—'}</p>`,
      `<p><strong>Issue:</strong> ${opts.fault.issue || opts.fault.subject || '—'}</p>`,
      `<p><strong>Act by:</strong> ${until}</p>`,
      opts.delegationNote ? `<p><strong>Note:</strong> ${opts.delegationNote}</p>` : '',
      `<p>Sign in and open <strong>My tasks</strong> on your dashboard to view and confirm this assignment.</p>`,
      `<p>${emailLinkHtml(myTasksUrl, 'Open My tasks')}</p>`,
      emailSupportFooterHtml(),
    ]
      .filter(Boolean)
      .join('\n');
    const ok = await SendMail(
      opts.email,
      urgent
        ? 'Service360 — Reminder: urgent fault awaiting action (My tasks)'
        : 'Service360 — Reminder: fault awaiting action (My tasks)',
      html,
    );
    if (!ok) {
      this.logger.warn(`Staff My tasks reminder email failed for ${opts.email}`);
    }
  }

  private staffAssigneeFaultOrNull(fault: ReportFault | null, userInfo: IUserInfo) {
    if (!fault || +userInfo.type !== userType.STAFF) return null;
    if (fault.delegatedToType !== 'staff') return null;
    if (+fault.delegatedToStaffId !== +userInfo.userId) return null;
    return fault;
  }

  async countStaffMyTasks(userInfo: IUserInfo) {
    try {
      if (+userInfo.type !== userType.STAFF) {
        return { ...errorCode.SUCCESS, data: 0 };
      }
      const rows = await this.reportFaultsRepository.query(
        `SELECT count(*)::int AS count FROM report_faults rf
         WHERE rf.delegated_to_type = 'staff'
           AND rf.delegated_to_staff_id = $1
           AND rf.status NOT IN ($2, $3)
           AND rf.delegated_acted_at IS NULL`,
        [
          +userInfo.userId,
          reportFaultStatus.DELETED,
          reportFaultStatus.COMPLETED,
        ],
      );
      const count = rows?.[0]?.count ?? 0;
      return { ...errorCode.SUCCESS, data: +count };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async findMyTasksForStaff(userInfo: IUserInfo) {
    try {
      if (+userInfo.type !== userType.STAFF) {
        return { ...errorCode.EXCEPTION, message: 'Staff only' };
      }
      const faults = await this.reportFaultsRepository
        .createQueryBuilder('f')
        .where(`f.delegated_to_type = 'staff'`)
        .andWhere('f.delegated_to_staff_id = :staffId', { staffId: +userInfo.userId })
        .andWhere('f.status NOT IN (:...excluded)', {
          excluded: [reportFaultStatus.DELETED, reportFaultStatus.COMPLETED],
        })
        .andWhere('f.delegated_acted_at IS NULL')
        .orderBy('f.delegated_until', 'ASC', 'NULLS LAST')
        .addOrderBy('f.delegated_at', 'DESC')
        .getMany();
      return {
        ...errorCode.SUCCESS,
        data: faults.map((f) => this.mapFaultToMyTaskRow(f)),
      };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async markStaffAssignmentViewed(userInfo: IUserInfo, faultId: number) {
    try {
      const fault = await this.reportFaultsRepository.findOne({ where: { id: faultId } });
      if (!this.staffAssigneeFaultOrNull(fault, userInfo)) {
        return errorCode.NOT_FOUND;
      }
      if (!fault.delegationViewedAt) {
        fault.delegationViewedAt = new Date();
        fault.updatedAt = new Date();
        await this.reportFaultsRepository.save(fault);
      }
      return {
        ...errorCode.SUCCESS,
        data: {
          id: fault.id,
          delegationViewedAt: fault.delegationViewedAt,
          delegationOutcome: computeDelegationOutcome(fault),
        },
      };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async markStaffAssignmentActed(userInfo: IUserInfo, faultId: number) {
    try {
      const fault = await this.reportFaultsRepository.findOne({ where: { id: faultId } });
      if (!this.staffAssigneeFaultOrNull(fault, userInfo)) {
        return errorCode.NOT_FOUND;
      }
      const now = new Date();
      if (!fault.delegationViewedAt) {
        fault.delegationViewedAt = now;
      }
      if (!fault.delegatedActedAt) {
        fault.delegatedActedAt = now;
      }
      fault.updatedAt = now;
      await this.reportFaultsRepository.save(fault);
      return {
        ...errorCode.SUCCESS,
        data: {
          id: fault.id,
          delegatedActedAt: fault.delegatedActedAt,
          delegationViewedAt: fault.delegationViewedAt,
          delegationOutcome: computeDelegationOutcome(fault),
        },
      };
    } catch (error) {
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

}
