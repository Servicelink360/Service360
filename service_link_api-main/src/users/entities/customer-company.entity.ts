import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Shared org id — all customer users at the same company share one row. */
@Entity({ name: 'customer_companies' })
export class CustomerCompany {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column({ name: 'normalized_name', length: 255, unique: true })
  normalizedName: string;
}
