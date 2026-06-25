import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'admin_personnel' })
export class AdminPersonnel {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  name: string;

  @Column({ length: 255 })
  email: string;

  @Column({ length: 64, nullable: true })
  phone?: string | null;

  @Column({ length: 100, default: 'Staff' })
  role: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'created_by' })
  createdBy: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
