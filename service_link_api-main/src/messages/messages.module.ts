import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { CustomerAdminThread } from './entities/customer-admin-thread.entity';
import { CustomerAdminMessage } from './entities/customer-admin-message.entity';
import { CustomerAdminMessageDeletion } from './entities/customer-admin-message-deletion.entity';
import { ReportFault } from '../report-faults/entities/report-fault.entity';
import { UserTask } from '../user-tasks/entities/user-task.entity';
import { User } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomerAdminThread,
      CustomerAdminMessage,
      CustomerAdminMessageDeletion,
      ReportFault,
      UserTask,
      User,
    ]),
    forwardRef(() => UsersModule),
  ],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
