

import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Task } from "./task.entity";
import { BaseEntity } from "../../base/baseEntity";
import { TaskShiftLog } from "./task-shift-log.entity";
import { User } from "../../users/entities/user.entity";

@Entity('task_shifts')
export class TaskShift  {
    @PrimaryGeneratedColumn()
    id?: number;

    @CreateDateColumn({
        default: `now()`,
        nullable: true,
        name: 'created_at'
    })
    createdAt: Date;
    @Column({ name: 'task_id' })
    taskId: number

    @JoinColumn({ name: 'task_id' })
    @ManyToOne(() => Task, { orphanedRowAction: 'delete' })
    task?: Task

    @Column()
    from: string

    @Column()
    to: string

    @Column({name:'reminder_times'})
    reminderTimes: number


    @Column({name:'reminder_day'})
    reminderDay: string


    @OneToMany(() => TaskShiftLog, t => t.taskShift, { cascade: true })
    logs?: TaskShiftLog[]

}
