import { Module } from '@nestjs/common';
import { ReportFaultsService } from './report-faults.service';
import { ReportFaultsController } from './report-faults.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportFaultAnswer } from './entities/report-fault-answer.entity';
import { ReportFault } from './entities/report-fault.entity';
import { ReportFaultAdminVisibility } from './entities/report-fault-admin-visibility.entity';
import { ReportFaultCustomerVisibility } from './entities/report-fault-customer-visibility.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReportFault,
      ReportFaultAnswer,
      ReportFaultAdminVisibility,
      ReportFaultCustomerVisibility,
    ]),
  ],
  controllers: [ReportFaultsController],
  providers: [ReportFaultsService],
  exports: [ReportFaultsService],
})
export class ReportFaultsModule {}
