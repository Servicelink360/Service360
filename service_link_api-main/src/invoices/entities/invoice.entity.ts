import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../base/baseEntity';
import { User } from '../../users/entities/user.entity';

@Entity('invoices')
export class Invoice extends BaseEntity {
  @Column({ name: 'customer_id' })
  customerId: number;

  @Column({ name: 'customer_name' })
  customerName: string;

  @Column({ name: 'company_name' })
  companyName: string;

  @JoinColumn({ name: 'customer_id' })
  @ManyToOne(() => User, { orphanedRowAction: 'delete' })
  customer?: User;

  /** Hidden from admin active list; clients can still see the invoice. */
  @Column({ name: 'admin_deleted_at', type: 'timestamp', nullable: true })
  adminDeletedAt?: Date | null;

  @Column()

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  /** JSON array of file URLs (PDF, docs, etc.) */
  @Column({ name: 'attach_files' })
  attachFiles: string;
}
