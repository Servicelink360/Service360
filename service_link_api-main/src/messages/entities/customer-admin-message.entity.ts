import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CustomerAdminThread } from './customer-admin-thread.entity';

@Entity('customer_admin_messages')
export class CustomerAdminMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'thread_id' })
  threadId: number;

  @ManyToOne(() => CustomerAdminThread, (t) => t.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'thread_id' })
  thread?: CustomerAdminThread;

  @Column({ name: 'sender_id' })
  senderId: number;

  @Column({ name: 'sender_type' })
  senderType: number;

  @Column({ type: 'text' })
  body: string;

  @Column({ name: 'report_fault_id', nullable: true })
  reportFaultId?: number;

  @Column({ name: 'user_task_id', nullable: true })
  userTaskId?: number;

  @Column({ name: 'report_reference', type: 'text', nullable: true })
  reportReference?: string;

  @Column({ name: 'attach_files', type: 'text', nullable: true })
  attachFiles?: string;

  /** JSON array of customer user ids Cc'd on this message (same company peers). */
  @Column({ name: 'cc_customer_ids', type: 'text', nullable: true })
  ccCustomerIds?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
