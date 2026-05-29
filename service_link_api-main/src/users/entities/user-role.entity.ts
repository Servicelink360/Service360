import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { User } from "./user.entity";
@Entity({ name: "user_roles" })
@Unique('uq_user_roles_user_role', ['userId', 'roleId'])
export class UserRole {
    @PrimaryGeneratedColumn()
    id: number;

    @CreateDateColumn({
        default: `now()`,
        nullable: true,
        name: 'created_at'
    })
    createdAt: Date;

    @Column({ name: 'role_id', nullable: false })
    roleId: string

    @Column({ name: 'user_id' })
    userId: number

    @JoinColumn({ name: 'user_id' })
    @ManyToOne(() => User, { orphanedRowAction: 'delete' })
    user?: User
}

