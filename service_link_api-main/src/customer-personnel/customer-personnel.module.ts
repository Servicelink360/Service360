import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerPersonnel } from './entities/customer-personnel.entity';
import { CustomerPersonnelRoleType } from './entities/customer-personnel-role-type.entity';
import { CustomerPersonnelController } from './customer-personnel.controller';
import { CustomerPersonnelService } from './customer-personnel.service';
import { Customer } from '../users/entities/customer.entity';
import { CustomerCompany } from '../users/entities/customer-company.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerPersonnel, CustomerPersonnelRoleType, Customer, CustomerCompany])],
  controllers: [CustomerPersonnelController],
  providers: [CustomerPersonnelService],
  exports: [CustomerPersonnelService],
})
export class CustomerPersonnelModule {}
