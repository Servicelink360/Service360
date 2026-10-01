import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('toolbox_attendance')
export class ToolboxAttendance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'session_id' })
  sessionId: number;

  @Column({ name: 'staff_id' })
  staffId: number;

  @Column({ name: 'acknowledged_at', type: 'timestamptz', nullable: true })
  acknowledgedAt?: Date | null;

  @Column({ name: 'signature_name', type: 'varchar', length: 255, nullable: true })
  signatureName?: string | null;

  @Column({ name: 'printed_name', type: 'varchar', length: 255, nullable: true })
  printedName?: string | null;
}
