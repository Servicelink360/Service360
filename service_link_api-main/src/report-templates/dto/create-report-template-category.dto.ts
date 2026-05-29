import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateReportTemplateCategoryDto {
  @ApiProperty({ example: 'Window Cleaning' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;
}
