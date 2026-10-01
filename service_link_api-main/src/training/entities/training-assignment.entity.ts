import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('training_assignments')
export class TrainingAssignment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'module_id' })
  moduleId: number;

  /** Specific staff; null = all staff (optionally filtered by site_id). */
  @Column({ name: 'staff_id', type: 'int', nullable: true })
  staffId?: number | null;

  /** If set (and staff_id null), assign to staff on this site. */
  @Column({ name: 'site_id', type: 'int', nullable: true })
  siteId?: number | null;

  @Column({ name: 'site_name', type: 'varchar', length: 255, nullable: true })
  siteName?: string | null;

  @Column({ name: 'due_at', type: 'timestamptz', nullable: true })
  dueAt?: Date | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ name: 'assigned_by', type: 'int', nullable: true })
  assignedBy?: number | null;

  /** When true, a certificate is issued after every module in this assignment is passed. */
  @Column({ name: 'issue_certificate', type: 'boolean', default: false })
  issueCertificate: boolean;

  /** Named certificate from training_certificates, used when issueCertificate is set. */
  @Column({ name: 'certificate_id', type: 'int', nullable: true })
  certificateId?: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
