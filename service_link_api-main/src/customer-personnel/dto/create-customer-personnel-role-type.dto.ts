import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCustomerPersonnelRoleTypeDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  label: string;
}
