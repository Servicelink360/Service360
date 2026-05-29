import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { User } from "../../users/entities/user.entity";
import { ReportTemplate } from "../../report-templates/entities/report-template.entity";
import { UserTaskReport } from "./user-task-report.entity";

@Entity({ name: "user_tasks" })
export class UserTask {
    @PrimaryGeneratedColumn()
    id: number;

    @CreateDateColumn({
        default: `now()`,
        nullable: true,
        name: 'created_at'
    })
    createdAt: Date;


    @Column({ name: 'staff_id' })
    staffId: number

    @JoinColumn({ name: 'staff_id' })
    @ManyToOne(() => User, { orphanedRowAction: 'delete' })
    staff?: User

    @Column({ name: 'status' })
    status: number


    @Column({ name: 'updated_at' })
    updatedAt: Date



    @Column({ name: 'task_shift_id' })
    taskShiftId: number


    @Column({ name: 'task_id' })
    taskId: number


    @Column({ name: 'task_name' })
    taskName: string


    @Column({ name: 'site_id' })
    siteId: number

    @Column({ name: 'site_name' })
    siteName: string

    @Column({ name: 'site_address' })
    siteAddress: string

    @Column({ name: 'site_location' })
    siteLocation: string

    @Column({ name: 'customer_id' })
    customerId: number

    @JoinColumn({ name: 'customer_id' })
    @ManyToOne(() => User, { orphanedRowAction: 'delete' })
    customer?: User

    @Column({ name: 'customer_name' })
    customerName: string


    @Column({ name: 'service_id', nullable: true })
    serviceId: number | null


    @Column({ name: 'service_name' })
    serviceName: string


    @Column({ name: 'report_template_id', nullable: true })
    reportTemplateId?: number

    @JoinColumn({ name: 'report_template_id' })
    @ManyToOne(() => ReportTemplate, { nullable: true })
    reportTemplate?: ReportTemplate

    @Column({ name: 'description' })
    description: string

    @Column({ name: 'start_time' })
    startTime: Date

    @Column({ name: 'end_time' })
    endTime: Date

    @Column({ name: 'notifies_staff' })
    notifiesStaff: number


    @Column({ name: 'created_by' })
    createdBy: number

    @JoinColumn({ name: 'created_by' })
    @ManyToOne(() => User)
    createdUser?: User

    @Column({ name: 'updated_by' })
    updatedBy: number


    @JoinColumn({ name: 'updated_by' })
    @ManyToOne(() => User)
    updatedUser?: User


    @Column({ name: 'type' })
    type: string

    @Column({ name: 'company_name' })
    companyName: string

    @Column({ name: 'check_in' })
    checkIn: Date

    @Column({ name: 'check_out' })
    checkOut: Date

    @Column({ name: 'images', nullable: true, type: 'varchar', length: 10000 })
    images?: string

    @Column({ name: 'pdf_file' })
    pdfFile: string

    /** Set when an admin opens/views a report in the list (read/unread column). */
    @Column({ name: 'admin_opened_at', nullable: true })
    adminOpenedAt?: Date

    /** Set when the customer opens/views a report in the list (read/unread column). */
    @Column({ name: 'customer_opened_at', nullable: true })
    customerOpenedAt?: Date

    /** Set when admin opens the New Reports page (dashboard badge only). */
    @Column({ name: 'admin_dashboard_dismissed_at', nullable: true })
    adminDashboardDismissedAt?: Date

    /** Set when customer opens the New Reports page (dashboard badge only). */
    @Column({ name: 'customer_dashboard_dismissed_at', nullable: true })
    customerDashboardDismissedAt?: Date

    /** Set when staff opens their own submitted report (new-reports read/unread). */
    @Column({ name: 'staff_opened_at', nullable: true })
    staffOpenedAt?: Date

    /** Staff "Clear deleted": hide deleted reports from Deleted tab without removing data. */
    @Column({ name: 'cleared_at', nullable: true })
    clearedAt?: Date

    
    @OneToMany(() => UserTaskReport, t => t.userTask, { cascade: true })
    reports?: UserTaskReport[]

}

