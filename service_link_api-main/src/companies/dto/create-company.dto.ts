import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, MaxLength } from 'class-validator';

export class CreateCompanyDto {
  @ApiProperty({ maxLength: 255 })
  @IsNotEmpty()
  @MaxLength(255)
  name: string;
}
