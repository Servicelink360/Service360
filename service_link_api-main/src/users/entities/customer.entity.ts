import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from "typeorm";
import { User } from "./user.entity";
import { CustomerCompany } from "./customer-company.entity";
@Entity({ name: "customers" })
export class Customer {
    @Column({ name: 'user_id', primary: true })
    userId: number

    @JoinColumn({ name: 'user_id' })
    @OneToOne(() => User, { orphanedRowAction: 'delete' })
    user?: User

    @Column({ name: 'city' })
    city: string

    @Column({ name: 'state' })
    state: string

    @Column({ name: 'post_code' })
    postCode: string

    @Column({ name: 'country' })
    country: string

    @Column({ name: 'website' })
    website: string

    @Column({ name: 'location' })
    location: string

    @Column({ name: 'land_line' })
    landLine: string

    @Column({ name: 'description' })
    description: string


    @Column({ name: 'send_login_info' })
    sendLoginInfo: number

    @Column({ name: 'show_qr_code' })
    showQrCode: number

    @Column({ name: 'company_name' })
    companyName: string

    /** Same for every customer user at this organisation; user_id stays unique per person. */
    @Column({ name: 'company_id', nullable: true })
    companyId?: number | null

    @ManyToOne(() => CustomerCompany, { nullable: true })
    @JoinColumn({ name: 'company_id' })
    company?: CustomerCompany

    @Column({ name: 'company_phone' })
    companyPhone: string

    @Column({ name: 'company_email' })
    companyEmail: string

    /** Opt-in: email for non-urgent fault reports. */
    @Column({ name: 'email_notify_normal_fault_reports', default: false })
    emailNotifyNormalFaultReports: boolean

    /** Opt-in: email for urgent (priority 1) fault reports. */
    @Column({ name: 'email_notify_urgent_fault_reports', default: false })
    emailNotifyUrgentFaultReports: boolean

    /** Opt-in: email when a new submitted report is available. */
    @Column({ name: 'email_notify_new_reports', default: false })
    emailNotifyNewReports: boolean

    /** Opt-in: email when Servicelink/staff sends an in-app message. */
    @Column({ name: 'email_notify_messages', default: false })
    emailNotifyMessages: boolean


}

