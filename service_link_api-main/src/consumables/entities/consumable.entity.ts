import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../base/baseEntity';

@Entity('consumables')
export class Consumable extends BaseEntity {
  @Column()
  name: string;

  /** e.g. Cleaning, Hygiene, Paper, PPE */
  @Column({ length: 64, nullable: true })
  category: string | null;

  @Column({ name: 'stock_code', length: 64, nullable: true })
  stockCode: string | null;

  @Column({ length: 64, default: 'each' })
  unit: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt?: Date | null;
}
