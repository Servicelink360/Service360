import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../base/baseEntity';
import { CustomerCompany } from '../../users/entities/customer-company.entity';

@Entity('assets')
export class Asset extends BaseEntity {
  @Column()
  name: string;

  @Column({ name: 'asset_tag', type: 'varchar', length: 120, nullable: true })
  assetTag?: string | null;

  /** Free-text category (admin-defined). */
  @Column({ type: 'varchar', length: 255, nullable: true })
  category?: string | null;

  /** active | maintenance | retired | disposed */
  @Column({ type: 'varchar', length: 40, default: 'active' })
  status: string;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ name: 'company_name' })
  companyName: string;

  @JoinColumn({ name: 'company_id' })
  @ManyToOne(() => CustomerCompany, { orphanedRowAction: 'delete' })
  company?: CustomerCompany;

  @Column({ name: 'site_id', type: 'int', nullable: true })
  siteId?: number | null;

  @Column({ name: 'site_name', type: 'varchar', length: 255, nullable: true })
  siteName?: string | null;

  @Column({ name: 'location_detail', type: 'varchar', length: 500, nullable: true })
  locationDetail?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  manufacturer?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  model?: string | null;

  @Column({ name: 'serial_number', type: 'varchar', length: 255, nullable: true })
  serialNumber?: string | null;

  @Column({ name: 'install_date', type: 'date', nullable: true })
  installDate?: string | null;

  @Column({ name: 'warranty_expiry', type: 'date', nullable: true })
  warrantyExpiry?: string | null;

  /** good | fair | poor | critical */
  @Column({ type: 'varchar', length: 40, nullable: true })
  condition?: string | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  /** JSON array of file URLs */
  @Column({ name: 'attach_files', default: '[]' })
  attachFiles: string;

  /** Soft-delete for admin Active/Deleted tabs (same pattern as invoices). */
  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt?: Date | null;
}
