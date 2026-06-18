import { ApiProperty } from '@nestjs/swagger';

export class CreateFaultIssueDto {
  @ApiProperty()
  label: string;
}
