import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { ReportTemplate } from './report-template.entity';
import { Service } from '../../services/entities/service.entity';

@Entity({ name: 'report_template_services' })
export class ReportTemplateService {
  @PrimaryColumn({ name: 'report_template_id' })
  reportTemplateId: number;

  @PrimaryColumn({ name: 'service_id' })
  serviceId: number;

  @CreateDateColumn({
    name: 'created_at',
    default: () => 'NOW()',
  })
  createdAt: Date;

  @ManyToOne(() => ReportTemplate, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'report_template_id' })
  reportTemplate?: ReportTemplate;

  @ManyToOne(() => Service, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_id' })
  service?: Service;
}
