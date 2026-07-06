import { ApiProperty } from '@nestjs/swagger';

export class ClearDeletedInvoicesDto {
  @ApiProperty({ type: [Number], required: false })
  ids?: number[];
}
