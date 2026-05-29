import { Column, Entity, OneToMany } from "typeorm";
import { BaseEntity } from "../../base/baseEntity";
import { SiteItem } from "../../sites/entities/site-item.entity";

@Entity('services')
export class Service extends BaseEntity {
    @Column()
    name: string

    @Column()
    description: string

    @OneToMany(() => SiteItem, t => t.service, { cascade: true })
    sites?: SiteItem[]



}
