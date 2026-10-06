import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('toolbox_talks')
export class ToolboxTalk {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 40, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  brief: string;

  @Column({ type: 'jsonb', default: [] })
  points: string[];

  @Column({ name: 'image_url', type: 'varchar', length: 1000, nullable: true })
  imageUrl?: string | null;

  @Column({ name: 'duration_mins', type: 'int', default: 10 })
  durationMins: number;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  /** 1 = active, 0 = hidden */
  @Column({ type: 'smallint', default: 1 })
  status: number;
}
