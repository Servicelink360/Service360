

import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { BaseEntity } from "../../base/baseEntity";
import { TaskShift } from "./task-shift.entity";
import { SiteItem } from "../../sites/entities/site-item.entity";
import { ReportTemplate } from "../../report-templates/entities/report-template.entity";
import { User } from "../../users/entities/user.entity";

@Entity('tasks')
export class Task extends BaseEntity {
    @PrimaryGeneratedColumn()
    id?: number;

    @CreateDateColumn({
        default: `now()`,
        nullable: true,
        name: 'created_at'
    })
    createdAt: Date;

    @Column()
    name: string

    @Column({ name: 'site_item_id' })
    siteItemId: string

    @JoinColumn({ name: 'site_item_id' })
    @ManyToOne(() => SiteItem, { orphanedRowAction: 'delete' })
    siteItem?: SiteItem


    @Column()
    description: string


    @OneToMany(() => TaskShift, t => t.task, { cascade: true })
    shifts?: TaskShift[]

    @Column({ name: 'report_template_id', nullable: true })
    reportTemplateId?: number

    @JoinColumn({ name: 'report_template_id' })
    @ManyToOne(() => ReportTemplate, { nullable: true })
    reportTemplate?: ReportTemplate


    @Column({ name: 'staff_id' })
    staffId: number


    @JoinColumn({ name: 'staff_id' })
    @ManyToOne(() => User, { orphanedRowAction: 'delete' })
    staff?: User




    @Column()
    type: string

    @Column({ name: 'type_value' })
    typeValue: string

    @Column({ name: 'start_date' })
    startDate: Date

    @Column({ name: 'end_date' })
    endDate: Date

    @Column()
    status: number

    



}
