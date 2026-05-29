import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ReportTemplate } from "./report-template.entity";
@Entity('report_template_items')
export class ReportTemplateItem {
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

    @Column()
    type: string


    @Column({ type: 'text', nullable: true })
    value?: string

    @Column({ type: 'boolean', default: false })
    required: boolean;

    @Column({ type: 'jsonb', nullable: true })
    config?: Record<string, any>

    @Column({ name: 'report_template_id' })
    reportTemplateId: number


    @JoinColumn({ name: 'report_template_id' })
    @ManyToOne(() => ReportTemplate, { orphanedRowAction: 'delete' })
    reportTemplate?: ReportTemplate

    @Column()
    order: number
}
