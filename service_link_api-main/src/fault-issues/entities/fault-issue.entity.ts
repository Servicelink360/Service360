import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity({ name: 'fault_issues' })
@Unique('uq_fault_issues_label', ['label'])
export class FaultIssue {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ length: 200 })
  label: string;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', default: () => 'now()' })
  createdAt: Date;
}
