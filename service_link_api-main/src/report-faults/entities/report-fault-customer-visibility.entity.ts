import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { ReportFault } from './report-fault.entity';

@Entity('report_fault_customer_visibility')
@Unique(['reportFaultId', 'userId'])
export class ReportFaultCustomerVisibility {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'report_fault_id' })
  reportFaultId: number;

  @ManyToOne(() => ReportFault, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'report_fault_id' })
  reportFault?: ReportFault;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'hidden_at', type: 'timestamp', nullable: true })
  hiddenAt?: Date | null;

  @Column({ name: 'badge_dismissed_at', type: 'timestamp', nullable: true })
  badgeDismissedAt?: Date | null;

  @Column({ name: 'opened_at', type: 'timestamp', nullable: true })
  openedAt?: Date | null;
}
