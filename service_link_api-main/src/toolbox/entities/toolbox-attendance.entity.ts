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
}
