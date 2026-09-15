import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('training_quiz_attempts')
export class TrainingQuizAttempt {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'module_id' })
  moduleId: number;

  @Column({ type: 'int' })
  score: number;

  @Column({ type: 'int' })
  total: number;

  @Column({ type: 'boolean', default: false })
  passed: boolean;

  /** [{ questionId, answerKey, correct }] */
  @Column({ type: 'jsonb', default: [] })
  answers: { questionId: number; answerKey: string; correct: boolean }[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
