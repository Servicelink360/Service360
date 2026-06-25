import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'customer_personnel' })
export class CustomerPersonnel {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ length: 200 })
  name: string;

  @Column({ length: 255 })
  email: string;

  @Column({ length: 64, nullable: true })
  phone?: string | null;

  /** Custom personnel type label (per company catalog). */
  @Column({ length: 100, default: 'Personnel' })
  role: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'created_by' })
  createdBy: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
