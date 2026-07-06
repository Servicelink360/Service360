import { ApiProperty } from '@nestjs/swagger';

export class CreateInvoiceDto {
  @ApiProperty()
  customerId: number;

  @ApiProperty({ required: false })
  customerName?: string;

  @ApiProperty({ required: false })
  companyName?: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ required: false })
  notes?: string;

  @ApiProperty({ description: 'JSON string array of uploaded file URLs' })
  attachFiles: string;
}
