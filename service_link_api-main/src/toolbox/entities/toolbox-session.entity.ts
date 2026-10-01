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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
