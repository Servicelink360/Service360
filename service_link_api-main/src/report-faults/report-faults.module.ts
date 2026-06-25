import { Module, forwardRef } from '@nestjs/common';
import { ReportFaultsService } from './report-faults.service';
import { ReportFaultsController } from './report-faults.controller';
import { PersonnelFaultAccessController } from './personnel-fault-access.controller';
import { PersonnelFaultAccessService } from './personnel-fault-access.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportFaultAnswer } from './entities/report-fault-answer.entity';
import { ReportFault } from './entities/report-fault.entity';
import { ReportFaultAdminVisibility } from './entities/report-fault-admin-visibility.entity';
import { ReportFaultCustomerVisibility } from './entities/report-fault-customer-visibility.entity';
import { PersonnelFaultAccessToken } from './entities/personnel-fault-access-token.entity';
import { UsersModule } from '../users/users.module';
import { FaultIssuesModule } from '../fault-issues/fault-issues.module';
import { CustomerPersonnelModule } from '../customer-personnel/customer-personnel.module';
import { AdminPersonnelModule } from '../admin-personnel/admin-personnel.module';
import { CustomerPersonnel } from '../customer-personnel/entities/customer-personnel.entity';
import { AdminPersonnel } from '../admin-personnel/entities/admin-personnel.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReportFault,
      ReportFaultAnswer,
      ReportFaultAdminVisibility,
      ReportFaultCustomerVisibility,
      PersonnelFaultAccessToken,
      CustomerPersonnel,
      AdminPersonnel,
      User,
    ]),
    forwardRef(() => UsersModule),
    FaultIssuesModule,
    CustomerPersonnelModule,
    AdminPersonnelModule,
  ],
  controllers: [ReportFaultsController, PersonnelFaultAccessController],
  providers: [ReportFaultsService, PersonnelFaultAccessService],
  exports: [ReportFaultsService, PersonnelFaultAccessService],
})
export class ReportFaultsModule {}
