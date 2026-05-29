import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "../../base/baseEntity";
import { Site } from "../../sites/entities/site.entity";
import { User } from "../../users/entities/user.entity";
import { UserDailyJobItem } from "./user-daily-job-items.entity";

@Entity('user_daily_jobs')
export class UserDailyJob extends BaseEntity {
    @Column({ name: 'site_id' })
    siteId: number

    @JoinColumn({ name: 'site_id' })
    @ManyToOne(() => Site, { orphanedRowAction: 'delete' })
    site?: Site


    @Column({ name: 'site_location' })
    siteLocation: string


    @Column({ name: 'staff_id' })
    staffId: number


    @JoinColumn({ name: 'staff_id' })
    @ManyToOne(() => User, { orphanedRowAction: 'delete' })
    staff?: User

    @Column({ name: 'date' })
    date: Date


    @OneToMany(() => UserDailyJobItem, t => t.userDailyJob, { cascade: true })
    items?: UserDailyJobItem[]
}
