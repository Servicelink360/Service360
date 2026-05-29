
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "../../base/baseEntity";
import { Customer } from "../../users/entities/customer.entity";
import { Site } from "../../sites/entities/site.entity";
import { Service } from "../../services/entities/service.entity";
import { TicketAnswer } from "./ticket-answer.entity";
import { User } from "../../users/entities/user.entity";

@Entity('tickets')
export class Ticket extends BaseEntity {

    @Column()
    subject: string

    @Column({ name: 'customer_id' })
    customerId: number

    @Column({ name: 'customer_name' })
    customerName: string

    @Column({ name: 'company_name' })
    companyName: string

    @JoinColumn({ name: 'customer_id' })
    @ManyToOne(() => User, { orphanedRowAction: 'delete' })
    customer?: User

    @Column({ name: 'site_id' })
    siteId: number

    @Column({ name: 'site_name' })
    siteName: string

    @JoinColumn({ name: 'site_id' })
    @ManyToOne(() => Site, { orphanedRowAction: 'delete' })
    Site?: Site

    @Column({ name: 'service_id' })
    serviceId: number

    @JoinColumn({ name: 'service_id' })
    @ManyToOne(() => Service, { orphanedRowAction: 'delete' })
    service?: Service

    @Column({ name: 'service_name' })
    serviceName: string

    @Column()
    priority: number

    @Column()
    message: string
    
    @Column({name:'attach_files'})
    attachFiles: string
    
    @Column()
    status: number


    @OneToMany(() => TicketAnswer, t => t.ticket, { cascade: true })
    answers?: TicketAnswer[]


    @Column()
    sender: number

}
