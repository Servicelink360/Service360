import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { UserTask } from "./user-task.entity";

@Entity({ name: "user_task_reports" })
@Unique('uq_user_task_reports_task_name', ['userTaskId', 'name'])
export class UserTaskReport {
    @PrimaryGeneratedColumn()
    id: number;

    @CreateDateColumn({
        default: `now()`,
        nullable: true,
        name: 'created_at'
    })
    createdAt: Date;


    @Column({ name: 'user_task_id' })
    userTaskId: number

    @JoinColumn({ name: 'user_task_id' })
    @ManyToOne(() => UserTask, { orphanedRowAction: 'delete' })
    userTask?: UserTask

    @Column()
    name: string
    
    @Column()
    type: string
    
    @Column({ type: 'text' })
    value: string

    @Column()
    order: number
}

