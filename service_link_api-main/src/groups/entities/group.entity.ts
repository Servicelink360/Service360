
import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { StrIdBaseEntity } from "../../base/baseEntity";
import { Service } from "../../services/entities/service.entity";

@Entity('groups')
export class Group extends StrIdBaseEntity {
    @Column()
    name: string

    @Column()
    description: string

    @Column()
    order: number

    @Column({ name: 'service_id' })
    serviceId: number

    @JoinColumn({ name: 'service_id' })
    @ManyToOne(() => Service, { orphanedRowAction: 'delete' })
    service?: Service
}
