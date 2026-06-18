import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Service } from '../services/entities/service.entity';
import { FaultIssue } from './entities/fault-issue.entity';
import { ServiceFaultIssue } from './entities/service-fault-issue.entity';
import { FaultIssuesController } from './fault-issues.controller';
import { FaultIssuesService } from './fault-issues.service';

@Module({
  imports: [TypeOrmModule.forFeature([FaultIssue, ServiceFaultIssue, Service])],
  controllers: [FaultIssuesController],
  providers: [FaultIssuesService],
  exports: [FaultIssuesService],
})
export class FaultIssuesModule {}
