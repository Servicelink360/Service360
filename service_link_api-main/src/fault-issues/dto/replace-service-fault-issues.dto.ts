import { ApiProperty } from '@nestjs/swagger';

export class ReplaceServiceFaultIssuesDto {
  @ApiProperty({ type: [Number] })
  faultIssueIds: number[];
}
