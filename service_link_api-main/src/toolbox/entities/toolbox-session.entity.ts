import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('toolbox_sessions')
export class ToolboxSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'talk_id' })
  talkId: number;

  @Column({ name: 'site_id', type: 'int', nullable: true })
  siteId?: number | null;

  @Column({ name: 'site_name', type: 'varchar', length: 255, nullable: true })
  siteName?: string | null;

  @Column({ name: 'delivered_by', type: 'int', nullable: true })
  deliveredBy?: number | null;

  @Column({ name: 'delivered_at', type: 'timestamptz' })
  deliveredAt: Date;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ type: 'text', nullable: true })
  minutes?: string | null;

  @Column({ name: 'form_title', type: 'text', nullable: true })
  formTitle?: string | null;

  @Column({ name: 'led_by_name', type: 'varchar', length: 255, nullable: true })
  ledByName?: string | null;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
