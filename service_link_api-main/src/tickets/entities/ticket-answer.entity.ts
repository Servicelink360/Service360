import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne } from "typeorm";
import { User } from "../../users/entities/user.entity";
import { BaseEntity } from "../../base/baseEntity";
import { Ticket } from "./ticket.entity";

@Entity('ticket_answers')
export class TicketAnswer extends BaseEntity {


    @Column({ name: 'ticket_id' })
    ticketId: number

    @JoinColumn({ name: 'ticket_id' })
    @ManyToOne(() => Ticket, { orphanedRowAction: 'delete' })
    ticket?: Ticket

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
