import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { errorCode } from 'src/constants/errorCode';
import { Logger } from 'winston';
import { GetInitDataDto } from './dto/get-init-data';
import { isString } from 'class-validator';
import { RolesService } from '../roles/roles.service';
import { UsersService } from '../users/users.service';
import { ServicesService } from '../services/services.service';
import { PositionsService } from '../positions/positions.service';
import { GroupsService } from '../groups/groups.service';
import { SitesService } from '../sites/sites.service';
import { ReportTemplatesService } from '../report-templates/report-templates.service';
import { TasksService } from '../tasks/tasks.service';
import { UserTasksService } from '../user-tasks/user-tasks.service';
import { IUserInfo } from '../interfaces/IUserInfo';
import { TicketsService } from '../tickets/tickets.service';
import { UserDailyJobsService } from '../user-daily-job/user-daily-jobs.service';
import { GetUserTasksByUserDto } from '../user-tasks/dto/get-user-tasks-by-user.dto';
import { generatePresignedUrl, uploadImageToS3 } from '../helpers/util';
import { GeneratePresignedUrlDto, UploadImageDto } from './dto/upload-image.dto';
import { ReportFaultsService } from '../report-faults/report-faults.service';
import { MessagesService } from '../messages/messages.service';
import { CompaniesService } from '../companies/companies.service';
@Injectable()
export class CommonService {
  constructor(
    @Inject('winston')
    private readonly logger: Logger,
    @Inject(forwardRef(() => RolesService)) private readonly rolesService: RolesService,
    @Inject(forwardRef(() => UsersService)) private readonly usersService: UsersService,
    @Inject(forwardRef(() => ServicesService)) private readonly servicesService: ServicesService,
    @Inject(forwardRef(() => PositionsService)) private readonly positionsService: PositionsService,
    @Inject(forwardRef(() => GroupsService)) private readonly groupsService: GroupsService,
    @Inject(forwardRef(() => SitesService)) private readonly sitesService: SitesService,
    @Inject(forwardRef(() => ReportTemplatesService)) private readonly reportTemplatesService: ReportTemplatesService,
    @Inject(forwardRef(() => TasksService)) private readonly tasksService: TasksService,
    @Inject(forwardRef(() => UserTasksService)) private readonly userTasksService: UserTasksService,
    @Inject(forwardRef(() => TicketsService)) private readonly ticketsService: TicketsService,
    @Inject(forwardRef(() => UserDailyJobsService)) private readonly userDailyJobsService: UserDailyJobsService,
    @Inject(forwardRef(() => ReportFaultsService)) private readonly reportFaultsService: ReportFaultsService,
    @Inject(forwardRef(() => MessagesService)) private readonly messagesService: MessagesService,
    @Inject(forwardRef(() => CompaniesService)) private readonly companiesService: CompaniesService,
  ) { }

  async uploadImage(body: UploadImageDto) {
    const image = await uploadImageToS3(body.image);
    return { ...errorCode.SUCCESS, data: image };
  }

  async getInitData(body: GetInitDataDto, userInfo?: IUserInfo) {
    try {
      const data: any = {};
      if (isString(body.items)) {
        body.items = [body.items];
      }
      if (body.items)
        for (const item of body.items) {
          if (item === 'USERS') {
            data.users = (await this.usersService.getUsers()).data;
            data.customerCompanies = (await this.usersService.getCustomerCompanies()).data;
          }
          else if (item === 'ROLES') {
            data.roles = (await this.rolesService.getAll()).data;
          }
          else if (item === 'SERVICES') {
            data.services = (await this.servicesService.getAll()).data;
          }
          else if (item === 'POSITIONS') {
            data.positions = (await this.positionsService.getAll()).data;
          }
          else if (item === 'GROUPS') {
            data.groups = (await this.groupsService.getAll()).data;
          }
          else if (item === 'SITES') {
            data.sites = (await this.sitesService.getAll()).data;
          }
          else if (item === 'REPORT_TEMPLATES') {
            data.reportTemplates = (await this.reportTemplatesService.getAll(userInfo)).data;
          }
          else if (item === 'COMPANIES') {
            const companyOptions = (await this.companiesService.getAllOptions()).data;
            data.companies = companyOptions;
            data.customerCompanies = companyOptions;
          }
        }
      return { ...errorCode.SUCCESS, data };
    } catch (error) {
      console.log("error", error);
      this.logger.error(error);
      return errorCode.EXCEPTION;
    }
  }

  async dashboardData(userInfo: IUserInfo) {
    const siteCount = await this.sitesService.getCount(userInfo)
    const taskCount = await this.tasksService.getCount(userInfo)
    const currentTask = await this.userTasksService.currentTask(userInfo)
    const pendingTaskCount = parseFloat(currentTask.pendingTaskCount)
    const inprogressTaskCount = (currentTask.inprogressTaskCount)
    const successTaskCount = (currentTask.successTaskCount)


    const params = new GetUserTasksByUserDto();
    params.page = 1;
    params.limit = 1;
    params.status = '1';
    params.type = 'CUSTOM';
    const resSubmittedReports = await this.userTasksService.getCountUserTasksByUserId(userInfo, params)
    const submittedReportCount = resSubmittedReports.data;

    let newReportsCount = 0;
    if (+userInfo.type === 3) {
      const resNewReports = await this.userTasksService.countUnopenedStaffCustomReports(userInfo);
      newReportsCount = resNewReports?.data ?? 0;
    } else if (+userInfo.type === 1) {
      const resNewReports = await this.userTasksService.countUnopenedCustomerCustomReports(userInfo);
      newReportsCount = resNewReports?.data ?? 0;
    }

    const resReportFaults = await this.reportFaultsService.dashboard(userInfo)
    let reportFaultsCount = 0;
    if (resReportFaults && Array.isArray(resReportFaults.data) && resReportFaults.data.length > 0 && resReportFaults.data[0].count !== undefined) {
      reportFaultsCount = +resReportFaults.data[0].count;
    }
    const params2: any = { ...params }
    params2.type = null;
    params2.status = 1;
    const resAuditReports = await this.userTasksService.getCountUserTasksByUserId(userInfo, params2)
    const auditReportCount = resAuditReports.data;

    const ticketData = await this.ticketsService.dashboard(userInfo);

    const newTicketCount = (await this.ticketsService.count(2)).data;
    const inprogressTicketCount = (await this.ticketsService.count(3)).data;
    const completedTicketCount = (await this.ticketsService.count(1)).data;

    let messagesUnreadCount = 0;
    if (+userInfo.type === 3 || +userInfo.type === 1 || +userInfo.type === 2) {
      const resMessages = await this.messagesService.unreadCount(userInfo);
      messagesUnreadCount = resMessages?.data ?? 0;
    }

    return {
      ...errorCode.SUCCESS, data: {
        siteCount, taskCount, pendingTaskCount, inprogressTaskCount, successTaskCount, currentTask, ticketData: ticketData.data, submittedReportCount, newReportsCount, reportFaultsCount
        , auditReportCount, newTicketCount, inprogressTicketCount, completedTicketCount, messagesUnreadCount
      }
    };
  }


  async generatePresignedUrl(body: GeneratePresignedUrlDto) {
    const image = await generatePresignedUrl(body.filename, body.mimeType);
    return { ...errorCode.SUCCESS, data: image };
  }

}
