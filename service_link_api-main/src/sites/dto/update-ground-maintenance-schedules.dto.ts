import { ApiProperty } from '@nestjs/swagger';

export class UpdateGroundMaintenanceScheduleRowDto {
  @ApiProperty()
  id: number;

  @ApiProperty({
    type: [String],
    description: '12 values: null | weekly | monthly | fortnight | daily',
  })
  months: (string | null)[];
}

export class UpdateGroundMaintenanceSchedulesDto {
  @ApiProperty()
  siteId: number;

  @ApiProperty()
  siteItemId: number;

  @ApiProperty({ type: [UpdateGroundMaintenanceScheduleRowDto] })
  rows: UpdateGroundMaintenanceScheduleRowDto[];
}
