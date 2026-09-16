import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsInt } from 'class-validator';

export class ClearDeletedTicketsDto {
  @ApiProperty({
    type: [Number],
    description: 'Deleted ticket IDs to clear (admin hard-delete, customer soft-clear)',
  })
  @IsArray()
  @ArrayNotEmpty()
  @Type(() => Number)
  @IsInt({ each: true })
  ids: number[];
}
