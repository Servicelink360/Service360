import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminPersonnel } from './entities/admin-personnel.entity';
import { AdminPersonnelRoleType } from './entities/admin-personnel-role-type.entity';
import { AdminPersonnelController } from './admin-personnel.controller';
import { AdminPersonnelService } from './admin-personnel.service';

@Module({
  imports: [TypeOrmModule.forFeature([AdminPersonnel, AdminPersonnelRoleType])],
  controllers: [AdminPersonnelController],
  providers: [AdminPersonnelService],
  exports: [AdminPersonnelService],
})
export class AdminPersonnelModule {}
