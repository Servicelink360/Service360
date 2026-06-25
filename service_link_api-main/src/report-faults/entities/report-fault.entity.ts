import {Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { Customer } from "../../users/entities/customer.entity";
import { Site } from "../../sites/entities/site.entity";
import { Service } from "../../services/entities/service.entity";
import { ReportFaultAnswer } from "./report-fault-answer.entity";
import { BaseEntity } from "../../base/baseEntity";
import { User } from "../../users/entities/user.entity";
@Entity('report_faults')
export class ReportFault  extends BaseEntity{
    @Column()
    subject: string

    @Column({ nullable: true })
    issue: string

    @Column({ name: 'toilet_area', nullable: true })
    toiletArea?: string | null

    @Column({ name: 'customer_id' })
    customerId: number

    @JoinColumn({ name: 'customer_id' })
    @ManyToOne(() => User, { orphanedRowAction: 'delete' })
    customer?: User

    @Column({ name: 'customer_name' })
    customerName: string

    @Column({ name: 'company_name' })
    companyName: string


    @Column({ name: 'site_id', nullable: true })
    siteId: number | null

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


    @OneToMany(() => ReportFaultAnswer, t => t.reportFault, { cascade: true })
    answers?: ReportFaultAnswer[]


    @Column()
    sender: number


    @Column({ name: 'staff_id' })
    staffId: number

    @JoinColumn({ name: 'staff_id' })
    @ManyToOne(() => User, { orphanedRowAction: 'delete' })
    staff?: User

    /** Set when admin opens/views this fault in the list (read/unread column). */
    @Column({ name: 'admin_opened_at', nullable: true })
    adminOpenedAt?: Date

    /** Set when customer opens/views this fault in the list (read/unread column). */
    @Column({ name: 'customer_opened_at', nullable: true })
    customerOpenedAt?: Date

    /** Set when admin opens the Report Faults page (dashboard badge only). */
    @Column({ name: 'admin_dashboard_dismissed_at', nullable: true })
    adminDashboardDismissedAt?: Date

    /** Set when customer opens the Report Faults page (dashboard badge only). */
    @Column({ name: 'customer_dashboard_dismissed_at', nullable: true })
    customerDashboardDismissedAt?: Date

    @Column({ name: 'delegated_to_type', length: 32, nullable: true })
    delegatedToType?: string | null

    @Column({ name: 'delegated_to_personnel_id', nullable: true })
    delegatedToPersonnelId?: number | null

    @Column({ name: 'delegated_to_staff_id', nullable: true })
    delegatedToStaffId?: number | null

    @Column({ name: 'delegated_until', type: 'timestamptz', nullable: true })
    delegatedUntil?: Date | null

    @Column({ name: 'delegated_by', nullable: true })
    delegatedBy?: number | null

    @Column({ name: 'delegated_at', type: 'timestamptz', nullable: true })
    delegatedAt?: Date | null

    @Column({ name: 'delegation_note', type: 'text', nullable: true })
    delegationNote?: string | null

    /** Set when delegatee confirms action (personnel link or service provider acknowledgement). */
    @Column({ name: 'delegated_acted_at', type: 'timestamptz', nullable: true })
    delegatedActedAt?: Date | null

    /** First time personnel opened the magic link. */
    @Column({ name: 'delegation_viewed_at', type: 'timestamptz', nullable: true })
    delegationViewedAt?: Date | null

}
