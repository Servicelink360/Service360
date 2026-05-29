import { Column, CreateDateColumn, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { User } from "../users/entities/user.entity";

export abstract class BaseEntity {

    @PrimaryGeneratedColumn()
    id?: number;

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

}



export abstract class StrIdBaseEntity {

    @Column({ primary: true })
    id: string

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

}
