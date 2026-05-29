import { ApiProperty } from "@nestjs/swagger"
import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsEnum, MaxLength, IsInt, Min, IsBoolean, IsObject, ValidateIf } from "class-validator"
import { Type, Transform } from "class-transformer"
import { ASSIGNED_STAFF_ALL } from '../report-template-assignment.constants'

export const parseAssignedStaffId = (value: unknown): number | null => {
  if (value === 'all' || value === ASSIGNED_STAFF_ALL || value === '0') {
    return ASSIGNED_STAFF_ALL;
  }
  if (value === '' || value === null || value === undefined || value === 'none') {
    return null;
  }
  const n = +value;
  return Number.isFinite(n) && n > 0 ? n : null;
};

export enum ReportTemplateItemType {
    YES_NO = 'YES_NO',
    IMAGES = 'IMAGES',
    SELECT = 'SELECT',
    TEXT = 'TEXT',
    TEXTAREA = 'TEXTAREA',
    RICH_TEXT = 'RICH_TEXT',
    NUMBER = 'NUMBER',
    PERCENTAGE = 'PERCENTAGE',
    CURRENCY = 'CURRENCY',
    CHECKLIST = 'CHECKLIST',
    TABLE = 'TABLE',
    SIGNATURE = 'SIGNATURE',
    GPS = 'GPS',
    DATE = 'DATE',
    TIME = 'TIME',
    VIDEOS = 'VIDEOS',
    REPORT_DATE = '[REPORT_DATE]',
    REPORT_TIME = '[REPORT_TIME]',
    SITE_NAME = '[SITE_NAME]',
    SITE_ADDRESS = '[SITE_ADDRESS]',
    CUSTOMER_NAME = '[CUSTOMER_NAME]',
    REPORT_BY = '[REPORT_BY]',
}

export class ReportTemplateItemDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    name: string

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @IsEnum(ReportTemplateItemType)
    type: ReportTemplateItemType

    @ApiProperty()
    @IsString()
    @IsOptional()
    @MaxLength(500)
    value?: string

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    label?: string

    @ApiProperty({ required: false })
    @Transform(({ value }) => value === true || value === 1 || value === '1' || value === 'true')
    @IsBoolean()
    @IsOptional()
    required?: boolean

    @ApiProperty({ required: false, type: [String] })
    @IsArray()
    @IsOptional()
    @IsString({ each: true })
    options?: string[]

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    defaultValue?: string

    @ApiProperty({ required: false })
    @IsString()
    @IsOptional()
    placeholder?: string

    @ApiProperty({ required: false, type: () => Object })
    @IsOptional()
    @IsObject()
    validation?: Record<string, any>

    @ApiProperty({ required: false, type: () => Object })
    @IsOptional()
    @IsObject()
    config?: Record<string, any>

    @ApiProperty()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    order: number
}
export class CreateReportTemplateDto {

    @ApiProperty({ default: '' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    name: string

    @ApiProperty({ default: '' })
    @IsString()
    @IsOptional()
    @MaxLength(500)
    description?: string

    @ApiProperty({ description: 'Category name', example: 'Cleaning Services' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(120)
    category: string

    @ApiProperty({ default: 0 })
    @IsInt()
    @IsOptional()
    @Min(0)
    order?: number

    @ApiProperty({ default: '' })
    @IsString()
    @IsOptional()
    @MaxLength(2048)
    fileUrl?: string

    @ApiProperty({ required: false, type: () => Object })
    @IsOptional()
    @IsObject()
    settings?: Record<string, any>

    @ApiProperty({
      required: false,
      description: '0 = all staff; positive id = one staff; null/omit = no staff',
    })
    @Transform(({ value }) => parseAssignedStaffId(value))
    @IsOptional()
    @ValidateIf((_, v) => v !== null && v !== undefined)
    @IsInt()
    @Min(0)
    assignedStaffId?: number | null

    @ApiProperty({
      required: false,
      type: [Number],
      description: 'Services that may use this template in New Report. Empty = all services.',
    })
    @IsArray()
    @IsOptional()
    @Transform(({ value }) => {
      if (!Array.isArray(value)) return [];
      return value
        .map((v) => Number(v))
        .filter((n) => Number.isFinite(n) && n > 0);
    })
    @IsInt({ each: true })
    @Min(1, { each: true })
    serviceIds?: number[]

    @ApiProperty({ default: [], type: [ReportTemplateItemDto] })
    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => ReportTemplateItemDto)
    items?: ReportTemplateItemDto[]
}
