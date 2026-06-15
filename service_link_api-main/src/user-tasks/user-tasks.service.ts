import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { CheckInDto } from './dto/check-in-user-task.dto';
import { ReportUserTaskDto, UserTaskItemDto } from './dto/report-user-task.dto';
import { UserTask } from './entities/user-task.entity';
import { EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { errorCode } from '../constants/errorCode';
import { IUserInfo } from '../interfaces/IUserInfo';
import * as moment from 'moment';
import { dJobStatus } from '../constants/status';
import { GetUserTaskDto } from './dto/get-user-tasks.dto';
import { GetUserTasksByUserDto } from './dto/get-user-tasks-by-user.dto';
import { ClearDeletedReportsDto } from './dto/clear-deleted-reports.dto';
import { Logger } from 'winston';
import { SitesService } from '../sites/sites.service';
import { convertHtmlToPdf } from '../helpers/util';
import config from '../config';
import { userType } from '../constants/user';
import { CreateUserTaskDto } from './dto/create-user-task.dto';
import { SendMail } from '../helpers/sendEmail';
import { emailTaskAssignedHtml } from '../helpers/emailContent';
import { UsersService } from '../users/users.service';
import { CustomerNotificationsService } from '../users/customer-notifications.service';
import { UpdateUserTaskDto } from './dto/update-user-task.dto';
import { UserTaskReport } from './entities/user-task-report.entity';
import { CreateCustomReportsDto } from './dto/create-custom-reports.dto';
import { buildExceptionResult } from '../helpers/serialize-error-for-client';
import {
  expandReportItemsForStorage,
  mergeChunkedReportItems,
  ReportItemInput,
} from './user-task-report-value.util';
import {
  applyCustomerScopeToQuery,
  customerCanAccessCustomerId,
  customerScopeParams,
  customerScopeSql,
} from '../helpers/customer-scope';
import { Customer } from '../users/entities/customer.entity';

@Injectable()
export class UserTasksService {

  constructor(
    @InjectRepository(UserTask) private readonly userTasksRepository: Repository<UserTask>,
    @InjectRepository(UserTaskReport) private readonly uerTaskReportsRepository: Repository<UserTaskReport>,
    @Inject(forwardRef(() => SitesService)) private readonly sitesService: SitesService,
    @Inject('winston') private readonly logger: Logger,
    @Inject(forwardRef(() => UsersService)) private readonly uersService: UsersService,
    private readonly customerNotifications: CustomerNotificationsService,
  ) { }

  private maybeNotifyNewReportEmail(
    userInfo: IUserInfo,
    task: {
      id: number;
      customerId?: number | null;
      taskName?: string;
      siteName?: string;
      serviceName?: string;
    },
  ): void {
    void this.customerNotifications.notifyAdminsNewReportAvailable({
      userTaskId: task.id,
      taskName: task.taskName || '',
      siteName: task.siteName || '',
      serviceName: task.serviceName || '',
      createdByUserId: +userInfo.userId,
    });
    if (+userInfo.type === userType.CUSTOMER || !task.customerId) return;
    void this.customerNotifications.notifyNewReportAvailable({
      userTaskId: task.id,
      customerId: +task.customerId,
      taskName: task.taskName || '',
      siteName: task.siteName || '',
      serviceName: task.serviceName || '',
      createdByUserId: +userInfo.userId,
    });
  }

  private mergeChunkedReportsOnTask(task: UserTask | null | undefined): void {
    if (!task?.reports?.length) return;
    task.reports = mergeChunkedReportItems(
      [...task.reports].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    );
  }

  /** Staff new-reports: hide admin-portal submissions that only share site staffId. */
  private applyStaffSelfSubmittedCustomFilter(
    query: import('typeorm').SelectQueryBuilder<UserTask>,
    userInfo: IUserInfo,
  ): void {
    if (+userInfo.type !== userType.STAFF) return;
    query.andWhere('usertasks.createdBy = usertasks.staffId');
  }

  private isStaffOwnCustomReport(row: UserTask, userId: number): boolean {
    return row.type === 'CUSTOM' && +row.staffId === userId && +row.createdBy === userId;
  }

  /** Customer may soft-delete/restore only their own custom reports (not company peers'). */
  private isCustomerOwnCustomReport(row: UserTask, userId: number): boolean {
    return (
      row.type === 'CUSTOM' &&
      (+row.customerId === userId || +row.createdBy === userId)
    );
  }

  private customerRepo() {
    return this.userTasksRepository.manager.getRepository(Customer);
  }

  private async customerCanAccessReport(
    userInfo: IUserInfo,
    recordCustomerId: number,
  ): Promise<boolean> {
    return customerCanAccessCustomerId(
      this.customerRepo(),
      +userInfo.userId,
      +recordCustomerId,
    );
  }

  /** Not removed from this customer's list (hidden_at set on visibility row). */
  private notHiddenForCustomerSql(alias = 'usertasks') {
    return `NOT EXISTS (
      SELECT 1 FROM public.user_task_customer_visibility v
      WHERE v.user_task_id = ${alias}.id
        AND v.user_id = :customerViewerId
        AND v.hidden_at IS NOT NULL
    )`;
  }

  private applyCustomerPerUserHiddenFilter(
    query: SelectQueryBuilder<UserTask>,
    userInfo: IUserInfo,
  ) {
    if (+userInfo.type === userType.CUSTOMER) {
      query.andWhere(this.notHiddenForCustomerSql('usertasks'), {
        customerViewerId: +userInfo.userId,
      });
    }
  }

  /** Customer Deleted tab: reports this login removed (hidden_at set). */
  private hiddenOnlyForCustomerSql(alias = 'usertasks') {
    return `EXISTS (
      SELECT 1 FROM public.user_task_customer_visibility v
      WHERE v.user_task_id = ${alias}.id
        AND v.user_id = :customerViewerId
        AND v.hidden_at IS NOT NULL
        AND v.cleared_at IS NULL
    )`;
  }

  private applyCustomerDeletedOnlyFilter(
    query: SelectQueryBuilder<UserTask>,
    userInfo: IUserInfo,
  ) {
    if (+userInfo.type === userType.CUSTOMER) {
      query.andWhere(this.hiddenOnlyForCustomerSql('usertasks'), {
        customerViewerId: +userInfo.userId,
      });
    }
  }

  /** Dashboard badge count (clears when customer opens New Reports page; separate from list read). */
  private notBadgeDismissedForCustomerSql(alias = 'usertasks') {
    return `NOT EXISTS (
      SELECT 1 FROM public.user_task_customer_visibility v
      WHERE v.user_task_id = ${alias}.id
        AND v.user_id = :badgeViewerId
        AND v.badge_dismissed_at IS NOT NULL
    )`;
  }

  private applyCustomerBadgeCountFilter(
    query: SelectQueryBuilder<UserTask>,
    userInfo: IUserInfo,
  ) {
    if (+userInfo.type === userType.CUSTOMER) {
      query.andWhere(this.notBadgeDismissedForCustomerSql('usertasks'), {
        badgeViewerId: +userInfo.userId,
      });
    }
  }

  private async setCustomerTaskOpened(viewerId: number, taskId: number) {
    await this.userTasksRepository.query(
      `
      INSERT INTO public.user_task_customer_visibility (user_task_id, user_id, opened_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (user_task_id, user_id) DO UPDATE
      SET opened_at = COALESCE(public.user_task_customer_visibility.opened_at, NOW())
      `,
      [taskId, viewerId],
    );
  }

  private async clearCustomerTaskOpened(viewerId: number, taskId: number) {
    await this.userTasksRepository.query(
      `
      INSERT INTO public.user_task_customer_visibility (user_task_id, user_id, opened_at)
      VALUES ($1, $2, NULL)
      ON CONFLICT (user_task_id, user_id) DO UPDATE
      SET opened_at = NULL
      `,
      [taskId, viewerId],
    );
  }

  /**
   * List read/unread: per-login opened_at, falling back to legacy customer_opened_at on the row.
   * (Legacy column = historical read; visibility-only badge rows must not block that.)
   */
  private async applyCustomerOpenedStateToTasks(
    rows: UserTask[],
    viewerId: number,
  ): Promise<void> {
    if (!rows?.length) {
      return;
    }
    const ids = rows.map((r) => r.id);
    const effective: Array<{ id: number; opened_at: Date | null }> =
      await this.userTasksRepository.query(
        `SELECT ut.id,
                COALESCE(v.opened_at, ut.customer_opened_at) AS opened_at
         FROM public.user_tasks ut
         LEFT JOIN public.user_task_customer_visibility v
           ON v.user_task_id = ut.id AND v.user_id = $1
         WHERE ut.id = ANY($2::int[])`,
        [viewerId, ids],
      );
    const byTask = new Map(
      effective.map((r) => [Number(r.id), r.opened_at]),
    );
    for (const row of rows) {
      row.customerOpenedAt = byTask.get(row.id) ?? null;
    }
  }

  /** Dashboard New Report badge: dismissed only for this admin login. */
  private notBadgeDismissedForAdminSql(alias = 'usertasks') {
    return `NOT EXISTS (
      SELECT 1 FROM public.user_task_admin_visibility v
      WHERE v.user_task_id = ${alias}.id
        AND v.user_id = :adminBadgeViewerId
        AND v.badge_dismissed_at IS NOT NULL
    )`;
  }

  private applyAdminBadgeNotDismissedFilter(
    query: SelectQueryBuilder<UserTask>,
    userInfo: IUserInfo,
  ) {
    if (+userInfo.type === userType.ADMIN) {
      query.andWhere(this.notBadgeDismissedForAdminSql('usertasks'), {
        adminBadgeViewerId: +userInfo.userId,
      });
    }
  }

  private async softDeleteReportForCustomer(userInfo: IUserInfo, taskId: number) {
    const viewerId = +userInfo.userId;
    await this.userTasksRepository.query(
      `
      INSERT INTO public.user_task_customer_visibility (user_task_id, user_id, hidden_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (user_task_id, user_id) DO UPDATE
      SET hidden_at = COALESCE(public.user_task_customer_visibility.hidden_at, NOW())
      `,
      [taskId, viewerId],
    );
  }

  /** Replace all template field rows for a report (same id allocation as createCustomerReports). */
  private async replaceUserTaskReports(
    manager: EntityManager,
    userTaskId: number,
    items: ReportItemInput[],
  ): Promise<void> {
    await manager.query(`DELETE FROM public.user_task_reports WHERE user_task_id = $1`, [userTaskId]);
    const expanded = expandReportItemsForStorage(items || []);
    if (!expanded.length) return;

    const maxRows = await manager.query(
      `SELECT COALESCE(MAX(id), 0)::bigint AS max FROM public.user_task_reports`,
    );
    const maxRow = Array.isArray(maxRows) ? maxRows[0] : maxRows;
    let nextReportId =
      Number(maxRow?.max ?? (maxRow as any)?.MAX ?? Object.values(maxRow || {})[0] ?? 0) + 1;

    for (const item of expanded) {
      let val = item.value != null && item.value !== '' ? String(item.value) : '';
      if (String(item.type || '').toUpperCase() === 'TIME' && item.value != null && item.value !== '') {
        const m = moment(item.value);
        val = m.isValid() ? m.format('HH:mm') : String(item.value);
      }
      const ridInt = Math.floor(nextReportId++);
      if (!Number.isInteger(ridInt) || ridInt <= 0) {
        throw new Error(`user_task_reports invalid next id=${ridInt}`);
      }
      await manager.query(
        `INSERT INTO public.user_task_reports (id, created_at, user_task_id, name, type, value, "order")
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          ridInt,
          new Date(),
          userTaskId,
          item.name != null ? String(item.name) : '',
          item.type != null ? String(item.type) : '',
          val,
          Number.isFinite(Number(item.order)) ? Number(item.order) : 0,
        ],
      );
    }
  }

  async create(userInfo: IUserInfo, body: CreateUserTaskDto) {
    try {
      const data = new UserTask();
      data.taskName = body.taskName;
      data.companyName = body.companyName;
      data.serviceId = body.serviceId;
      data.customerId = body.customerId;
      data.siteId = body.siteId;
      data.siteName = body.siteName;
      data.siteLocation = body.siteLocation;
      data.siteAddress = body.siteAddress;
      data.serviceName = body.serviceName;
      data.customerName = body.customerName;
      data.staffId = body.staffId;
      data.notifiesStaff = body.notifiesStaff;
      data.startTime = body.startTime;
      data.endTime = body.endTime;
      data.reportTemplateId = body.reportTemplateId;
      if (body.description !== undefined)
        data.description = body.description;
      data.createdAt = new Date();
      data.updatedAt = new Date();
      data.createdBy = userInfo.userId;
      data.updatedBy = userInfo.userId;
      data.status = dJobStatus.PENDING;
      data.type = "DYNAMIC"
      if (data.notifiesStaff) {
        const staffInfoRes = await this.uersService.profile(body.staffId);
        if (staffInfoRes.data) {
          const html = emailTaskAssignedHtml({
            fullName: staffInfoRes.data.fullName,
            taskName: data.taskName,
            description: data.description,
            siteName: data.siteName,
            serviceName: data.serviceName,
            startAt: moment(data.startTime).format('YYYY-MM-DD HH:mm:ss'),
            endAt: moment(data.endTime).format('YYYY-MM-DD HH:mm:ss'),
            linkPath: 'user-task-today',
          });
          SendMail(staffInfoRes.data.email, `New task assigned`, html)
        }
      }

      const newItem = await this.userTasksRepository.save(data);
      if (!newItem) {
        return errorCode.EXCEPTION;
      }
      return errorCode.SUCCESS;
    } catch (error) {
      console.log("error", error);
      this.logger.debug(error);
      return errorCode.EXCEPTION;
    }
  }

  async checkIn(userInfo: IUserInfo, body: CheckInDto) {

    if (body.type === 'FIXED') {
      const checkExist = await this.userTasksRepository.createQueryBuilder('userTasks')
        .where(`userTasks.taskShiftId= :taskShiftId and userTasks.taskId= :taskId and TO_CHAR(userTasks.created_at, 'YYYY/MM/DD')=:date`,
          { taskShiftId: body.taskShiftId, taskId: body.taskId, date: moment().format('YYYY/MM/DD') })
        .getCount();
      if (checkExist > 0)
        return errorCode.SHIFT_EXIST;
      const ut = new UserTask();
      ut.createdAt = new Date();
      ut.siteId = body.siteId;
      ut.siteName = body.siteName;
      ut.companyName = body.companyName;
      ut.siteAddress = body.siteAddress;
      ut.siteLocation = body.siteLocation;
      ut.taskShiftId = body.taskShiftId;
      ut.taskId = body.taskId;
      ut.taskName = body.taskName;
      ut.startTime = body.startTime;
      ut.endTime = body.endTime;
      ut.serviceId = body.serviceId;
      ut.serviceName = body.serviceName;
      ut.customerId = body.customerId;
      ut.customerName = body.customerName;
      ut.type = body.type;
      ut.description = body.description;
      ut.status = dJobStatus.INPROGRESS;
      ut.reportTemplateId = body.reportTemplateId;
      ut.staffId = userInfo.userId;
      ut.checkIn = new Date();
      const result = await this.userTasksRepository.save(ut);
      if (!result)
        return errorCode.EXCEPTION;


      return errorCode.SUCCESS
    } else {
      if (+body.id) {
        const ut = await this.userTasksRepository.findOne({ where: { id: body.id } })
        ut.status = dJobStatus.INPROGRESS;
        ut.checkIn = new Date();
        ut.updatedAt = new Date();
        ut.updatedBy = userInfo.userId;
        const result = await this.userTasksRepository.save(ut);
        if (!result)
          return errorCode.EXCEPTION;
        return errorCode.SUCCESS
      }

    }

  }

  async findAll(userInfo: IUserInfo, body: GetUserTaskDto) {
    try {
      const query = this.userTasksRepository.createQueryBuilder('usertasks');
      query
        .leftJoin('usertasks.staff', 'staff', 'staff.status!=4')
        .addSelect(['staff.fullName', 'staff.username'])
      query.leftJoinAndSelect('usertasks.reports', 'reports')

      if (body.filter === 'TODAY') {
        query.andWhere(`TO_CHAR(usertasks.created_at, 'YYYY/MM/DD')=:date`, { date: moment().format('YYYY/MM/DD') })
      }

      if (body.status) {
        query.andWhere('usertasks.status =:status', { status: body.status == 'p' ? 0 : body.status == 'i' ? 3 : body.status === 's' ? 1 : 0 })
      }
      if (body.keyword) {
        query.andWhere('(usertasks.taskName ILIKE :keyword)', {
          keyword: `%${String(body.keyword).trim()}%`,
        });
      }

      // Staff sees only their own tasks by default; admins should not be restricted here.
      if (userInfo.type === userType.STAFF) {
        query.andWhere("( usertasks.staffId =:staffId)", { staffId: userInfo.userId })
      }

      if (+body.limit) {
        query.take(body.limit).skip((body.page - 1) * body.limit)
      }
      if (body.orderBy) {
        query.orderBy(`usertasks.${body.orderBy}`, body.orderValue && body.orderValue === 'ASC' ? 'ASC' : 'DESC');
      } else {
        query.orderBy(`usertasks.createdAt`, 'DESC');
      }
      const result = await query.getManyAndCount();
      if (!result)
        return errorCode.EXCEPTION;

      for (const row of result[0]) {
        this.mergeChunkedReportsOnTask(row);
      }
      return { ...errorCode.SUCCESS, data: { count: result[1], rows: result[0] } };
    } catch (error) {
      this.logger.debug(error.message);
      return { ...errorCode.EXCEPTION, message: error.message };
    }
  }

  async findOne(id: number, userInfo?: IUserInfo) {
    try {
      const query = this.userTasksRepository.createQueryBuilder('usertasks');
      query
        .leftJoin('usertasks.staff', 'staff').addSelect(['staff.fullName', 'staff.username'])
        .leftJoin('usertasks.customer', 'customer').addSelect(['customer.fullName', 'customer.username'])
        .leftJoin('customer.customerInfo', 'customerInfo').addSelect([
          'customerInfo.companyName',
          'customerInfo.companyId',
        ])
        .leftJoinAndSelect('usertasks.reports', 'reports')
        .where('usertasks.id=:id', { id });

      const result = await query.getOne();
      if (!result) {
        return { ...errorCode.NOT_FOUND, message: 'Report not found' };
      }

      this.mergeChunkedReportsOnTask(result);
      if (userInfo && +userInfo.type === userType.CUSTOMER) {
        await this.applyCustomerOpenedStateToTasks([result], +userInfo.userId);
      }
      return { ...errorCode.SUCCESS, data: result };
    } catch (error) {
      this.logger.debug(error.message);
      return { ...errorCode.EXCEPTION, message: error.message };
    }
  }

  async updateReport(id: number, userInfo: IUserInfo, body: ReportUserTaskDto) {
    const query = this.userTasksRepository.createQueryBuilder('userTasks')
      .leftJoinAndSelect('userTasks.reportTemplate', 'reportTemplate')
      .leftJoinAndSelect('userTasks.reports', 'reports')
      .leftJoin('userTasks.staff', 'staff').addSelect(['staff.fullName', 'staff.username'])
      .leftJoin('userTasks.createdUser', 'createdUser')
      .addSelect(['createdUser.fullName', 'createdUser.username', 'createdUser.type'])
      .leftJoin('userTasks.customer', 'customer').addSelect(['customer.fullName', 'customer.username'])
      .leftJoin('customer.customerInfo', 'customerInfo').addSelect([
          'customerInfo.companyName',
          'customerInfo.companyId',
        ])

    if (userInfo.type === +userType.STAFF) {
      query.andWhere(`userTasks.id= :id  and userTasks.staffId=:staffId`, { id, staffId: userInfo.userId });
    }
    else {
      query.andWhere(`userTasks.id= :id`, { id });
    }
    const ut = await query.getOne();
    if (!ut)
      return errorCode.NOT_FOUND;
    ut.updatedAt = new Date();
    ut.description = body.description;
    //tạo pdf

    if (body.items) {
      const items = [];
      for (const item of expandReportItemsForStorage(body.items)) {
        const nItem = new UserTaskReport();
        nItem.createdAt = new Date();
        nItem.name = item.name;
        nItem.value = item.value;
        nItem.type = item.type;
        nItem.order = item.order;
        items.push(nItem);
      }
      ut.reports = items;
    }
    this.mergeChunkedReportsOnTask(ut);
    try {
      const resultRownumber = await this.userTasksRepository.query(`select * from 
        ( SELECT id, ROW_NUMBER() OVER(PARTITION BY 'id' ) AS row_num  
            FROM user_tasks
            ) as t
            WHERE t.id=${ut.id}
            `)
      const reportsSorted = [...(ut.reports || [])].sort((a, b) => a.order - b.order);
      const pdfFile = await convertHtmlToPdf(ut, reportsSorted, resultRownumber[0].row_num);
      ut.pdfFile = pdfFile;
    } catch (error) {
      this.logger.error(`[updateReport] PDF generation failed for task ${id}`, error);
    }
    await this.userTasksRepository.save(ut);
    this.maybeNotifyNewReportEmail(userInfo, ut);
    return errorCode.SUCCESS
  }

  async checkOut(userInfo: IUserInfo, id: number) {
    const ut = await this.userTasksRepository.createQueryBuilder('userTasks')
      .where(`userTasks.id= :id  and userTasks.staffId=:staffId`, { id, staffId: userInfo.userId })
      .getOne();
    if (!ut)
      return errorCode.NOT_FOUND;
    ut.checkOut = new Date();
    ut.updatedAt = new Date();
    ut.status = dJobStatus.COMPLETED;
    ut.updatedBy = userInfo.userId;
    const result = await this.userTasksRepository.save(ut);
    if (!result)
      return errorCode.EXCEPTION;
    this.maybeNotifyNewReportEmail(userInfo, ut);
    return errorCode.SUCCESS
  }



  async taskSuccess(userInfo: IUserInfo, id: number) {
    const ut = await this.userTasksRepository.findOne({ where: { id } });
    await this.userTasksRepository.update(id, { status: dJobStatus.COMPLETED, updatedAt: new Date() })
    if (ut) {
      this.maybeNotifyNewReportEmail(userInfo, ut);
    }
    return errorCode.SUCCESS
  }

  async getUserTaskByStatus(userInfo: IUserInfo, status?: string, siteId?: number, serviceId?: number, staffId?: number) {
    try {
      const emptyToday = await this.sitesService.checkUserTaskToday(userInfo, siteId, serviceId);
      const query = this.userTasksRepository.createQueryBuilder('usertasks')
      // 
      query.innerJoin('usertasks.staff', 'staff', 'staff.status!=4').addSelect(['staff.fullName', 'staff.username'])
        .leftJoin('usertasks.customer', 'customer').addSelect(['customer.fullName', 'customer.username'])
        .leftJoin('customer.customerInfo', 'customerInfo').addSelect([
          'customerInfo.companyName',
          'customerInfo.companyId',
        ])
      // if (status === 'p') {
      //   query.where(`DATE_FORMAT(usertasks.created_at, '%Y/%m/%d')=:date`, { date: moment().format('YYYY/MM/DD') })
      // }
      if (+siteId) {
        query.andWhere(' usertasks.siteId =:siteId ', { siteId })
      }
      if (serviceId) {
        query.andWhere(' usertasks.serviceId =:serviceId ', { serviceId })
      }
      if (userInfo.type == userType.ADMIN && +staffId) {
        query.andWhere("( usertasks.staffId= :staffId )", { staffId: +staffId })
      }
      else if (userInfo.type == userType.STAFF) {
        query.andWhere("( usertasks.staffId= :staffId )", { staffId: userInfo.userId })
      }
      else if (userInfo.type == userType.CUSTOMER) {
        applyCustomerScopeToQuery(query, userInfo, 'usertasks.customerId');
      }

      const rowsToday = await query.getMany();
      console.log('query', query.getQueryAndParameters(), emptyToday)
      const newRows = [];
      for (const item of emptyToday) {
        const check = rowsToday.find(c => c.taskId === item.taskId && +c.staffId === +item.staffId && c.taskShiftId === +item.taskShiftId);
        if (check) {
          if (status) {
            if (status === 'p' && (check.status === 0 || check.status === 2)) {
              newRows.push({ ...item, ...check })
            }
            else if (status === 'i' && check.status === 3) {
              newRows.push({ ...item, ...check })
            }
            else if (status === 's' && check.status === 1) {
              newRows.push({ ...item, ...check })
            }
          } else {
            newRows.push({ ...item, ...check })
          }
        } else {
          if (status) {
            if (status === 'p')
              newRows.push({ ...item })
          } else {
            newRows.push({ ...item })
          }
        }
      }
      let rows2 = [];
      if (status && status === 'i') {
        const query2 = this.userTasksRepository.createQueryBuilder('usertasks')
          .andWhere(`usertasks.status=3`)
          .innerJoin('usertasks.staff', 'staff').addSelect(['staff.fullName', 'staff.username'])
          .leftJoin('usertasks.customer', 'customer').addSelect(['customer.fullName', 'customer.username'])
          .leftJoin('customer.customerInfo', 'customerInfo').addSelect([
          'customerInfo.companyName',
          'customerInfo.companyId',
        ])
        if (+siteId) {
          query2.andWhere(' usertasks.siteId =:siteId ', { siteId })
        }
        if (serviceId) {
          query2.andWhere(' usertasks.serviceId =:serviceId ', { serviceId })
        }
        if (userInfo.type == userType.ADMIN && +staffId) {
          query2.andWhere("( usertasks.staffId= :staffId )", { staffId: +staffId })
        }
        else if (+userInfo.type == userType.STAFF) {
          query2.andWhere("( usertasks.staffId= :staffId )", { staffId: userInfo.userId })
        }
        else if (+userInfo.type == userType.CUSTOMER) {
          applyCustomerScopeToQuery(query2, userInfo, 'usertasks.customerId');
        }

        rows2 = await query2.getMany();
      }
      if (status && status === 'p') {
        const query2 = this.userTasksRepository.createQueryBuilder('usertasks')
          .where(`(usertasks.status=0 or usertasks.status=2)`)
          .innerJoin('usertasks.staff', 'staff').addSelect(['staff.fullName', 'staff.username'])
          .leftJoin('usertasks.customer', 'customer').addSelect(['customer.fullName', 'customer.username'])
          .leftJoin('customer.customerInfo', 'customerInfo').addSelect([
          'customerInfo.companyName',
          'customerInfo.companyId',
        ])
          .leftJoinAndSelect('usertasks.reports', 'reports')
        if (+siteId) {
          query2.andWhere(' usertasks.siteId =:siteId ', { siteId })
        }
        if (serviceId) {
          query2.andWhere(' usertasks.serviceId =:serviceId ', { serviceId })
        }
        if (userInfo.type == userType.ADMIN && +staffId) {
          console.log("chay vao day iko")
          query2.andWhere("( usertasks.staffId= :staffId )", { staffId: +staffId })
        }
        else if (+userInfo.type == userType.STAFF) {
          query2.andWhere("( usertasks.staffId= :staffId )", { staffId: userInfo.userId })
        }
        else if (+userInfo.type == userType.CUSTOMER) {
          applyCustomerScopeToQuery(query2, userInfo, 'usertasks.customerId');
        }

        rows2 = await query2.getMany();
      }
      return { ...errorCode.SUCCESS, data: { rows: newRows.concat(rows2), count: newRows.length } }
    } catch (error) {
      console.log('error', error)
      this.logger.debug(error.message);
      return { ...errorCode.EXCEPTION, message: error.message };
    }
  }

  async getUserTasksByUserId(userInfo: IUserInfo, body: GetUserTasksByUserDto, userId?: number) {
    try {
      const query = this.userTasksRepository.createQueryBuilder('usertasks')

      if (+body.year) {
        query.andWhere('EXTRACT(YEAR FROM usertasks.startTime)=:year', { year: body.year })
      }
      if (+body.month) {
        query.andWhere('EXTRACT(MONTH FROM usertasks.startTime)=:month', { month: body.month })
      }


      if (userInfo.type == userType.STAFF || userId) {
        if (userId) {
          query.andWhere("( usertasks.staffId= :staffId )", { staffId: userId })
        } else
          query.andWhere("( usertasks.staffId= :staffId )", { staffId: userInfo.userId })
      }
      if (userInfo.type == userType.CUSTOMER) {
        applyCustomerScopeToQuery(query, userInfo, 'usertasks.customerId');
        this.applyCustomerPerUserHiddenFilter(query, userInfo);
      }
      if (+body.siteId) {
        query.andWhere(' usertasks.siteId =:siteId ', { siteId: body.siteId })
      }
      if (+body.staffId) {
        query.andWhere(' usertasks.staffId =:staffId ', { staffId: body.staffId })
      }
      if (body.startDate && body.endDate) {
        query.andWhere(`usertasks.startTime > :startDate AND usertasks.startTime <= :endDate`, { startDate: moment(body.startDate).format("YYYY-MM-DD 00:00:00"), endDate: moment(body.endDate).format("YYYY-MM-DD 23:59:59") })
      }
      if (body.status) {
        query.andWhere(' usertasks.status =:status ', { status: body.status === 's' ? 1 : body.status === 'p' ? 0 : body.status === 'i' ? 3 : 0 })
      }
      if (body.serviceId) {
        query.andWhere(' usertasks.serviceId =:serviceId ', { serviceId: body.serviceId })
      }
      query.leftJoin('usertasks.staff', 'staff').addSelect(['staff.fullName', 'staff.username'])
      query.leftJoinAndSelect('usertasks.reports', 'reports')
      query.orderBy('usertasks.id', 'DESC')
      const rows = await query.getMany();
      return { ...errorCode.SUCCESS, data: { rows: rows, count: rows.length } }
    } catch (error) {
      this.logger.debug(error.message);
      return { ...errorCode.EXCEPTION, message: error.message };
    }
  }

  async getFilterData(userId: number) {
    if (+userId) {
      const sites = await this.userTasksRepository.query(`select DISTINCT site_id as id, site_name as name from user_tasks where staff_id=$1`, [userId]);
      const tasks = await this.userTasksRepository.query(`select DISTINCT task_id as id, task_name as name,site_id from user_tasks where staff_id=$1`, [userId]);
      const taskshifts = await this.userTasksRepository.query(`select DISTINCT task_shift_id as id, CONCAT(TO_CHAR(start_time,'HH24:MI'),'-',TO_CHAR(end_time,'HH24:MI')) as time,task_id from user_tasks where staff_id=$1`, [userId]);
      return { ...errorCode.SUCCESS, data: { sites, tasks, taskshifts } }
    }
    const sites = await this.userTasksRepository.query(`select DISTINCT site_id as id, site_name as name from user_tasks `, []);
    const tasks = await this.userTasksRepository.query(`select DISTINCT task_id as id, task_name as name,site_id from user_tasks `, []);
    const taskshifts = await this.userTasksRepository.query(`select DISTINCT task_shift_id as id, CONCAT(TO_CHAR(start_time,'HH24:MI'),'-',TO_CHAR(end_time,'HH24:MI')) as time,task_id from user_tasks `, []);
    return { ...errorCode.SUCCESS, data: { sites, tasks, taskshifts } }
  }

  async currentTask(userInfo: IUserInfo) {
    const pendingTask = await this.getUserTaskByStatus(userInfo, 'p');
    const params = new GetUserTasksByUserDto();
    params.status = 'i';
    const inprogressTask = await this.getAllUserTasksByUserId(userInfo, params, true);
    params.status = 's';
    const successTask = await this.getAllUserTasksByUserId(userInfo, params, true);
    return { pendingTaskCount: pendingTask.data.rows.length, inprogressTaskCount: inprogressTask.data, successTaskCount: successTask.data }
  }

  async countTaskbyStatus(userInfo: IUserInfo, status: number) {
    const query = this.userTasksRepository.createQueryBuilder('userTasks');
    query.andWhere('DATE(userTasks.createdAt)=CURRENT_DATE')
    query.andWhere('userTasks.status=:status', { status })
    if (userInfo.type == userType.ADMIN) {
      //
    }
    else if (userInfo.type == userType.STAFF) {
      query.andWhere("( userTasks.staffId= :staffId )", { staffId: userInfo.userId })
    }
    else if (userInfo.type == userType.CUSTOMER) {
      applyCustomerScopeToQuery(query, userInfo, 'userTasks.customerId');
    }
    return query.getCount()
  }

  async getCountUserTasksByUserId(serInfo: IUserInfo, body: GetUserTasksByUserDto) {
    return await this.getAllUserTasksByUserId(serInfo, body, true)
  }

  /** Load a single CUSTOM report for messages deep-link (no status/date filters). */
  private async getCustomReportRowById(userInfo: IUserInfo, reportId: number, onlyCount?: boolean) {
    const query = this.userTasksRepository.createQueryBuilder('usertasks')
      .leftJoin('usertasks.customer', 'customer').addSelect(['customer.fullName', 'customer.username'])
      .leftJoin('customer.customerInfo', 'customerInfo').addSelect([
          'customerInfo.companyName',
          'customerInfo.companyId',
        ])
      .leftJoin('usertasks.staff', 'staff').addSelect(['staff.fullName', 'staff.username'])
      .leftJoin('usertasks.createdUser', 'createdUser')
      .addSelect(['createdUser.fullName', 'createdUser.username', 'createdUser.type'])
      .leftJoinAndSelect('usertasks.reports', 'reports')
      .where('usertasks.id = :reportId', { reportId })
      .andWhere('usertasks.type = :type', { type: 'CUSTOM' });

    if (userInfo.type === userType.STAFF) {
      query.andWhere('usertasks.staffId = :staffId', { staffId: +userInfo.userId });
      this.applyStaffSelfSubmittedCustomFilter(query, userInfo);
    } else if (userInfo.type === userType.CUSTOMER) {
      applyCustomerScopeToQuery(query, userInfo, 'usertasks.customerId');
    }

    const row = await query.getOne();
    if (onlyCount) {
      return { ...errorCode.SUCCESS, data: row ? 1 : 0 };
    }
    if (!row) {
      return { ...errorCode.SUCCESS, data: { rows: [], count: 0 } };
    }
    if (+userInfo.type === userType.CUSTOMER) {
      await this.applyCustomerOpenedStateToTasks([row], +userInfo.userId);
    }
    return { ...errorCode.SUCCESS, data: { rows: [row], count: 1 } };
  }

  async getAllUserTasksByUserId(userInfo: IUserInfo, body: GetUserTasksByUserDto, onlyCount?: boolean) {
    try {
      if (+body.reportId) {
        return this.getCustomReportRowById(userInfo, +body.reportId, onlyCount);
      }

      let pendingResult = [];
      if (+body.status === 0 || +body.status === 2 || body.status === 'p') {

        const resPendingResult = await this.getUserTaskByStatus(userInfo, 'p', body.siteId, body.serviceId, body.staffId);
        pendingResult = resPendingResult.data.rows
      }
      const query = this.userTasksRepository.createQueryBuilder('usertasks')
        .leftJoin('usertasks.customer', 'customer').addSelect(['customer.fullName', 'customer.username'])
        .leftJoin('customer.customerInfo', 'customerInfo').addSelect([
          'customerInfo.companyName',
          'customerInfo.companyId',
        ])

      const isAdmin = userInfo.type === userType.ADMIN;
      const listDeleted = body.status === 'deleted';
      if (isAdmin) {
        if (listDeleted) {
          query.andWhere('usertasks.status = :deletedStatus', {
            deletedStatus: dJobStatus.DELETED,
          });
          query.andWhere('usertasks.cleared_at IS NULL');
        } else if (body.status === 's' || body.status === '1' || +body.status === 1) {
          query.andWhere('usertasks.status != :deletedStatus', {
            deletedStatus: dJobStatus.DELETED,
          });
        }
      } else if (!isAdmin) {
        if (listDeleted) {
          if (+userInfo.type === userType.STAFF) {
            query.andWhere('usertasks.status = :deletedStatus', {
              deletedStatus: dJobStatus.DELETED,
            });
            query.andWhere('usertasks.cleared_at IS NULL');
          }
        } else {
          query.andWhere('usertasks.status != :deletedStatus', {
            deletedStatus: dJobStatus.DELETED,
          });
        }
      }
      if (body.keyword) {
        const kw = `%${String(body.keyword).trim()}%`;
        query.andWhere(
          '(usertasks.siteName ILIKE :keyword OR usertasks.serviceName ILIKE :keyword)',
          { keyword: kw },
        );
      }
      if (+body.year) {
        query.andWhere('EXTRACT(YEAR FROM usertasks.createdAt)=:year', { year: body.year })
      }
      if (+body.month) {
        query.andWhere('EXTRACT(MONTH FROM usertasks.createdAt)=:month', { month: body.month })
      }
      if (+body.staffId) {
        query.andWhere(' usertasks.staffId =:staffId ', { staffId: body.staffId })
      }
      else if (userInfo.type === userType.STAFF) {
        query.andWhere(' usertasks.staffId =:staffId ', { staffId: userInfo.userId })
      }
      else if (userInfo.type === userType.CUSTOMER) {
        applyCustomerScopeToQuery(query, userInfo, 'usertasks.customerId');
        if (listDeleted) {
          this.applyCustomerDeletedOnlyFilter(query, userInfo);
        } else {
          this.applyCustomerPerUserHiddenFilter(query, userInfo);
        }
      }
      if (+body.siteId) {
        query.andWhere(' usertasks.siteId =:siteId ', { siteId: body.siteId })
      }
      if (body.serviceId) {
        query.andWhere(' usertasks.serviceId =:serviceId ', { serviceId: body.serviceId })
      }
      if (body.status) {
        if (body.status === 'p') {
          query.andWhere('(usertasks.status =:status1 or usertasks.status =:status2)', { status1: 0, status2: 2 })
        } else if (body.status === 'deleted' && !isAdmin) {
          if (+userInfo.type === userType.CUSTOMER) {
            query.andWhere('usertasks.status = :completedStatus', {
              completedStatus: dJobStatus.COMPLETED,
            });
          }
        } else if (body.status === 's' && isAdmin) {
          query.andWhere('usertasks.status = :completedStatus', {
            completedStatus: dJobStatus.COMPLETED,
          });
        } else if (body.status === 'deleted' && isAdmin) {
          // Admin deleted filters already applied in listDeleted block above.
        } else {
          query.andWhere(' usertasks.status =:status ', {
            status:
              body.status === 's'
                ? 1
                : body.status === 'p'
                  ? 0
                  : body.status === 'i'
                    ? 3
                    : body.status,
          });
        }
      }

      if (body.startDate && body.endDate) {
        query.andWhere(
          `COALESCE(usertasks.checkIn, usertasks.createdAt) >= :startDate AND COALESCE(usertasks.checkIn, usertasks.createdAt) <= :endDate`,
          {
            startDate: moment(body.startDate).format('YYYY-MM-DD 00:00:00'),
            endDate: moment(body.endDate).format('YYYY-MM-DD 23:59:59'),
          },
        );
      }
      if (body.type) {
        query.andWhere(' usertasks.type =:type ', { type: body.type })
        if (body.type === 'CUSTOM') {
          this.applyStaffSelfSubmittedCustomFilter(query, userInfo);
        }
      } else {
        query.andWhere(' usertasks.type !=:type ', { type: 'CUSTOM' })
      }
      query.leftJoin('usertasks.staff', 'staff').addSelect(['staff.fullName', 'staff.username'])
      query
        .leftJoin('usertasks.createdUser', 'createdUser')
        .addSelect(['createdUser.fullName', 'createdUser.username', 'createdUser.type'])
      query.leftJoinAndSelect('usertasks.reports', 'reports')
      const orderDir = body.orderValue === 'ASC' ? 'ASC' : 'DESC';
      if (body.orderBy === 'staffFullName') {
        query.orderBy('staff.fullName', orderDir).addOrderBy('usertasks.id', 'DESC');
      } else if (body.orderBy === 'customerName') {
        // Match formatCustomerDisplayName priority; avoid raw COALESCE (TypeORM quotes it as a column).
        query
          .orderBy('usertasks.companyName', orderDir)
          .addOrderBy('customerInfo.companyName', orderDir)
          .addOrderBy('customer.fullName', orderDir)
          .addOrderBy('usertasks.customerName', orderDir)
          .addOrderBy('usertasks.id', 'DESC');
      } else if (body.orderBy === 'readStatus') {
        const nullsPlacement = orderDir === 'ASC' ? 'NULLS FIRST' : 'NULLS LAST';
        if (+userInfo.type === userType.ADMIN) {
          query
            .orderBy('usertasks.adminOpenedAt', orderDir, nullsPlacement)
            .addOrderBy('usertasks.id', 'DESC');
        } else if (+userInfo.type === userType.CUSTOMER) {
          query
            .orderBy('usertasks.customerOpenedAt', orderDir, nullsPlacement)
            .addOrderBy('usertasks.id', 'DESC');
        } else if (+userInfo.type === userType.STAFF) {
          query
            .orderBy('usertasks.staffOpenedAt', orderDir, nullsPlacement)
            .addOrderBy('usertasks.id', 'DESC');
        } else {
          query.orderBy('usertasks.id', 'DESC');
        }
      } else {
        const orderByKey = body.orderBy === 'updatedAt' ? 'submittedAt' : body.orderBy;
        if (orderByKey === 'submittedAt' || orderByKey === 'updatedAt') {
          query
            .addSelect(
              'COALESCE("usertasks"."check_in", "usertasks"."created_at")',
              'report_submitted_at',
            )
            .orderBy('report_submitted_at', orderDir)
            .addOrderBy('usertasks.id', 'DESC');
        } else {
          const allowedOrderBy: Record<string, string> = {
            siteName: 'usertasks.siteName',
            serviceName: 'usertasks.serviceName',
            status: 'usertasks.status',
          };
          if (orderByKey && allowedOrderBy[orderByKey]) {
            query.orderBy(allowedOrderBy[orderByKey], orderDir).addOrderBy('usertasks.id', 'DESC');
          } else {
            query.orderBy('usertasks.id', 'DESC');
          }
        }
      }

      if (+body.limit) {
        if (pendingResult.length > 0)
          query.take(body.limit).skip(((body.page - 1) * body.limit) + pendingResult.length)
        else
          query.take(body.limit).skip((body.page - 1) * body.limit)
      }
      if (onlyCount) {
        return { ...errorCode.SUCCESS, data: await query.getCount() }
      }
      const result = await query.getManyAndCount();
      const newRows = pendingResult.concat(result[0]);
      for (const row of newRows) {
        this.mergeChunkedReportsOnTask(row);
      }
      if (+userInfo.type === userType.CUSTOMER) {
        await this.applyCustomerOpenedStateToTasks(newRows, +userInfo.userId);
      }
      return { ...errorCode.SUCCESS, data: { rows: newRows, count: result[1] } }
    } catch (error) {
      this.logger.debug(error.message);
      return { ...errorCode.EXCEPTION, message: error.message };
    }
  }

  async update(userInfo: IUserInfo, id: string, body: UpdateUserTaskDto) {
    try {
      const data = await this.userTasksRepository.findOne({ where: { id: +id } });
      if (!data) {
        return errorCode.NOT_FOUND;
      }
      if (body.customerName !== undefined)
        data.customerName = body.customerName;
      if (body.taskName !== undefined)
        data.taskName = body.taskName;
      if (body.description !== undefined)
        data.description = body.description;

      if (body.serviceId !== undefined)
        data.serviceId = body.serviceId;

      if (body.customerId !== undefined)
        data.customerId = body.customerId;

      if (body.siteId !== undefined)
        data.siteId = body.siteId;
      if (body.siteName !== undefined)
        data.siteName = body.siteName;
      if (body.siteAddress !== undefined)
        data.siteAddress = body.siteAddress;

      if (body.siteLocation !== undefined)
        data.siteLocation = body.siteLocation;
      if (body.serviceName !== undefined)
        data.serviceName = body.serviceName;
      data.staffId = body.staffId;

      if (body.notifiesStaff && !data.notifiesStaff) {
        const staffInfoRes = await this.uersService.profile(body.staffId);
        if (staffInfoRes.data) {
          const html = emailTaskAssignedHtml({
            fullName: staffInfoRes.data.fullName,
            taskName: data.taskName,
            description: data.description,
            siteName: data.siteName,
            serviceName: data.serviceName,
            startAt: moment(data.startTime).format('YYYY-MM-DD HH:mm:ss'),
            endAt: moment(data.endTime).format('YYYY-MM-DD HH:mm:ss'),
            linkPath: 'user-task-today',
          });
          SendMail(staffInfoRes.data.email, `New task assigned`, html)
        }
      }
      data.notifiesStaff = body.notifiesStaff;
      data.updatedAt = new Date();
      const newItem = await this.userTasksRepository.update(+id, data);
      if (!newItem) {
        return errorCode.EXCEPTION;
      }

      return errorCode.SUCCESS;
    } catch (error) {
      console.log("error", error);
      this.logger.debug(error);
      return errorCode.EXCEPTION;
    }
  }

  /** Staff-submitted custom reports not yet opened by admin (dashboard badge). */
  async countUnopenedStaffCustomReports(userInfo: IUserInfo) {
    try {
      if (+userInfo.type !== userType.ADMIN) {
        return { ...errorCode.SUCCESS, data: 0 };
      }
      const countQuery = this.userTasksRepository
        .createQueryBuilder('usertasks')
        .where('usertasks.type = :type', { type: 'CUSTOM' })
        .andWhere('usertasks.status = :status', { status: dJobStatus.COMPLETED })
        .andWhere('usertasks.staff_id > 0')
        .andWhere('usertasks.staff_id != usertasks.customer_id')
      this.applyAdminBadgeNotDismissedFilter(countQuery, userInfo);
      const count = await countQuery.getCount();
      return { ...errorCode.SUCCESS, data: count };
    } catch (error) {
      this.logger.debug((error as Error).message);
      return { ...errorCode.EXCEPTION, message: (error as Error).message };
    }
  }

  /** Clear dashboard new-reports badge when admin opens the New Reports page (list read unchanged). */
  async markAllNewReportsOpenedForAdmin(userInfo: IUserInfo) {
    try {
      if (+userInfo.type !== userType.ADMIN) {
        return errorCode.CAN_NOT_DELETE;
      }
      const viewerId = +userInfo.userId;
      await this.userTasksRepository.query(
        `
        INSERT INTO public.user_task_admin_visibility (user_task_id, user_id, badge_dismissed_at)
        SELECT ut.id, $1, NOW()
        FROM public.user_tasks ut
        WHERE ut.type = 'CUSTOM'
          AND ut.status = $2
          AND ut.staff_id > 0
          AND ut.staff_id != ut.customer_id
          AND NOT EXISTS (
            SELECT 1 FROM public.user_task_admin_visibility v
            WHERE v.user_task_id = ut.id
              AND v.user_id = $1
              AND v.badge_dismissed_at IS NOT NULL
          )
        ON CONFLICT (user_task_id, user_id) DO UPDATE
        SET badge_dismissed_at = COALESCE(
          public.user_task_admin_visibility.badge_dismissed_at,
          EXCLUDED.badge_dismissed_at
        )
        `,
        [viewerId, dJobStatus.COMPLETED],
      );
      return errorCode.SUCCESS;
    } catch (error) {
      this.logger.debug((error as Error).message);
      return errorCode.EXCEPTION;
    }
  }

  /** Clear dashboard new-reports badge when customer opens the New Reports page (per login). */
  async markAllNewReportsOpenedForCustomer(userInfo: IUserInfo) {
    try {
      if (+userInfo.type !== userType.CUSTOMER) {
        return errorCode.CAN_NOT_DELETE;
      }
      const viewerId = +userInfo.userId;
      await this.userTasksRepository.query(
        `
        INSERT INTO public.user_task_customer_visibility (user_task_id, user_id, badge_dismissed_at)
        SELECT ut.id, $1, NOW()
        FROM public.user_tasks ut
        WHERE ut.type = 'CUSTOM'
          AND ut.status = $2
          AND ut.staff_id > 0
          AND ut.staff_id != ut.customer_id
          AND (
            ut.customer_id = $1
            OR ut.customer_id IN (
              SELECT c.user_id FROM customers c
              INNER JOIN customers me ON me.user_id = $1
              WHERE me.company_id IS NOT NULL AND c.company_id = me.company_id
            )
            OR ut.customer_id IN (
              SELECT c.user_id FROM customers c
              INNER JOIN customers me ON me.user_id = $1
              WHERE me.company_id IS NULL
                AND TRIM(COALESCE(me.company_name, '')) <> ''
                AND LOWER(TRIM(c.company_name)) = LOWER(TRIM(me.company_name))
            )
          )
          AND NOT EXISTS (
            SELECT 1 FROM public.user_task_customer_visibility v
            WHERE v.user_task_id = ut.id
              AND v.user_id = $1
              AND v.badge_dismissed_at IS NOT NULL
          )
          AND NOT EXISTS (
            SELECT 1 FROM public.user_task_customer_visibility v
            WHERE v.user_task_id = ut.id
              AND v.user_id = $1
              AND v.hidden_at IS NOT NULL
          )
        ON CONFLICT (user_task_id, user_id) DO UPDATE
        SET badge_dismissed_at = COALESCE(
          public.user_task_customer_visibility.badge_dismissed_at,
          EXCLUDED.badge_dismissed_at
        ),
        opened_at = public.user_task_customer_visibility.opened_at
        `,
        [viewerId, dJobStatus.COMPLETED],
      );
      return errorCode.SUCCESS;
    } catch (error) {
      this.logger.debug((error as Error).message);
      return errorCode.EXCEPTION;
    }
  }

  async markAdminOpened(userInfo: IUserInfo, id: number) {
    try {
      if (+userInfo.type !== userType.ADMIN) {
        return errorCode.CAN_NOT_DELETE;
      }
      const data = await this.userTasksRepository.findOne({ where: { id } });
      if (!data || data.type !== 'CUSTOM') {
        return errorCode.NOT_FOUND;
      }
      if (!data.adminOpenedAt) {
        data.adminOpenedAt = new Date();
        data.updatedAt = new Date();
        await this.userTasksRepository.save(data);
      }
      return errorCode.SUCCESS;
    } catch (error) {
      this.logger.debug((error as Error).message);
      return errorCode.EXCEPTION;
    }
  }

  async markAdminUnread(userInfo: IUserInfo, id: number) {
    try {
      if (+userInfo.type !== userType.ADMIN) {
        return errorCode.CAN_NOT_DELETE;
      }
      const data = await this.userTasksRepository.findOne({ where: { id } });
      if (!data || data.type !== 'CUSTOM') {
        return errorCode.NOT_FOUND;
      }
      await this.userTasksRepository.update(+id, {
        adminOpenedAt: null,
        updatedAt: new Date(),
      });
      return errorCode.SUCCESS;
    } catch (error) {
      this.logger.debug((error as Error).message);
      return errorCode.EXCEPTION;
    }
  }

  /** Staff-submitted custom reports for this customer not yet opened by customer. */
  async countUnopenedCustomerCustomReports(userInfo: IUserInfo) {
    try {
      if (+userInfo.type !== userType.CUSTOMER) {
        return { ...errorCode.SUCCESS, data: 0 };
      }
      const countQuery = this.userTasksRepository
        .createQueryBuilder('usertasks')
        .where('usertasks.type = :type', { type: 'CUSTOM' })
        .andWhere('usertasks.status = :status', { status: dJobStatus.COMPLETED })
        .andWhere('usertasks.staff_id > 0')
        .andWhere('usertasks.staff_id != usertasks.customer_id')
        .andWhere(customerScopeSql('usertasks.customer_id'), customerScopeParams(userInfo));
      this.applyCustomerPerUserHiddenFilter(countQuery, userInfo);
      this.applyCustomerBadgeCountFilter(countQuery, userInfo);
      const count = await countQuery.getCount();
      return { ...errorCode.SUCCESS, data: count };
    } catch (error) {
      this.logger.debug((error as Error).message);
      return { ...errorCode.EXCEPTION, message: (error as Error).message };
    }
  }

  async markCustomerOpened(userInfo: IUserInfo, id: number) {
    try {
      if (+userInfo.type !== userType.CUSTOMER) {
        return errorCode.CAN_NOT_DELETE;
      }
      const data = await this.userTasksRepository.findOne({ where: { id } });
      if (
        !data ||
        data.type !== 'CUSTOM' ||
        !(await this.customerCanAccessReport(userInfo, data.customerId))
      ) {
        return errorCode.NOT_FOUND;
      }
      await this.setCustomerTaskOpened(+userInfo.userId, +id);
      return errorCode.SUCCESS;
    } catch (error) {
      this.logger.debug((error as Error).message);
      return errorCode.EXCEPTION;
    }
  }

  async markCustomerUnread(userInfo: IUserInfo, id: number) {
    try {
      if (+userInfo.type !== userType.CUSTOMER) {
        return errorCode.CAN_NOT_DELETE;
      }
      const data = await this.userTasksRepository.findOne({ where: { id } });
      if (
        !data ||
        data.type !== 'CUSTOM' ||
        !(await this.customerCanAccessReport(userInfo, data.customerId))
      ) {
        return errorCode.NOT_FOUND;
      }
      await this.clearCustomerTaskOpened(+userInfo.userId, +id);
      return errorCode.SUCCESS;
    } catch (error) {
      this.logger.debug((error as Error).message);
      return errorCode.EXCEPTION;
    }
  }

  async markStaffOpened(userInfo: IUserInfo, id: number) {
    try {
      if (+userInfo.type !== userType.STAFF) {
        return errorCode.CAN_NOT_DELETE;
      }
      const data = await this.userTasksRepository.findOne({ where: { id } });
      if (!data || !this.isStaffOwnCustomReport(data, +userInfo.userId)) {
        return errorCode.NOT_FOUND;
      }
      if (!data.staffOpenedAt) {
        data.staffOpenedAt = new Date();
        data.updatedAt = new Date();
        await this.userTasksRepository.save(data);
      }
      return errorCode.SUCCESS;
    } catch (error) {
      this.logger.debug((error as Error).message);
      return errorCode.EXCEPTION;
    }
  }

  /** Admin permanent delete — remove child rows first (FK on user_task_reports). */
  private async hardDeleteUserTask(taskId: number) {
    await this.userTasksRepository.manager.transaction(async (manager) => {
      await manager.query(
        `DELETE FROM public.user_task_reports WHERE user_task_id = $1`,
        [taskId],
      );
      await manager.query(
        `DELETE FROM public.user_task_customer_visibility WHERE user_task_id = $1`,
        [taskId],
      );
      await manager.query(
        `DELETE FROM public.user_task_admin_visibility WHERE user_task_id = $1`,
        [taskId],
      );
      try {
        await manager.query(
          `UPDATE public.customer_admin_messages SET user_task_id = NULL WHERE user_task_id = $1`,
          [taskId],
        );
      } catch (msgErr) {
        this.logger.warn(`customer_admin_messages unlink: ${(msgErr as Error).message}`);
      }
      await manager.delete(UserTask, taskId);
    });
  }

  /**
   * Clear exactly the visible deleted rows (by id list).
   * This is the only way to guarantee the toast matches what the user sees.
   */
  async clearDeletedReportsByIds(userInfo: IUserInfo, body: ClearDeletedReportsDto) {
    try {
      const type = +userInfo.type;
      const viewerId = +userInfo.userId;
      if (!viewerId || !Number.isFinite(viewerId)) return errorCode.CAN_NOT_DELETE;
      if (type === userType.ADMIN) {
        const ids = Array.from(
          new Set((body?.ids || []).map((n) => +n).filter((n) => Number.isFinite(n) && n > 0)),
        );
        if (!ids.length) {
          return { ...errorCode.SUCCESS, data: { clearedCount: 0 } };
        }
        const rows = await this.userTasksRepository
          .createQueryBuilder('usertasks')
          .select(['usertasks.id'])
          .where('usertasks.id IN (:...ids)', { ids })
          .andWhere('usertasks.status = :deletedStatus', {
            deletedStatus: dJobStatus.DELETED,
          })
          .andWhere('usertasks.cleared_at IS NULL')
          .getMany();
        let clearedCount = 0;
        for (const row of rows) {
          await this.hardDeleteUserTask(+row.id);
          clearedCount += 1;
        }
        return { ...errorCode.SUCCESS, data: { clearedCount } };
      }

      const ids = Array.from(new Set((body?.ids || []).map((n) => +n).filter((n) => Number.isFinite(n) && n > 0)));
      if (!ids.length) {
        return { ...errorCode.SUCCESS, data: { clearedCount: 0 } };
      }

      if (type === userType.CUSTOMER) {
        // Only clear rows that are currently in this customer's Deleted tab (hidden, not cleared),
        // and are their own CUSTOM reports.
        const rows = await this.userTasksRepository
          .createQueryBuilder('usertasks')
          .select(['usertasks.id', 'usertasks.customerId', 'usertasks.createdBy', 'usertasks.type'])
          .innerJoin(
            'user_task_customer_visibility',
            'v',
            'v.user_task_id = usertasks.id AND v.user_id = :viewerId AND v.hidden_at IS NOT NULL AND v.cleared_at IS NULL',
            { viewerId },
          )
          .where('usertasks.id IN (:...ids)', { ids })
          .andWhere('usertasks.type = :type', { type: 'CUSTOM' })
          .andWhere('(usertasks.customerId = :viewerId OR usertasks.createdBy = :viewerId)', { viewerId })
          .getMany();
        const clearIds = rows.map((r) => +r.id).filter((n) => Number.isFinite(n) && n > 0);
        if (!clearIds.length) return { ...errorCode.SUCCESS, data: { clearedCount: 0 } };

        const params: any[] = [viewerId, ...clearIds];
        const placeholders = clearIds.map((_, idx) => `$${idx + 2}`).join(', ');
        const result = await this.userTasksRepository.query(
          `
          UPDATE public.user_task_customer_visibility v
          SET cleared_at = NOW()
          WHERE v.user_id = $1
            AND v.user_task_id IN (${placeholders})
            AND v.hidden_at IS NOT NULL
            AND v.cleared_at IS NULL
          `,
          params,
        );
        const clearedCount =
          (result && typeof (result as any).rowCount === 'number' && (result as any).rowCount) ||
          (Array.isArray(result) ? result.length : 0);
        return { ...errorCode.SUCCESS, data: { clearedCount } };
      }

      if (type === userType.STAFF) {
        const rows = await this.userTasksRepository
          .createQueryBuilder('usertasks')
          .select(['usertasks.id', 'usertasks.staffId', 'usertasks.createdBy', 'usertasks.type', 'usertasks.status'])
          .where('usertasks.id IN (:...ids)', { ids })
          .andWhere('usertasks.type = :type', { type: 'CUSTOM' })
          .andWhere('usertasks.staffId = :staffId', { staffId: viewerId })
          .andWhere('usertasks.createdBy = :staffId', { staffId: viewerId })
          .andWhere('usertasks.status = :deletedStatus', { deletedStatus: dJobStatus.DELETED })
          .andWhere('usertasks.cleared_at IS NULL')
          .getMany();
        const clearIds = rows.map((r) => +r.id).filter((n) => Number.isFinite(n) && n > 0);
        if (!clearIds.length) return { ...errorCode.SUCCESS, data: { clearedCount: 0 } };

        await this.userTasksRepository
          .createQueryBuilder()
          .update(UserTask)
          .set({ clearedAt: () => 'NOW()' })
          .where('id IN (:...ids)', { ids: clearIds })
          .execute();
        return { ...errorCode.SUCCESS, data: { clearedCount: clearIds.length } };
      }

      return errorCode.CAN_NOT_DELETE;
    } catch (error) {
      this.logger.error((error as Error).message);
      return {
        ...errorCode.EXCEPTION,
        message: (error as Error).message || errorCode.EXCEPTION.message,
      };
    }
  }

  async remove(userInfo: IUserInfo, id: string) {
    try {
      const taskId = +id;
      const data = await this.userTasksRepository.findOne({ where: { id: taskId } });
      if (!data) {
        return errorCode.NOT_FOUND;
      }

      const userId = +userInfo.userId;
      const type = +userInfo.type;

      if (type === userType.ADMIN) {
        if (+data.status === dJobStatus.DELETED) {
          await this.hardDeleteUserTask(taskId);
          return errorCode.SUCCESS;
        }
        data.status = dJobStatus.DELETED;
        data.updatedBy = userId;
        data.updatedAt = new Date();
        await this.userTasksRepository.save(data);
        return errorCode.SUCCESS;
      }

      if (type === userType.CUSTOMER) {
        if (
          !this.isCustomerOwnCustomReport(data, userId) ||
          !(await this.customerCanAccessReport(userInfo, data.customerId))
        ) {
          return {
            ...errorCode.CAN_NOT_DELETE,
            message: 'You can only remove your own reports',
          };
        }
        await this.softDeleteReportForCustomer(userInfo, taskId);
        return errorCode.SUCCESS;
      }

      if (+data.status === dJobStatus.DELETED) {
        return errorCode.NOT_FOUND;
      }

      if (type === userType.STAFF) {
        if (!this.isStaffOwnCustomReport(data, userId)) {
          return {
            ...errorCode.CAN_NOT_DELETE,
            message: 'You can only delete your own reports',
          };
        }
        data.status = dJobStatus.DELETED;
        data.updatedBy = userId;
        data.updatedAt = new Date();
        await this.userTasksRepository.save(data);
        return errorCode.SUCCESS;
      }

      return errorCode.CAN_NOT_DELETE;
    } catch (error) {
      this.logger.error((error as Error).message);
      return {
        ...errorCode.CAN_NOT_DELETED,
        message: (error as Error).message || errorCode.CAN_NOT_DELETED.message,
      };
    }
  }

  async restoreReport(userInfo: IUserInfo, id: string) {
    try {
      const taskId = +id;
      const data = await this.userTasksRepository.findOne({ where: { id: taskId } });
      if (!data || data.type !== 'CUSTOM') {
        return errorCode.NOT_FOUND;
      }

      const userId = +userInfo.userId;
      const type = +userInfo.type;

      if (type === userType.CUSTOMER) {
        if (
          !this.isCustomerOwnCustomReport(data, userId) ||
          !(await this.customerCanAccessReport(userInfo, data.customerId))
        ) {
          return {
            ...errorCode.CAN_NOT_DELETE,
            message: 'You can only restore your own reports',
          };
        }
        await this.userTasksRepository.query(
          `
          UPDATE public.user_task_customer_visibility
          SET hidden_at = NULL,
              cleared_at = NULL
          WHERE user_task_id = $1 AND user_id = $2 AND hidden_at IS NOT NULL
          `,
          [taskId, userId],
        );
        return errorCode.SUCCESS;
      }

      if (type === userType.STAFF) {
        if (!this.isStaffOwnCustomReport(data, userId)) {
          return {
            ...errorCode.CAN_NOT_DELETE,
            message: 'You can only restore your own reports',
          };
        }
        if (+data.status !== dJobStatus.DELETED) {
          return errorCode.NOT_FOUND;
        }
        data.status = dJobStatus.COMPLETED;
        data.clearedAt = null;
        data.updatedBy = userId;
        data.updatedAt = new Date();
        await this.userTasksRepository.save(data);
        return errorCode.SUCCESS;
      }

      if (type === userType.ADMIN) {
        if (+data.status !== dJobStatus.DELETED) {
          return errorCode.NOT_FOUND;
        }
        data.status = dJobStatus.COMPLETED;
        data.clearedAt = null;
        data.updatedBy = userId;
        data.updatedAt = new Date();
        await this.userTasksRepository.save(data);
        return errorCode.SUCCESS;
      }

      return errorCode.CAN_NOT_DELETE;
    } catch (error) {
      this.logger.error((error as Error).message);
      return {
        ...errorCode.CAN_NOT_DELETED,
        message: (error as Error).message || errorCode.CAN_NOT_DELETED.message,
      };
    }
  }

  async createCustomerReports(userInfo: IUserInfo, body: CreateCustomReportsDto) {
    try {
      const data = new UserTask();
      data.taskName = body.taskName;
      data.serviceId = body.serviceId;
      data.customerId = body.customerId;
      data.siteId = body.siteId;
      data.siteName = body.siteName;
      data.siteLocation = body.siteLocation;
      data.siteAddress = body.siteAddress;
      data.serviceName = body.serviceName;
      data.customerName = body.customerName;
      data.companyName = body.companyName;
      const bodyStaffId =
        body.staffId != null && body.staffId !== ('' as any) ? Number(body.staffId) : NaN;
      if (
        +userInfo.type === userType.ADMIN &&
        Number.isFinite(bodyStaffId) &&
        bodyStaffId > 0
      ) {
        data.staffId = bodyStaffId;
      } else {
        data.staffId = userInfo.userId;
      }
      data.notifiesStaff = body.notifiesStaff;
      data.startTime = body.startTime ? body.startTime : new Date();
      data.endTime = body.endTime ? body.endTime : new Date();
      data.reportTemplateId = body.reportTemplateId;
      if (body.description !== undefined)
        data.description = body.description;
      data.createdAt = new Date();
      data.updatedAt = new Date();
      data.createdBy = userInfo.userId;
      data.updatedBy = userInfo.userId;
      data.status = dJobStatus.COMPLETED;
      data.type = "CUSTOM"
      // Server clock at save — client checkIn can be hours stale on long admin uploads.
      data.checkIn = new Date();
      data.checkOut = body.completed ? body.completed : new Date();
      // Not tied to a scheduled task; many DBs require NOT NULL on task_id / task_shift_id.
      const bAny = body as any;
      data.taskShiftId =
        bAny.taskShiftId != null && bAny.taskShiftId !== '' && Number.isFinite(Number(bAny.taskShiftId))
          ? Number(bAny.taskShiftId)
          : 0;
      data.taskId =
        bAny.taskId != null && bAny.taskId !== '' && Number.isFinite(Number(bAny.taskId))
          ? Number(bAny.taskId)
          : 0;

      if (body.items) {
        const items = [];
        for (const item of expandReportItemsForStorage(body.items)) {
          const nItem = new UserTaskReport();
          nItem.createdAt = new Date();
          nItem.name = item.name != null ? String(item.name) : '';
          nItem.type = item.type != null ? String(item.type) : '';
          nItem.order = Number.isFinite(Number(item.order)) ? Number(item.order) : 0;
          let val = item.value != null && item.value !== '' ? String(item.value) : '';
          if (String(item.type).toUpperCase() === 'TIME' && item.value != null && item.value !== '') {
            const m = moment(item.value);
            val = m.isValid() ? m.format('HH:mm') : String(item.value);
          }
          nItem.value = val;
          items.push(nItem);
        }
        data.reports = items;
      }

      if (data.reports?.length) {
        const maxRepRow = await this.uerTaskReportsRepository
          .createQueryBuilder('r')
          .select('COALESCE(MAX(r.id), 0)', 'max')
          .getRawOne();
        let nextReportId = Number(maxRepRow?.max ?? 0) + 1;
        for (const r of data.reports) {
          if (Number.isFinite(nextReportId) && nextReportId > 0) {
            (r as any).id = nextReportId++;
          }
        }
      }

      const reports = data.reports;
      delete (data as any).reports;

      const taskSaved = await this.userTasksRepository.manager.transaction(async (manager) => {
        await manager.query(`LOCK TABLE public.user_tasks IN EXCLUSIVE MODE`);
        const maxRows = await manager.query(
          `SELECT COALESCE(MAX(id), 0)::bigint AS "maxId" FROM public.user_tasks`,
        );
        const maxRow = Array.isArray(maxRows) ? maxRows[0] : maxRows;
        const maxId = Number(
          maxRow?.maxId ?? (maxRow as any)?.maxid ?? (maxRow as any)?.MAXID ?? Object.values(maxRow || {})[0],
        );
        if (!Number.isFinite(maxId) || maxId < 0) {
          throw new Error(
            `Could not read MAX(id) from user_tasks; row=${JSON.stringify(maxRow)} keys=${maxRow ? Object.keys(maxRow).join(',') : 'none'}`,
          );
        }
        const nextId = Math.floor(maxId + 1);
        if (!Number.isInteger(nextId) || nextId <= 0 || nextId > Number.MAX_SAFE_INTEGER) {
          throw new Error(`Invalid nextId computed: maxId=${maxId} nextId=${nextId}`);
        }

        const rowParams = [
          data.createdAt,
          data.updatedAt,
          data.staffId,
          data.status,
          data.taskShiftId,
          data.taskId,
          data.taskName,
          data.siteId,
          data.siteName,
          data.siteAddress,
          data.siteLocation,
          data.customerId,
          data.customerName,
          data.serviceId,
          data.serviceName,
          data.reportTemplateId,
          data.description ?? '',
          data.startTime,
          data.endTime,
          data.notifiesStaff,
          data.createdBy,
          data.updatedBy,
          data.type,
          data.companyName ?? '',
          data.checkIn,
          data.checkOut,
          null,
          '',
        ];

        const seqRows = await manager.query(
          `SELECT pg_get_serial_sequence('public.user_tasks', 'id') AS seq`,
        );
        const seqName = seqRows?.[0]?.seq ?? (seqRows?.[0] as any)?.SEQ;
        const hasSeq = seqName != null && String(seqName).trim().length > 0;

        const idMetaRows = await manager.query(
          `SELECT c.is_identity::text AS is_identity, c.identity_generation::text AS identity_generation
           FROM information_schema.columns c
           WHERE c.table_schema = 'public' AND c.table_name = 'user_tasks' AND c.column_name = 'id'`,
        );
        const idMeta = Array.isArray(idMetaRows) ? idMetaRows[0] : idMetaRows;
        const genAlways =
          String(idMeta?.identity_generation ?? (idMeta as any)?.IDENTITY_GENERATION ?? '')
            .toUpperCase()
            .trim() === 'ALWAYS';

        let insertRows: unknown;
        if (hasSeq) {
          await manager.query(
            `SELECT setval($1::regclass, GREATEST((SELECT COALESCE(MAX(id), 0) FROM public.user_tasks), 1), true)`,
            [String(seqName)],
          );
          try {
            insertRows = await manager.query(
              `INSERT INTO public.user_tasks (
                created_at, updated_at, staff_id, status, task_shift_id, task_id,
                task_name, site_id, site_name, site_address, site_location, customer_id,
                customer_name, service_id, service_name, report_template_id,
                description, start_time, end_time, notifies_staff, created_by, updated_by,
                type, company_name, check_in, check_out, images, pdf_file
              ) VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28
              )
              RETURNING id`,
              rowParams,
            );
          } catch {
            insertRows = null;
          }
        }

        if (!insertRows) {
          const overriding = genAlways ? ' OVERRIDING SYSTEM VALUE ' : ' ';
          insertRows = await manager.query(
            `INSERT INTO public.user_tasks (
            id, created_at, updated_at, staff_id, status, task_shift_id, task_id,
            task_name, site_id, site_name, site_address, site_location, customer_id,
            customer_name, service_id, service_name, report_template_id,
            description, start_time, end_time, notifies_staff, created_by, updated_by,
            type, company_name, check_in, check_out, images, pdf_file
          )${overriding}VALUES (
            ${nextId},$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28
          )
          RETURNING id`,
            rowParams,
          );
        }

        const row0 = Array.isArray(insertRows) ? insertRows[0] : insertRows;
        const insertedId = Number(row0?.id ?? (row0 as any)?.ID);
        if (!Number.isFinite(insertedId) || insertedId <= 0) {
          throw new Error(
            `INSERT user_tasks did not return id; nextId=${nextId} hasSeq=${hasSeq} returning=${JSON.stringify(insertRows)}`,
          );
        }
        if (!hasSeq && insertedId !== nextId) {
          throw new Error(`INSERT id mismatch: expected ${nextId}, got ${insertedId}`);
        }

        if (reports?.length) {
          for (const r of reports) {
            const rid = (r as any).id;
            if (rid == null || !Number.isFinite(Number(rid))) {
              throw new Error(`user_task_reports missing id; report=${JSON.stringify({ name: r.name, type: r.type })}`);
            }
            const ridInt = Math.floor(Number(rid));
            if (!Number.isInteger(ridInt) || ridInt <= 0) {
              throw new Error(`user_task_reports invalid id=${rid}`);
            }
            await manager.query(
              `INSERT INTO public.user_task_reports (id, created_at, user_task_id, name, type, value, "order")
               VALUES (${ridInt}, $1, $2, $3, $4, $5, $6)
               ON CONFLICT (user_task_id, name) DO UPDATE
               SET type = EXCLUDED.type,
                   value = EXCLUDED.value,
                   "order" = EXCLUDED."order"`,
              [r.createdAt ?? new Date(), insertedId, r.name, r.type, r.value, r.order],
            );
          }
        }
        return { id: insertedId } as UserTask;
      });

      data.reports = reports;
      if (!taskSaved) {
        return errorCode.EXCEPTION;
      }

      const query = this.userTasksRepository.createQueryBuilder('userTasks')
        .leftJoinAndSelect('userTasks.reports', 'reports')
        .leftJoinAndSelect('userTasks.reportTemplate', 'reportTemplate')
        .leftJoin('userTasks.staff', 'staff').addSelect(['staff.fullName', 'staff.username'])
        .leftJoin('userTasks.createdUser', 'createdUser')
        .addSelect(['createdUser.fullName', 'createdUser.username', 'createdUser.type'])
        .leftJoin('userTasks.customer', 'customer').addSelect(['customer.fullName', 'customer.username'])
        .leftJoin('customer.customerInfo', 'customerInfo').addSelect([
          'customerInfo.companyName',
          'customerInfo.companyId',
        ])
        .andWhere(`userTasks.id= :id`, { id: taskSaved.id });
      const ut = await query.getOne();
      if (ut) {
        this.mergeChunkedReportsOnTask(ut);
        try {
          const resultRownumber = await this.userTasksRepository.query(`select * from 
            ( SELECT id, ROW_NUMBER() OVER(PARTITION BY 'id' ) AS row_num  
                FROM user_tasks
                ) as t
                WHERE t.id=${ut.id}
                `)
          console.log('convertHtmlToPdf')
          const rowNum = resultRownumber?.[0]?.row_num ?? 1;
          const reportsSorted = [...(ut.reports || [])].sort((a, b) => a.order - b.order);
          const pdfFile = await convertHtmlToPdf(ut, reportsSorted, rowNum);

          data.pdfFile = pdfFile;
        } catch (error) {
          this.logger.error(`[createCustomerReports] PDF generation failed for task ${taskSaved.id}`, error);
        }
      }
      if (data.pdfFile) {
        await this.userTasksRepository.update(taskSaved.id, { pdfFile: data.pdfFile });
      }
      this.maybeNotifyNewReportEmail(userInfo, {
        id: taskSaved.id,
        customerId: data.customerId,
        taskName: data.taskName,
        siteName: data.siteName,
        serviceName: data.serviceName,
      });
      return errorCode.SUCCESS;
    } catch (error) {
      const { message: errMsg, details } = buildExceptionResult(error, 'createCustomerReports');
      console.error('[createCustomerReports]', errMsg);
      console.error('[createCustomerReports] details', JSON.stringify(details, null, 2));
      this.logger.debug(error);
      return {
        ...errorCode.EXCEPTION,
        message: errMsg || errorCode.EXCEPTION.message,
        details,
      };
    }
  }

  async deleteFilePdf(userInfo: IUserInfo, id: number) {
    const userTask = await this.userTasksRepository.findOne({ where: { id } });
    if (!userTask)
      return errorCode.NOT_FOUND;
    userTask.pdfFile = null;
    userTask.updatedAt = new Date();
    userTask.updatedBy = userInfo.userId;
    await this.userTasksRepository.save(userTask);
    //xóa trên s3 sau khi đưa lên s3
    return errorCode.SUCCESS;
  }

  async updateCustomerReports(userInfo: IUserInfo, id: number, body: CreateCustomReportsDto) {
    try {
      const existing = await this.userTasksRepository.findOne({ where: { id: +id } });
      if (!existing) return errorCode.NOT_FOUND;

      if (
        +userInfo.type === +userType.STAFF &&
        !this.isStaffOwnCustomReport(existing, +userInfo.userId)
      ) {
        return { ...errorCode.EXCEPTION, message: 'You can only edit your own reports.' };
      }

      const customerId = Number(body.customerId);
      const siteId = Number(body.siteId);
      if (!Number.isFinite(customerId) || customerId <= 0) {
        return { ...errorCode.VALIDATION_ERROR, message: 'customerId is required' };
      }
      if (!Number.isFinite(siteId) || siteId <= 0) {
        return { ...errorCode.VALIDATION_ERROR, message: 'siteId is required' };
      }

      await this.userTasksRepository.manager.transaction(async (manager) => {
        await manager.update(UserTask, { id: +id }, {
          taskName: body.taskName,
          serviceId: body.serviceId ?? null,
          customerId,
          siteId,
          siteName: body.siteName ?? '',
          siteLocation: body.siteLocation ?? '',
          siteAddress: body.siteAddress ?? '',
          serviceName: body.serviceName ?? '',
          customerName: body.customerName ?? '',
          companyName: body.companyName ?? '',
          startTime: body.startTime ? new Date(body.startTime) : existing.startTime,
          endTime: body.endTime ? new Date(body.endTime) : existing.endTime,
          notifiesStaff: body.notifiesStaff ?? existing.notifiesStaff,
          reportTemplateId: body.reportTemplateId,
          description: body.description !== undefined ? body.description : existing.description,
          updatedAt: new Date(),
          updatedBy: userInfo.userId,
          status: dJobStatus.COMPLETED,
          type: 'CUSTOM',
          checkIn: body.checkIn ? new Date(body.checkIn) : existing.checkIn,
          checkOut: body.completed ? new Date(body.completed) : existing.checkOut,
          staffId: existing.staffId,
        });

        if (body.items) {
          await this.replaceUserTaskReports(manager, +id, body.items);
        }
      });

      const query = this.userTasksRepository.createQueryBuilder('userTasks')
        .leftJoinAndSelect('userTasks.reports', 'reports')
        .leftJoinAndSelect('userTasks.reportTemplate', 'reportTemplate')
        .leftJoin('userTasks.staff', 'staff').addSelect(['staff.fullName', 'staff.username'])
        .leftJoin('userTasks.createdUser', 'createdUser')
        .addSelect(['createdUser.fullName', 'createdUser.username', 'createdUser.type'])
        .leftJoin('userTasks.customer', 'customer').addSelect(['customer.fullName', 'customer.username'])
        .leftJoin('customer.customerInfo', 'customerInfo').addSelect([
          'customerInfo.companyName',
          'customerInfo.companyId',
        ])
        .andWhere(`userTasks.id= :id`, { id: +id });
      const ut = await query.getOne();
      if (!ut) {
        return errorCode.NOT_FOUND;
      }

      this.mergeChunkedReportsOnTask(ut);
      const reportsSorted = [...(ut.reports || [])].sort((a, b) => a.order - b.order);

      try {
        const resultRownumber = await this.userTasksRepository.query(`select * from 
            ( SELECT id, ROW_NUMBER() OVER(PARTITION BY 'id' ) AS row_num  
                FROM user_tasks
                ) as t
                WHERE t.id=${ut.id}
                `);
        const rowNum = resultRownumber?.[0]?.row_num ?? 1;
        const pdfFile = await convertHtmlToPdf(ut, reportsSorted, rowNum);
        if (pdfFile) {
          await this.userTasksRepository.update(+id, { pdfFile });
        }
      } catch (error) {
        this.logger.error(`[updateCustomerReports] PDF generation failed for task ${id}`, error);
      }

      return errorCode.SUCCESS;
    } catch (error) {
      const { message: errMsg, details } = buildExceptionResult(error, 'updateCustomerReports');
      console.error('[updateCustomerReports]', errMsg);
      console.error('[updateCustomerReports] details', JSON.stringify(details, null, 2));
      this.logger.debug(error);
      return {
        ...errorCode.EXCEPTION,
        message: errMsg || errorCode.EXCEPTION.message,
        details,
      };
    }
  }

  async updateReportFile(userInfo: IUserInfo, id: number) {
    const query = this.userTasksRepository.createQueryBuilder('userTasks')
      .leftJoinAndSelect('userTasks.reports', 'reports')
      .leftJoinAndSelect('userTasks.reportTemplate', 'reportTemplate')
      .leftJoin('userTasks.staff', 'staff').addSelect(['staff.fullName', 'staff.username'])
      .leftJoin('userTasks.createdUser', 'createdUser')
      .addSelect(['createdUser.fullName', 'createdUser.username', 'createdUser.type'])
      .leftJoin('userTasks.customer', 'customer').addSelect(['customer.fullName', 'customer.username'])
      .leftJoin('customer.customerInfo', 'customerInfo').addSelect([
          'customerInfo.companyName',
          'customerInfo.companyId',
        ])
      .andWhere(`userTasks.id= :id`, { id });
    const newItem = await query.getOne();
    if (!newItem) {
      return errorCode.NOT_FOUND;
    }

    newItem.updatedAt = new Date();
    newItem.updatedBy = userInfo.userId;
    this.mergeChunkedReportsOnTask(newItem);
    const newReports = newItem.reports

    try {
      const resultRownumber = await this.userTasksRepository.query(`select * from 
                                                          ( SELECT id, ROW_NUMBER() OVER(PARTITION BY 'id' ) AS row_num  
                                                              FROM user_tasks
                                                              ) as t
                                                              WHERE t.id=${newItem.id}
                                                              `)
      console.log('convertHtmlToPdf')
      const pdfFile = await convertHtmlToPdf(newItem, newReports.sort((a, b) => a.order - b.order), resultRownumber[0].row_num);
      newItem.pdfFile = pdfFile;
    } catch (error) {
      this.logger.error(`[updateReportFile] PDF generation failed for task ${id}`, error);
    }
    const result = await this.userTasksRepository.save(newItem);
    if (!result)
      return errorCode.EXCEPTION;
  }

  async updateReportItem(userInfo: IUserInfo, id: number, body: UserTaskItemDto) {
    try {
      const data = await this.uerTaskReportsRepository.findOne({ where: { id } });
      if (!data) return errorCode.NOT_FOUND;
      data.name = body.name;
      data.value = body.value;
      data.type = body.type;
      data.order = body.order;
      const taskSaved = await this.uerTaskReportsRepository.save(data);
      if (!taskSaved) {
        return errorCode.EXCEPTION;
      }
      await this.updateReportFile(userInfo, id)
      return errorCode.SUCCESS;
    } catch (error) {
      console.log("error", error);
      this.logger.debug(error);
      return errorCode.EXCEPTION;
    }
  }

  async removeItem(id: number) {
    const item = await this.userTasksRepository.findOne({ where: { id } });
    if (!item)
      return errorCode.EXCEPTION;

    const result = await this.userTasksRepository.delete(id);
    if (result.affected > 0)
      return errorCode.SUCCESS;
    else return errorCode.NOT_FOUND
  }


  async checkReportTemplate(templateId: string) {
    return await this.userTasksRepository.count({ where: { reportTemplateId: +templateId } })
  }

  /**
   * Unlink submitted reports from a template before the template row is deleted.
   * Does not modify user_task_reports or delete user_tasks.
   */
  async detachReportsFromReportTemplate(
    templateId: number,
    templateName?: string,
  ): Promise<number> {
    const tid = +templateId;
    if (!Number.isFinite(tid) || tid <= 0) return 0;

    const linked = await this.userTasksRepository.count({ where: { reportTemplateId: tid } });
    if (!linked) return 0;

    const name = (templateName ?? '').trim();
    await this.userTasksRepository.query(
      `UPDATE public.user_tasks
       SET report_template_id = NULL,
           task_name = CASE
             WHEN COALESCE(TRIM(task_name), '') = '' AND $2::text <> '' THEN $2::text
             ELSE task_name
           END
       WHERE report_template_id = $1`,
      [tid, name],
    );
    return linked;
  }

}