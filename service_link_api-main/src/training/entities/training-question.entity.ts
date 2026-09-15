import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TrainingModule } from './training-module.entity';

@Entity('training_questions')
export class TrainingQuestion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'module_id' })
  moduleId: number;

  @JoinColumn({ name: 'module_id' })
  @ManyToOne(() => TrainingModule, (m) => m.questions, { onDelete: 'CASCADE' })
  module?: TrainingModule;

  /** MCQ | TRUE_FALSE */
  @Column({ type: 'varchar', length: 20 })
  type: string;

  @Column({ type: 'text' })
  prompt: string;

  /** [{ key, text }] */
  @Column({ type: 'jsonb', default: [] })
  options: { key: string; text: string }[];

  @Column({ name: 'correct_key', type: 'varchar', length: 20, nullable: true })
  correctKey?: string | null;

  @Column({ name: 'answer_reviewed', type: 'boolean', default: false })
  answerReviewed: boolean;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt?: Date | null;

  @Column({ name: 'reviewed_by', type: 'int', nullable: true })
  reviewedBy?: number | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;
}
