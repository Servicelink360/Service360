import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../base/baseEntity';

/** Supplier / supply company used with consumables. */
@Entity('consumable_suppliers')
export class ConsumableSupplier extends BaseEntity {
  /** Links to directory company (customer_companies). */
  @Column({ name: 'company_id', type: 'int', nullable: true })
  companyId: number | null;

  /** Denormalized company name (from company or legacy free text). */
  @Column({ length: 255 })
  name: string;

  /** Optional supply category, e.g. Cleaning, PPE */
  @Column({ length: 64, nullable: true })
  category: string | null;

  @Column({ name: 'contact_name', length: 255, nullable: true })
  contactName: string | null;

  @Column({ length: 255, nullable: true })
  email: string | null;

  @Column({ length: 64, nullable: true })
  phone: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ length: 255, nullable: true })
  website: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt?: Date | null;
}
