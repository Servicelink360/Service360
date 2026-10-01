import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('toolbox_signoffs')
@Unique(['talkId', 'staffId'])
export class ToolboxSignoff {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'talk_id' })
  talkId: number;

  @Column({ name: 'staff_id' })
  staffId: number;

  @Column({ name: 'signature_name', length: 255 })
  signatureName: string;

  @Column({ name: 'signed_at', type: 'timestamptz' })
  signedAt: Date;

  @Column({ type: 'text', nullable: true })
  minutes?: string | null;

  @Column({ name: 'form_title', type: 'text', nullable: true })
  formTitle?: string | null;

  @Column({ name: 'printed_name', type: 'varchar', length: 255, nullable: true })
  printedName?: string | null;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date | null;
}
