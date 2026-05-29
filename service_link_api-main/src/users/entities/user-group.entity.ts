import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne } from "typeorm";
import { User } from "./user.entity";
import { Group } from "../../groups/entities/group.entity";

@Entity({ name: "user_groups" })
export class UserGroup  {

    @Column({ name: 'user_id',primary:true })
    userId: number

    @JoinColumn({ name: 'user_id' })
    @ManyToOne(() => User, { orphanedRowAction: 'delete' })
    user?: User
    
    @Column({ name: 'group_id',primary:true })
    groupId: string

    @JoinColumn({ name: 'group_id' })
    @ManyToOne(() => Group, { orphanedRowAction: 'delete' })
    group?: Group

    @CreateDateColumn({
        default: `now()`,
        nullable: true,
        name: 'created_at'
    })
    createdAt: Date;
}

