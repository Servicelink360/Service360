import { Module } from '@nestjs/common';
import { ServicesService } from './services.service';
import { ServicesController } from './services.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Service } from './entities/service.entity';
import { ServiceActivity } from '../sites/entities/service-activity.entity';
import { FaultIssuesModule } from '../fault-issues/fault-issues.module';

@Module({
  imports: [TypeOrmModule.forFeature([Service, ServiceActivity]), FaultIssuesModule],
  controllers: [ServicesController],
  providers: [ServicesService],
  exports: [ServicesService],
})
export class ServicesModule {}
