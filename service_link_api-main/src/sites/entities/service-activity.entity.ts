import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Service } from '../../services/entities/service.entity';

@Entity({ name: 'service_activities' })
@Unique('uq_service_activities_service_name', ['serviceId', 'name'])
export class ServiceActivity {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ name: 'service_id' })
  serviceId: number;

  @JoinColumn({ name: 'service_id' })
  @ManyToOne(() => Service, { orphanedRowAction: 'delete' })
  service?: Service;

  @Column({ length: 255 })
  name: string;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at', default: () => 'now()' })
  createdAt: Date;
}
