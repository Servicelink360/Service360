import { forwardRef, Module } from '@nestjs/common';
import { ReportTemplatesService } from './report-templates.service';
import { ReportTemplatesController } from './report-templates.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportTemplateItem } from './entities/report-template-item.entity';
import { ReportTemplate } from './entities/report-template.entity';
import { ReportTemplateCategory } from './entities/report-template-category.entity';
import { ReportTemplateService } from './entities/report-template-service.entity';
import { UserTasksModule } from '../user-tasks/user-tasks.module';

@Module({
  imports: [TypeOrmModule.forFeature([ReportTemplate, ReportTemplateItem, ReportTemplateCategory, ReportTemplateService]), forwardRef(() => UserTasksModule)],
  controllers: [ReportTemplatesController],
  providers: [ReportTemplatesService],
  exports: [ReportTemplatesService],
})
export class ReportTemplatesModule {}
