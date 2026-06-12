import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddGroundMaintenanceScheduleRowDto {
  @ApiProperty()
  siteId: number;

  @ApiProperty()
  siteItemId: number;

  @ApiPropertyOptional({ description: 'Existing catalog activity id' })
  activityId?: number;

  @ApiPropertyOptional({ description: 'New activity name (created in catalog if needed)' })
  activityName?: string;
}
