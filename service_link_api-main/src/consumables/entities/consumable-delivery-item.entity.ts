import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ConsumableDelivery } from './consumable-delivery.entity';

@Entity('consumable_delivery_items')
export class ConsumableDeliveryItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'delivery_id' })
  deliveryId: number;

  @JoinColumn({ name: 'delivery_id' })
  @ManyToOne(() => ConsumableDelivery, { onDelete: 'CASCADE' })
  delivery?: ConsumableDelivery;

  @Column({ name: 'consumable_id', nullable: true })
  consumableId: number | null;

  @Column()
  name: string;

  @Column({ name: 'stock_code', length: 64, nullable: true })
  stockCode: string | null;

  @Column({ length: 64, default: 'each' })
  unit: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 1 })
  quantity: number;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;
}
