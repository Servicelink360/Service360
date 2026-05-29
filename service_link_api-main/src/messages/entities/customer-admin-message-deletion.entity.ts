import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { CustomerAdminMessage } from './customer-admin-message.entity';

@Entity('customer_admin_message_deletions')
@Unique(['messageId', 'userId'])
export class CustomerAdminMessageDeletion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'message_id' })
  messageId: number;

  @ManyToOne(() => CustomerAdminMessage, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'message_id' })
  message?: CustomerAdminMessage;

  @Column({ name: 'user_id' })
  userId: number;

  @CreateDateColumn({ name: 'deleted_at' })
  deletedAt: Date;

  /** Set when user empties Deleted — hidden from all tabs for this user. */
  @Column({ name: 'purged_at', type: 'timestamp', nullable: true })
  purgedAt?: Date | null;
}
