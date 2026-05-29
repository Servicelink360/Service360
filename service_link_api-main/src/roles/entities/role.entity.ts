
import { Column, Entity } from "typeorm";
import { StrIdBaseEntity } from "../../base/baseEntity";

@Entity('roles')
export class Role extends StrIdBaseEntity {
    @Column()
    name: string

    @Column()
    description: string

    @Column()
    order: number
    
}
