import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TrainingModule } from './training-module.entity';

@Entity('training_topics')
export class TrainingTopic {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'module_id' })
  moduleId: number;

  @JoinColumn({ name: 'module_id' })
  @ManyToOne(() => TrainingModule, (m) => m.topics, { onDelete: 'CASCADE' })
  module?: TrainingModule;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;
}
