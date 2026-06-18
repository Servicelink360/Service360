import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Service } from '../../services/entities/service.entity';
import { FaultIssue } from './fault-issue.entity';

@Entity({ name: 'service_fault_issues' })
export class ServiceFaultIssue {
  @PrimaryColumn({ name: 'service_id' })
  serviceId: number;

  @PrimaryColumn({ name: 'fault_issue_id' })
  faultIssueId: number;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @JoinColumn({ name: 'service_id' })
  @ManyToOne(() => Service, { onDelete: 'CASCADE' })
  service?: Service;

  @JoinColumn({ name: 'fault_issue_id' })
  @ManyToOne(() => FaultIssue, { onDelete: 'CASCADE' })
  faultIssue?: FaultIssue;
}
