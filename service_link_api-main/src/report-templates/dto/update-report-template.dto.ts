import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { IsInt, IsOptional } from 'class-validator';
import { CreateReportTemplateDto } from './create-report-template.dto';

/** PATCH body: template metadata only. Items are updated via PUT /:id/items */
export class UpdateReportTemplateDto extends PartialType(
  OmitType(CreateReportTemplateDto, ['items'] as const),
) {
  @ApiProperty({ default: 0, required: false })
  @IsInt()
  @IsOptional()
  status?: number;
}
