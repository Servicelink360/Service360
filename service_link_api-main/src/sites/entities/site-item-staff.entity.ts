import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, Unique } from "typeorm";
import { Site } from "./site.entity";
import { Service } from "../../services/entities/service.entity";
import { User } from "../../users/entities/user.entity";
import { SiteItem } from "./site-item.entity";
import { SiteItemStaffShift } from "./site-item-staff-shift.entity";

@Entity({ name: 'site_item_staffs' })
@Unique('uq_site_item_staffs_item_staff', ['siteItemId', 'staffId'])
export class SiteItemStaff {

    @PrimaryGeneratedColumn()
    id?: number;


    @Column({ name: 'site_item_id'})
    siteItemId: number

    @JoinColumn({ name: 'site_item_id' })
    @ManyToOne(() => SiteItem, { orphanedRowAction: 'delete' })
    siteItem?: SiteItem

    @Column({ name: 'staff_id'})
    staffId: number


    @JoinColumn({ name: 'staff_id' })
    @ManyToOne(() => User, { orphanedRowAction: 'delete' })
    staff?: User

    @CreateDateColumn({
        default: `now()`,
        nullable: true,
        name: 'created_at'
    })
    createdAt: Date;

    @OneToMany(() => SiteItemStaffShift, t => t.siteItemStaff, { cascade: true })
    staffShifts?: SiteItemStaffShift[]
}
