
import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { StrIdBaseEntity } from "../../base/baseEntity";
import { Service } from "../../services/entities/service.entity";

@Entity('positions')
export class Position extends StrIdBaseEntity {
    @Column()
    name: string

    @Column()
    description: string

    @Column()
    order: number

}
