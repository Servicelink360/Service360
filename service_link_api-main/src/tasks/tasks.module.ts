import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { Task } from './entities/task.entity';
import { TaskShift } from './entities/task-shift.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskShiftLog } from './entities/task-shift-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Task,TaskShift,TaskShiftLog])],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
