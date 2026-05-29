import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { SiteItemStaff } from "./site-item-staff.entity";

@Entity({name:'site_item_staff_shifts'})
export class SiteItemStaffShift  {
    @PrimaryGeneratedColumn()
    id?: number;
 
    @Column({name:'site_item_staff_id'})
    siteItemStaffId: number

    @JoinColumn({ name: 'site_item_staff_id' })
    @ManyToOne(() => SiteItemStaff, { orphanedRowAction: 'delete' })
    siteItemStaff?: SiteItemStaff

    @Column({ name: 'start_time' })
    startTime: string

    @Column({ name: 'end_time' })
    endTime: string

  
    //for shift time

    @Column()
    type: string

    @Column({ name: 'type_value' })
    typeValue: string

}
