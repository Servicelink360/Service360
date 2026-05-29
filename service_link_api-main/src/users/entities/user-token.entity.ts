import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
@Entity({ name: "user_tokens" })
export class UserToken  {
    @PrimaryGeneratedColumn()
    id: number;

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
    
    @Column({name:'user_key'})
    userKey  : string

    @Column({ length: 200 })
    token: string

    @Column()
    status: number

    @Column()
    type: number;

    @Column({ default: null })
    expired: Date;

    @Column({ length: 20 })
    ip: string

    @Column({ length: 10 })
    os: string
}

