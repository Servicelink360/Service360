import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { ReportTemplate } from './report-template.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'report_template_staffs' })
export class ReportTemplateStaff {
  @PrimaryColumn({ name: 'report_template_id' })
  reportTemplateId: number;

  @PrimaryColumn({ name: 'staff_id' })
  staffId: number;

  @CreateDateColumn({
    name: 'created_at',
    default: () => 'NOW()',
  })
  createdAt: Date;

  @ManyToOne(() => ReportTemplate, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'report_template_id' })
  reportTemplate?: ReportTemplate;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'staff_id' })
  staff?: User;
}
