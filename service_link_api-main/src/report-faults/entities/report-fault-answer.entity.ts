import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne } from "typeorm";
import { User } from "../../users/entities/user.entity";
import { BaseEntity } from "../../base/baseEntity";
import { ReportFault } from "./report-fault.entity";

@Entity('report_fault_answers')
export class ReportFaultAnswer extends BaseEntity {


    @Column({ name: 'report_fault_id' })
    reportFaultId: number

    @JoinColumn({ name: 'report_fault_id' })
    @ManyToOne(() => ReportFault, { orphanedRowAction: 'delete' })
    reportFault?: ReportFault

    @Column()
    message: string
    
    @CreateDateColumn({
        default: `now()`,
        nullable: true,
        name: 'created_at'
    })
    createdAt: Date;

    @Column({ name: 'user_id' })
    userId: number

    @JoinColumn({ name: 'user_id' })
    @ManyToOne(() => User, { orphanedRowAction: 'delete' })
    user?: User

    @Column({ name: 'type' })
    type: number

    @Column({name:'attach_files'})
    attachFiles: string

}
