import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'customer_personnel_role_types' })
export class CustomerPersonnelRoleType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ length: 100 })
  label: string;

  @Column({ name: 'normalized_label', length: 100 })
  normalizedLabel: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
