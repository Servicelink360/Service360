import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional } from "class-validator";
import { BaseRequest } from "../../base/request/base.request";
export class GetReportFaultsDto extends BaseRequest {
  
    @ApiProperty({ required: false, default: 'createdAt', description: 'createdAt' })
    orderBy: string  

    @ApiProperty()
    status: number
    
    @ApiProperty({ required: false, default: '2024-01-01' })
    startDate: string  

    @ApiProperty({ required: false, default: '2024-12-01' })
    endDate: string

    @ApiProperty({ required: false, description: 'Open a specific fault from messages / deep link' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    faultId?: number

    @ApiProperty({ required: false, description: '1 = urgent, 2 = normal' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    priority?: number

    @ApiProperty({ required: false, description: 'Exclude completed faults from the list' })
    @IsOptional()
    incompleteOnly?: boolean | string
}