import { Module, forwardRef } from '@nestjs/common';
import { UserTasksService } from './user-tasks.service';
import { UserTasksController } from './user-tasks.controller';
import { UserTask } from './entities/user-task.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SitesModule } from '../sites/sites.module';
import { UsersModule } from '../users/users.module';
import { UserTaskReport } from './entities/user-task-report.entity';
import { UserTaskCustomerVisibility } from './entities/user-task-customer-visibility.entity';
import { UserTaskAdminVisibility } from './entities/user-task-admin-visibility.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserTask,
      UserTaskReport,
      UserTaskCustomerVisibility,
      UserTaskAdminVisibility,
    ]),
    forwardRef(() => SitesModule),
    forwardRef(() => UsersModule),
  ],
  controllers: [UserTasksController],
  providers: [UserTasksService],
  exports: [UserTasksService],
})
export class UserTasksModule { }
