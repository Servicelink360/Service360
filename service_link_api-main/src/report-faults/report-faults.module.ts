import { Module, forwardRef } from '@nestjs/common';
import { ReportFaultsService } from './report-faults.service';
import { ReportFaultsController } from './report-faults.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportFaultAnswer } from './entities/report-fault-answer.entity';
import { ReportFault } from './entities/report-fault.entity';
import { ReportFaultAdminVisibility } from './entities/report-fault-admin-visibility.entity';
import { ReportFaultCustomerVisibility } from './entities/report-fault-customer-visibility.entity';
import { UsersModule } from '../users/users.module';
import { FaultIssuesModule } from '../fault-issues/fault-issues.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReportFault,
      ReportFaultAnswer,
      ReportFaultAdminVisibility,
      ReportFaultCustomerVisibility,
    ]),
    forwardRef(() => UsersModule),
    FaultIssuesModule,
  ],
  controllers: [ReportFaultsController],
  providers: [ReportFaultsService],
  exports: [ReportFaultsService],
})
export class ReportFaultsModule {}
