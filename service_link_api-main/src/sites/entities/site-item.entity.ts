import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, Unique } from "typeorm";
import { Site } from "./site.entity";
import { Service } from "../../services/entities/service.entity";
import { User } from "../../users/entities/user.entity";
import { SiteItemStaff } from "./site-item-staff.entity";
import { Task } from "../../tasks/entities/task.entity";

@Entity({ name: 'site_items' })
@Unique('uq_site_items_site_svc_customer', ['siteId', 'serviceId', 'customerId'])
export class SiteItem {
    @PrimaryGeneratedColumn()
    id?: number;

    @Column({ name: 'site_id' })
    siteId: number

    @JoinColumn({ name: 'site_id' })
    @ManyToOne(() => Site, { orphanedRowAction: 'delete' })
    site?: Site

    @Column({ name: 'service_id' })
    serviceId: number


    @JoinColumn({ name: 'service_id' })
    @ManyToOne(() => Service, { orphanedRowAction: 'delete' })
    service?: Service




    @Column({ name: 'customer_id' })
    customerId: number

    /** Shared org id — same company for all contacts at that customer. */
    @Column({ name: 'company_id', nullable: true })
    companyId?: number | null

    @JoinColumn({ name: 'customer_id' })
    @ManyToOne(() => User, { orphanedRowAction: 'delete' })
    customer?: User


    @CreateDateColumn({
        default: `now()`,
        nullable: true,
        name: 'created_at'
    })
    createdAt: Date;

    /** e.g. 5 in "5 times per 5 months". */
    @Column({ name: 'frequency_times', nullable: true })
    frequencyTimes?: number | null;

    /** Interval count e.g. 5 in "per 5 months". */
    @Column({ name: 'frequency_count', nullable: true })
    frequencyCount?: number | null;

    @Column({ name: 'frequency_period', nullable: true, length: 16 })
    frequencyPeriod?: string | null;

    /** interval | annual | both (both = local unified frequency) */
    @Column({ name: 'frequency_mode', nullable: true, length: 16 })
    frequencyMode?: 'interval' | 'annual' | 'both' | null;

    /** Per site+service override; null inherits service.frequency_type */
    @Column({ name: 'frequency_type', nullable: true, length: 16 })
    frequencyType?: 'simple' | 'detailed' | null;

    @OneToMany(() => SiteItemStaff, t => t.siteItem, { cascade: true })
    staffs?: SiteItemStaff[]

    @OneToMany(() => Task, t => t.siteItem, { cascade: true })
    tasks?: Task[]




}
