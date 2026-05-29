import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { UserTask } from './user-task.entity';

@Entity('user_task_customer_visibility')
@Unique(['userTaskId', 'userId'])
export class UserTaskCustomerVisibility {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_task_id' })
  userTaskId: number;

  @ManyToOne(() => UserTask, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_task_id' })
  userTask?: UserTask;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'hidden_at', type: 'timestamp', nullable: true })
  hiddenAt?: Date | null;

  @Column({ name: 'badge_dismissed_at', type: 'timestamp', nullable: true })
  badgeDismissedAt?: Date | null;

  @Column({ name: 'opened_at', type: 'timestamp', nullable: true })
  openedAt?: Date | null;
}
