import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayMinSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ReportTemplateItemDto } from './create-report-template.dto';

/** Replaces all fields on a template. Must include the full item list. */
export class ReplaceReportTemplateItemsDto {
  @ApiProperty({ type: [ReportTemplateItemDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Template must have at least one field' })
  @ValidateNested({ each: true })
  @Type(() => ReportTemplateItemDto)
  items: ReportTemplateItemDto[];
}
