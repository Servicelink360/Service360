import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'admin_personnel_role_types' })
export class AdminPersonnelRoleType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  label: string;

  @Column({ name: 'normalized_label', length: 100 })
  normalizedLabel: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
