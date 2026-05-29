import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";
import { BaseRequest } from "../../base/request/base.request";

export class GetReportTemplatesDto extends BaseRequest {
	@ApiProperty({ required: false, description: 'Category name filter' })
	@IsOptional()
	@IsString()
	@MaxLength(120)
	category?: string
}