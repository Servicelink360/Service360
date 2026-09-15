import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('training_progress')
@Unique(['userId', 'moduleId'])
export class TrainingProgress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'module_id' })
  moduleId: number;

  /**
   * not_started | in_progress | topics_done | passed | failed | expired
   */
  @Column({ type: 'varchar', length: 40, default: 'not_started' })
  status: string;

  @Column({ name: 'completed_topic_ids', type: 'jsonb', default: [] })
  completedTopicIds: number[];

  @Column({ name: 'quiz_attempts', type: 'int', default: 0 })
  quizAttempts: number;

  @Column({ name: 'best_score', type: 'int', nullable: true })
  bestScore?: number | null;

  @Column({ name: 'best_total', type: 'int', nullable: true })
  bestTotal?: number | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt?: Date | null;

  @Column({ name: 'topics_completed_at', type: 'timestamptz', nullable: true })
  topicsCompletedAt?: Date | null;

  @Column({ name: 'passed_at', type: 'timestamptz', nullable: true })
  passedAt?: Date | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt?: Date | null;

  @Column({ name: 'certificate_url', type: 'varchar', length: 1000, nullable: true })
  certificateUrl?: string | null;

  @Column({ name: 'certificate_code', type: 'varchar', length: 64, nullable: true })
  certificateCode?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
