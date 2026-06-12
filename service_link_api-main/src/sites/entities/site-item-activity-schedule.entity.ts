import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SiteItem } from './site-item.entity';
import { ServiceActivity } from './service-activity.entity';

export type ScheduleMonthValue = 'weekly' | 'monthly' | 'fortnight' | 'daily' | null;

@Entity({ name: 'site_item_activity_schedules' })
export class SiteItemActivitySchedule {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ name: 'site_item_id' })
  siteItemId: number;

  @JoinColumn({ name: 'site_item_id' })
  @ManyToOne(() => SiteItem, { orphanedRowAction: 'delete' })
  siteItem?: SiteItem;

  /** Legacy link to service catalogue — optional; new rows use activityName only. */
  @Column({ name: 'activity_id', nullable: true })
  activityId?: number | null;

  @JoinColumn({ name: 'activity_id' })
  @ManyToOne(() => ServiceActivity, { orphanedRowAction: 'delete', nullable: true })
  activity?: ServiceActivity;

  /** Per-site activity label (not shared across sites). */
  @Column({ name: 'activity_name', nullable: true, length: 255 })
  activityName?: string | null;

  @Column({ name: 'access_window', nullable: true, length: 255 })
  accessWindow?: string | null;

  @Column({ name: 'month_01', type: 'varchar', length: 16, nullable: true })
  month01?: ScheduleMonthValue;

  @Column({ name: 'month_02', type: 'varchar', length: 16, nullable: true })
  month02?: ScheduleMonthValue;

  @Column({ name: 'month_03', type: 'varchar', length: 16, nullable: true })
  month03?: ScheduleMonthValue;

  @Column({ name: 'month_04', type: 'varchar', length: 16, nullable: true })
  month04?: ScheduleMonthValue;

  @Column({ name: 'month_05', type: 'varchar', length: 16, nullable: true })
  month05?: ScheduleMonthValue;

  @Column({ name: 'month_06', type: 'varchar', length: 16, nullable: true })
  month06?: ScheduleMonthValue;

  @Column({ name: 'month_07', type: 'varchar', length: 16, nullable: true })
  month07?: ScheduleMonthValue;

  @Column({ name: 'month_08', type: 'varchar', length: 16, nullable: true })
  month08?: ScheduleMonthValue;

  @Column({ name: 'month_09', type: 'varchar', length: 16, nullable: true })
  month09?: ScheduleMonthValue;

  @Column({ name: 'month_10', type: 'varchar', length: 16, nullable: true })
  month10?: ScheduleMonthValue;

  @Column({ name: 'month_11', type: 'varchar', length: 16, nullable: true })
  month11?: ScheduleMonthValue;

  @Column({ name: 'month_12', type: 'varchar', length: 16, nullable: true })
  month12?: ScheduleMonthValue;

  @CreateDateColumn({ name: 'created_at', default: () => 'now()' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', default: () => 'now()' })
  updatedAt: Date;
}
