import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { ReportFault } from './report-fault.entity';

@Entity('report_fault_admin_visibility')
@Unique(['reportFaultId', 'userId'])
export class ReportFaultAdminVisibility {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'report_fault_id' })
  reportFaultId: number;

  @ManyToOne(() => ReportFault, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'report_fault_id' })
  reportFault?: ReportFault;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'badge_dismissed_at', type: 'timestamp', nullable: true })
  badgeDismissedAt?: Date | null;
}
