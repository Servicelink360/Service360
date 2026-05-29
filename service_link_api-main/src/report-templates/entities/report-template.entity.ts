import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { BaseEntity } from "../../base/baseEntity";
import { ReportTemplateItem } from "./report-template-item.entity";
@Entity('report_templates')
export class ReportTemplate extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string

    @Column()
    description: string

    @Column({ type: 'varchar', length: 120, default: 'GENERAL' })
    category: string

    @Column()
    order: number

    @Column({name:'file_url'})
    fileUrl: string

    @Column()
    status: number

    @Column({ type: 'jsonb', nullable: true })
    settings?: Record<string, any>

    /** 0 = all staff; positive id = one staff; NULL = hidden from all staff in New Report. */
    @Column({ name: 'assigned_staff_id', nullable: true })
    assignedStaffId?: number | null

    @OneToMany(() => ReportTemplateItem, t => t.reportTemplate, { cascade: true })
    items?: ReportTemplateItem[]
}
