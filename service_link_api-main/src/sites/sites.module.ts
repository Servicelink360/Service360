import { Module, forwardRef } from '@nestjs/common';
import { SitesService } from './sites.service';
import { SitesController } from './sites.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Site } from './entities/site.entity';
import { SiteItem } from './entities/site-item.entity';
import { SiteItemStaff } from './entities/site-item-staff.entity';
import { TasksModule } from '../tasks/tasks.module';
import { SiteItemStaffShift } from './entities/site-item-staff-shift.entity';
import { ServiceActivity } from './entities/service-activity.entity';
import { SiteItemActivitySchedule } from './entities/site-item-activity-schedule.entity';
import { Service } from '../services/entities/service.entity';

@Module({
  imports: [TypeOrmModule.forFeature([
    Site, SiteItem, SiteItemStaff, SiteItemStaffShift,
    ServiceActivity, SiteItemActivitySchedule, Service,
  ])
    , forwardRef(() => TasksModule)],
  controllers: [SitesController],
  providers: [SitesService],
  exports: [SitesService],
})
export class SitesModule { }
