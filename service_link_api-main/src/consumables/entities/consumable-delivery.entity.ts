import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../base/baseEntity';
import { User } from '../../users/entities/user.entity';

@Entity('consumable_deliveries')
export class ConsumableDelivery extends BaseEntity {
  /** Legacy client user id (optional; new orders use supplierId). */
  @Column({ name: 'customer_id', nullable: true })
  customerId: number | null;

  @JoinColumn({ name: 'customer_id' })
  @ManyToOne(() => User, { nullable: true })
  customer?: User | null;

  /** Supply company from consumable_suppliers. */
  @Column({ name: 'supplier_id', nullable: true })
  supplierId: number | null;

  /** Directory company (customer_companies) when ordering to a client company. */
  @Column({ name: 'company_id', nullable: true })
  companyId: number | null;

  @Column({ name: 'customer_name', default: '' })
  customerName: string;

  @Column({ name: 'company_name', default: '' })
  companyName: string;

  @Column({ name: 'site_name', default: '' })
  siteName: string;

  @Column({ length: 500 })
  subject: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  /** JSON array: [{ consumableId, name, unit, quantity }] */
  @Column({ name: 'items_json', type: 'text' })
  itemsJson: string;

  @Column({ name: 'emailed_to', type: 'text', nullable: true })
  emailedTo: string | null;

  @Column({ name: 'emailed_cc', type: 'text', nullable: true })
  emailedCc: string | null;

  @Column({ name: 'emailed_at', type: 'timestamp', nullable: true })
  emailedAt: Date | null;

  @Column({ name: 'email_status', default: 'pending' })
  emailStatus: string;

  /** Last Brevo / mail error message when email_status = failed. */
  @Column({ name: 'email_error', type: 'text', nullable: true })
  emailError: string | null;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt?: Date | null;
}
