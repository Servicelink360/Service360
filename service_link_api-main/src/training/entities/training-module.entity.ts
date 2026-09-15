import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TrainingTopic } from './training-topic.entity';
import { TrainingQuestion } from './training-question.entity';

@Entity('training_modules')
export class TrainingModule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 40, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'duration_mins', type: 'int', default: 30 })
  durationMins: number;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  /** 1=active, 0=inactive */
  @Column({ type: 'smallint', default: 1 })
  status: number;

  @Column({ name: 'source_file', type: 'varchar', length: 255, nullable: true })
  sourceFile?: string | null;

  /** TRAINING | INDUCTION */
  @Column({ name: 'module_kind', type: 'varchar', length: 20, default: 'TRAINING' })
  moduleKind: string;

  /** Site-specific induction target (null = general). */
  @Column({ name: 'site_id', type: 'int', nullable: true })
  siteId?: number | null;

  @Column({ name: 'site_name', type: 'varchar', length: 255, nullable: true })
  siteName?: string | null;

  /** Days until refresh required after pass; null = never expires. */
  @Column({ name: 'validity_days', type: 'int', nullable: true })
  validityDays?: number | null;

  @Column({ name: 'pass_percent', type: 'int', default: 80 })
  passPercent: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => TrainingTopic, (t) => t.module)
  topics?: TrainingTopic[];

  @OneToMany(() => TrainingQuestion, (q) => q.module)
  questions?: TrainingQuestion[];
}
