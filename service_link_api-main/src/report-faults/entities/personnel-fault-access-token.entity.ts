import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'personnel_fault_access_tokens' })
export class PersonnelFaultAccessToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'report_fault_id' })
  reportFaultId: number;

  @Column({ name: 'personnel_id', nullable: true })
  personnelId?: number | null;

  @Column({ name: 'admin_personnel_id', nullable: true })
  adminPersonnelId?: number | null;

  @Column({ name: 'token_hash', length: 64, unique: true })
  tokenHash: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'last_accessed_at', type: 'timestamptz', nullable: true })
  lastAccessedAt?: Date | null;
}
