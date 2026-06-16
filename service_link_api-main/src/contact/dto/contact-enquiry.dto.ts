import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, MaxLength } from 'class-validator';

export class ContactEnquiryDto {
  @ApiProperty({ required: true, maxLength: 120 })
  @Transform(({ value }) => (value ?? '').toString().trim())
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiProperty({ required: true, maxLength: 200 })
  @Transform(({ value }) => (value ?? '').toString().trim().toLowerCase())
  @IsEmail()
  @MaxLength(200)
  email: string;

  @ApiProperty({ required: true, maxLength: 5000 })
  @Transform(({ value }) => (value ?? '').toString().trim())
  @IsNotEmpty()
  @MaxLength(5000)
  message: string;
}
