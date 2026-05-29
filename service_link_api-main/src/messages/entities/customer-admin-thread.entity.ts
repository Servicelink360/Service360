import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CustomerAdminMessage } from './customer-admin-message.entity';

@Entity('customer_admin_threads')
export class CustomerAdminThread {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'customer_id', nullable: true })
  customerId?: number;

  @Column({ name: 'staff_id', nullable: true })
  staffId?: number;

  /** Other staff member in a staff ↔ staff colleague thread. */
  @Column({ name: 'peer_staff_id', nullable: true })
  peerStaffId?: number;

  @Column({ name: 'customer_last_read_at', type: 'timestamp', nullable: true })
  customerLastReadAt?: Date;

  @Column({ name: 'staff_last_read_at', type: 'timestamp', nullable: true })
  staffLastReadAt?: Date;

  @Column({ name: 'admin_last_read_at', type: 'timestamp', nullable: true })
  adminLastReadAt?: Date;

  @Column({ name: 'last_message_preview', type: 'text', nullable: true })
  lastMessagePreview?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => CustomerAdminMessage, (m) => m.thread)
  messages?: CustomerAdminMessage[];
}
