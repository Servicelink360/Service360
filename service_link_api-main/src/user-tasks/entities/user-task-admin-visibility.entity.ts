import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { UserTask } from './user-task.entity';

@Entity('user_task_admin_visibility')
@Unique(['userTaskId', 'userId'])
export class UserTaskAdminVisibility {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_task_id' })
  userTaskId: number;

  @ManyToOne(() => UserTask, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_task_id' })
  userTask?: UserTask;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'badge_dismissed_at', type: 'timestamp', nullable: true })
  badgeDismissedAt?: Date | null;
}
