import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import databaseConfig from './config/database.config'
import authConfig from './config/auth.config'
import appConfig from './config/app.config';
import { CommonModule } from './common/common.module';
import { WinstonModule } from 'nest-winston';
import { join } from 'path';
import * as winston from 'winston';
import { UploadModule } from './upload/upload.module';
import { RedisModule } from '@nestjs-modules/ioredis';
import config from './config';
import { RolesModule } from './roles/roles.module';
import { ServicesModule } from './services/services.module';
import { PositionsModule } from './positions/positions.module';
import { GroupsModule } from './groups/groups.module';
import { SitesModule } from './sites/sites.module';
import { SettingsModule } from './settings/settings.module';
import { TasksModule } from './tasks/tasks.module';
import { ReportTemplatesModule } from './report-templates/report-templates.module';
import { UserTasksModule } from './user-tasks/user-tasks.module';
import { LogsModule } from './logs/logs.module';
import { TicketsModule } from './tickets/tickets.module';
import { ReportFaultsModule } from './report-faults/report-faults.module';
import { UserDailyJobsModule } from './user-daily-job/user-daily-jobs.module';
import { AdminModule } from './admin/admin.module';
import { MessagesModule } from './messages/messages.module';
import { CompaniesModule } from './companies/companies.module';
import { DeployStatusController } from './deploy-status.controller';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        databaseConfig,
        authConfig,
      ],
    }),
    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({
          dirname: join(__dirname, './../log/error/'), //path to where save loggin result 
          filename: 'error.log', //name of file where will be saved logging result
          level: 'error',
        }),
        new winston.transports.File({
          dirname: join(__dirname, './../log/info/'),
          filename: 'info.log',
          level: 'info',
        }),
      ],
      format: winston.format.combine(
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      exitOnError: false
    }),
    RedisModule.forRoot({
      config: {
        url: 'redis://' + config.REDIS_IP + ':' + config.REDIS_PORT,
        password: config.REDIS_PASSWORD,
        // Without this, signIn can hang for minutes when Redis is down (commands queue + retry).
        enableOfflineQueue: false,
        maxRetriesPerRequest: 3,
        connectTimeout: 10_000,
      },
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    AuthModule,
    CommonModule,
    UploadModule,
    RolesModule,
    ServicesModule,
    PositionsModule,
    GroupsModule,
    SitesModule,
    SettingsModule,
    TasksModule,
    ReportTemplatesModule,
    UserTasksModule,
    LogsModule,
    TicketsModule,
    ReportFaultsModule,
    UserDailyJobsModule,
    AdminModule,
    MessagesModule,
    CompaniesModule,
  ],
  controllers: [DeployStatusController],
  providers: [AppService],

})
export class AppModule { }
