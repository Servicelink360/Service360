


import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { IUserInfo } from '../interfaces/IUserInfo';
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
      INSERT INTO public.report_fault_customer_visibility (report_fault_id, user_id, opened_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (report_fault_id, user_id) DO UPDATE
      SET opened_at = COALESCE(public.report_fault_customer_visibility.opened_at, NOW())
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
  ) { }

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

  async create(userInfo: IUserInfo, body: CreateReportFaultDto) {
    try {
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
      reportFault.status = reportFaultStatus.PENDING;
      reportFault.createdBy = +userInfo.userId;
      reportFault.updatedBy = +userInfo.userId;
      reportFault.createdAt = new Date();
      reportFault.updatedAt = new Date();
      reportFault.sender = reportFaultSender.CUSTOMER;

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

      if (+userInfo.type !== userType.CUSTOMER && reportFault.customerId) {
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
    if (userInfo.type === userType.STAFF && +fault.staffId !== +userInfo.userId) {
      return { ...errorCode.SUCCESS, data: { count: 0, rows: [] } };
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
    if (body.startDate && body.endDate) {
      q.andWhere('f.created_at > :startDate AND f.created_at < :endDate', {
        startDate: moment(body.startDate).format('YYYY-MM-DD 00:00:00'),
        endDate: moment(body.endDate).format('YYYY-MM-DD 23:59:59'),
      });
    }

    const orphans = await q.getMany();
    for (const fault of orphans) {
      if (!existingIds.has(fault.id)) {
        rows.push(this.mapAnswerToListRow(fault, this.syntheticAnswerFromFault(fault)));
      }
    }

    const orderDir = body.orderValue && body.orderValue === 'ASC' ? 1 : -1;
    rows.sort(
      (a, b) =>
        orderDir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    );
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
      staffId: fault.staffId,
      customerId: fault.customerId,
      sender: fault.sender,
      siteId: fault.siteId,
      serviceId: fault.serviceId,
      adminOpenedAt: fault.adminOpenedAt,
      customerOpenedAt: fault.customerOpenedAt,
    };
  }

  /**
   * Admin Deleted tab: one list row per soft-deleted fault (not per answer).
   * Avoids mismatched counts and active faults appearing beside orphan rows.
   */
  private async findDeletedFaultsForAdmin(body: GetReportFaultsDto) {
    const orderDir =
      body.orderValue && body.orderValue === 'ASC' ? 'ASC' : 'DESC';
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

    q.orderBy('f.createdAt', orderDir);

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
        return this.findDeletedFaultsForAdmin(body);
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

      const orderDir =
        body.orderValue && body.orderValue === 'ASC' ? 'ASC' : 'DESC';
      query.orderBy('answer.createdAt', orderDir);

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

  async update(userInfo: IUserInfo, id: string, body: UpdateReportFaultDto) {
    try {
      const data = await this.reportFaultsRepository.findOne({ where: { id: +id } });
      if (!data) {
        return errorCode.NOT_FOUND;
      }
      if (body.subject !== undefined)
        data.subject = body.subject;
      if (body.issue !== undefined)
        data.issue = body.issue?.trim() ?? '';
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
        data.priority = body.priority;
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

  async changeStatus(userInfo: IUserInfo, body: ChangeStatusDto) {
    try {
      const data = await this.reportFaultsRepository.findOne({ where: { id: body.id } });
      if (!data) {
        return errorCode.NOT_FOUND;
      }
      data.status = body.status
      data.updatedAt = new Date();
      data.updatedBy = userInfo.userId;
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
        return errorCode.NOT_FOUND
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
      if (reportFaultAnser)
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
        await this.reportFaultsRepository.save(data);
      }
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
                 AND v.opened_at IS NOT NULL
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

}
