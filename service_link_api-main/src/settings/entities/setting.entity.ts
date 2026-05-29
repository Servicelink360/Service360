import { Column, JoinColumn, ManyToOne, CreateDateColumn, UpdateDateColumn, Entity } from "typeorm";
import { User } from "../../users/entities/user.entity";

@Entity('settings')
export class Setting  {
    @Column({ name: 'setting_key',primary:true })
    settingKey: string

    @Column({ name: 'setting_value' })
    settingValue: string

    @Column({ name: 'setting_lable' })
    settingLable: string

    @Column({ name: 'setting_type' })
    settingType: string

    @Column({ name: 'created_by' })
    createdBy: number

    @JoinColumn({ name: 'created_by' })
    @ManyToOne(() => User)
    createdUser: User

    @Column({ name: 'updated_by' })
    updatedBy: number

    @JoinColumn({ name: 'updated_by' })
    @ManyToOne(() => User)
    updatedUser: User

    @CreateDateColumn({
        default: `now()`,
        nullable: true,
        name: 'created_at'
    })
    createdAt: Date;

    @UpdateDateColumn({
        default: `now()`,
        nullable: true,
        name: 'updated_at'
    })
    updatedAt: Date

    @Column({ name: 'order' })
    order: number

}
