import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

const toBool = (value: unknown) =>
  value === true || value === 1 || value === '1' || value === 'true';

export class ListMessagesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  threadId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  customerId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  staffId?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit = 50;

  /** When true, list messages soft-deleted by the current user only. */
  @IsOptional()
  @Transform(({ value }) => toBool(value))
  @IsBoolean()
  deleted?: boolean;

  /** Search message body, report reference, and linked report ids. */
  @IsOptional()
  @IsString()
  keyword?: string;

  /** Filter to messages with this sender (admin/colleague view on a shared thread). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  filterSenderId?: number;

  /** userType of filterSenderId (ADMIN, CUSTOMER, or STAFF). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  filterSenderType?: number;

  /** Staff colleague thread: the other staff user id. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  peerStaffId?: number;
}
