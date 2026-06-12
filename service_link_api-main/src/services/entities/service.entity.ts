import { Column, Entity, OneToMany } from "typeorm";
import { BaseEntity } from "../../base/baseEntity";
import { SiteItem } from "../../sites/entities/site-item.entity";

export type ServiceFrequencyType = 'simple' | 'detailed';

@Entity('services')
export class Service extends BaseEntity {
    @Column()
    name: string

    @Column()
    description: string

    /** simple = even repeat on site items; detailed = activity × month schedules */
    @Column({ name: 'frequency_type', length: 16, default: 'simple' })
    frequencyType: ServiceFrequencyType;

    @OneToMany(() => SiteItem, t => t.service, { cascade: true })
    sites?: SiteItem[]
}
