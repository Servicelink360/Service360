import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ConsumableDelivery } from './consumable-delivery.entity';

@Entity('consumable_delivery_events')
export class ConsumableDeliveryEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'delivery_id' })
  deliveryId: number;

  @JoinColumn({ name: 'delivery_id' })
  @ManyToOne(() => ConsumableDelivery, { onDelete: 'CASCADE' })
  delivery?: ConsumableDelivery;

  /** created | updated | send_ok | send_failed */
  @Column({ length: 40 })
  action: string;

  @Column({ name: 'actor_id', nullable: true })
  actorId: number | null;

  @JoinColumn({ name: 'actor_id' })
  @ManyToOne(() => User, { nullable: true })
  actor?: User;

  @Column({ name: 'emailed_to', type: 'text', nullable: true })
  emailedTo: string | null;

  @Column({ name: 'emailed_cc', type: 'text', nullable: true })
  emailedCc: string | null;

  @Column({ type: 'text', nullable: true })
  detail: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
