import { Module, forwardRef } from '@nestjs/common';
import { CommonService } from './common.service';
import { CommonController } from './common.controller';
import { RolesModule } from '../roles/roles.module';
import { UsersModule } from '../users/users.module';
import { ServicesModule } from '../services/services.module';
import { PositionsModule } from '../positions/positions.module';
import { GroupsModule } from '../groups/groups.module';
import { SitesModule } from '../sites/sites.module';
import { ReportTemplatesModule } from '../report-templates/report-templates.module';
import { TasksModule } from '../tasks/tasks.module';
import { UserTasksModule } from '../user-tasks/user-tasks.module';
import { TicketsModule } from '../tickets/tickets.module';
import { UserDailyJobsModule } from '../user-daily-job/user-daily-jobs.module';
import { ReportFaultsModule } from '../report-faults/report-faults.module';
import { MessagesModule } from '../messages/messages.module';
import { CompaniesModule } from '../companies/companies.module';
import { InvoicesModule } from '../invoices/invoices.module';

@Module({
  imports: [
    forwardRef(() => RolesModule),
    forwardRef(() => UsersModule),
    forwardRef(() => ServicesModule),
    forwardRef(() => PositionsModule),
    forwardRef(() => GroupsModule),
    forwardRef(() => SitesModule),
    forwardRef(() => ReportTemplatesModule),
    forwardRef(() => TasksModule),
    forwardRef(() => UserTasksModule),
    forwardRef(() => TicketsModule),
    forwardRef(() => UserDailyJobsModule),
    forwardRef(() => ReportFaultsModule),
    forwardRef(() => MessagesModule),
    forwardRef(() => CompaniesModule),
    forwardRef(() => InvoicesModule),
  ],
  controllers: [CommonController],
  providers: [CommonService],
  exports: [CommonService]
})
export class CommonModule { }
