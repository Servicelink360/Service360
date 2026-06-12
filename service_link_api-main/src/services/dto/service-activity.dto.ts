import { ApiProperty } from '@nestjs/swagger';

export class CreateServiceActivityDto {
  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  sortOrder?: number;
}

export class UpdateServiceActivityDto {
  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false })
  sortOrder?: number;
}
