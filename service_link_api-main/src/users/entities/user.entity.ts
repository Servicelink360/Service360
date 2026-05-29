import { BeforeInsert, Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, OneToOne } from "typeorm";
import * as bcrypt from 'bcrypt';
import config from './../../config';
import { BaseEntity } from "../../base/baseEntity";
import { UserRole } from "./user-role.entity";
import { UserGroup } from "./user-group.entity";
import { Customer } from "./customer.entity";
import { Staff } from "./staff.entity";

@Entity({ name: "users" })
export class User extends BaseEntity {
    /** Mirrors email for login; not required to be globally unique. */
    @Column({ length: 200 })
    username: string

    @Column({ select: false, length: 100 })
    password: string

    /** Unique among active accounts (enforced via DB index); user id is the primary key. */
    @Column({ length: 200 })
    email: string

    @Index({ fulltext: true })
    @Column({ name: 'full_name' })
    fullName: string

    @Column({ name: 'first_name' })
    firstName: string

    @Column({ name: 'last_name' })
    lastName: string

    @Column()
    status: number

    @Column()
    type: number

    @Column({ name: 'last_login' })
    lastLogin: Date

    @Column({ name: 'last_version' })
    lastVersion: string

    @Column({ length: 20 })
    phone: string

    @Column({ length: 20 })
    avatar: string

    @Column({ name: 'gender' })
    gender: string

    @Column({ name: 'dob' })
    dob: Date

    @Column({ name: 'address' })
    address: string
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

    @BeforeInsert()
    async setPassword?(password: string) {
        const saltOrRounds = 10;
        let hash = await bcrypt.hash(this.password + config.PASSWORD_SALT, saltOrRounds);
        if (password) {
            hash = await bcrypt.hash(password + config.PASSWORD_SALT, saltOrRounds);
        }
        this.password = hash;
    }

    @OneToMany(() => UserRole, t => t.user, { cascade: true })
    roles?: UserRole[]

    @OneToMany(() => UserGroup, t => t.user, { cascade: true })
    groups?: UserGroup[]

    @Column({ name: 'position' })
    position: string

    // @JoinColumn({ name: 'position_id' })
    // @ManyToOne(() => Position, { orphanedRowAction: 'delete' })
    // position?: Position

    @OneToOne(() => Customer, t => t.user, { cascade: true })
    customerInfo?: Customer

    @OneToOne(() => Staff, t => t.user, { cascade: true })
    staffInfo?: Staff


    @Column({ name: 'allow_delete' })
    allowDelete: number

}

