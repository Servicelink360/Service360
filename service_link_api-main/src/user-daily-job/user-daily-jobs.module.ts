import { Module } from '@nestjs/common';
import { UserDailyJobsService } from './user-daily-jobs.service';
import { UserDailyJobsController } from './user-daily-jobs.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserDailyJobItem } from './entities/user-daily-job-items.entity';
import { UserDailyJob } from './entities/user-daily-job.entity';
import { Site } from '../sites/entities/site.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserDailyJob, UserDailyJobItem, Site])],
  controllers: [UserDailyJobsController],
  providers: [UserDailyJobsService],
  exports: [UserDailyJobsService],
})
export class UserDailyJobsModule {}
