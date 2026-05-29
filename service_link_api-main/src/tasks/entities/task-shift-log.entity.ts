

import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Task } from "./task.entity";
import { BaseEntity } from "../../base/baseEntity";
import { TaskShift } from "./task-shift.entity";

@Entity('task_shift_logs')
export class TaskShiftLog extends BaseEntity {


    @Column({name:'task_shift_id'})
    taskShiftId: number

    @JoinColumn({ name: 'task_shift_id' })
    @ManyToOne(() => TaskShift, { orphanedRowAction: 'delete' })
    taskShift?: TaskShift

    
    @Column({name:'task_name'})
    taskName: string


    @Column({name:'task_id'})
    taskId: number

    @JoinColumn({ name: 'task_id' })
    @ManyToOne(() => Task, { orphanedRowAction: 'delete' })
    task?: Task

    @Column({name:'shift_name'})
    shiftName: string


    @Column()
    type: string

    @Column({name:'type_value'})
    typeValue: string

    @Column({name:'start_date'})
    startDate: Date
    
    @Column({name:'end_date'})
    endDate: Date
    
    @Column()
    status: number


    @Column({name:'action'})
    action: string
}
