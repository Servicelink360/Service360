import { ApiProperty } from '@nestjs/swagger';

export class AddServiceFaultIssueDto {
  @ApiProperty({ required: false })
  faultIssueId?: number;

  @ApiProperty({ required: false })
  label?: string;
}
