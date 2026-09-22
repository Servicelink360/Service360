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

  /** Optional topic illustration URL (S3 or site-relative /images/...). */
  @Column({ name: 'image_url', type: 'varchar', length: 1000, nullable: true })
  imageUrl?: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;
}
