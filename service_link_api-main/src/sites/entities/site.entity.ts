import { Column, Entity, OneToMany } from "typeorm";
import { BaseEntity, StrIdBaseEntity } from "../../base/baseEntity";
import { SiteItem } from "./site-item.entity";
import { UserDailyJob } from "../../user-daily-job/entities/user-daily-job.entity";

@Entity({ name: 'sites' })
export class Site extends BaseEntity {
    @Column({ name: 'name' })
    name: string
    @Column({ name: 'location' })
    location: string
    @Column({ name: 'address_name' })
    addressName: string

    @Column({ name: 'description' })
    description: string

    @Column({ name: 'check_in_distance' })
    checkInDistance:number

    @OneToMany(() => SiteItem, t => t.site, { cascade: true })
    items?: SiteItem[]

    @OneToMany(() => UserDailyJob, t => t.site, { cascade: true })
    userDailyJobs?: UserDailyJob[]
}
