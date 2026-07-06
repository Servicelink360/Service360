import { ApiProperty } from '@nestjs/swagger';

export class UpdateInvoiceDto {
  @ApiProperty({ required: false })
  title?: string;

  @ApiProperty({ required: false })
  notes?: string;

  @ApiProperty({ required: false })
  attachFiles?: string;
}
