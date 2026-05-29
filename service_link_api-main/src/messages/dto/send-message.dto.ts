import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class SendMessageDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  body?: string;

  /** JSON array of uploaded file URLs */
  @IsOptional()
  @IsString()
  @MaxLength(50000)
  attachFiles?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  reportFaultId?: number;

  /** New Reports (CUSTOM user task) */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userTaskId?: number;

  /** Admin only: send in a customer thread */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  customerId?: number;

  /** Admin only: send in a staff thread */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  staffId?: number;

  /** Customer threads: copy message to these same-organisation customer logins. */
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  ccCustomerIds?: number[];

  /** Staff only: send in a colleague (staff ↔ staff) thread. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  peerStaffId?: number;
}
