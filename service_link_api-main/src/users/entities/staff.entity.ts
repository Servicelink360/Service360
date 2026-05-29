import { Column, Entity, JoinColumn, OneToOne } from "typeorm";
import { User } from "./user.entity";
@Entity({ name: "staff" })
export class Staff  {
    @Column({ name: 'user_id',primary:true })
    userId: number

    @JoinColumn({ name: 'user_id' })
    @OneToOne(() => User, { orphanedRowAction: 'delete' })
    user?: User

    @Column({ name: 'start_date' })
    startDate: Date

    @Column({ name: 'ratings' })
    ratings: number

    @Column({ name: 'company_name' })
    companyName: string

}

