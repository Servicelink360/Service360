import { ApiProperty } from '@nestjs/swagger';

export class CreateCustomerPersonnelDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ required: false })
  phone?: string;

  @ApiProperty({ required: false })
  role?: string;
}
