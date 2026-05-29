import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { UserDailyJob } from "./user-daily-job.entity";

@Entity('user_daily_job_items')
export class UserDailyJobItem {
    @PrimaryGeneratedColumn()
    id?: number;

    @Column({ name: 'user_daily_job_id' })
    userDailyJobId: number

    @JoinColumn({ name: 'user_daily_job_id' })
    @ManyToOne(() => UserDailyJob, { orphanedRowAction: 'delete' })
    userDailyJob?: UserDailyJob

    @CreateDateColumn({
        default: `now()`,
        nullable: true,
        name: 'created_at'
    })
    createdAt: Date;

    @Column({ name: 'type' })
    type: number

    @Column({ name: 'check_in' })
    checkIn: Date;

    @Column({ name: 'check_out' })
    checkOut: Date;
}
