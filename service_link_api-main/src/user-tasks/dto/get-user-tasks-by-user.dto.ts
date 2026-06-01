import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional } from "class-validator";

export class GetUserTasksByUserDto {

    @ApiProperty({ default: 0 ,required:false})
    siteId: number

    @ApiProperty({ default: '',required:false})
    serviceId: number

    @ApiProperty({ default: 7 ,required:false})
    month: number
    @ApiProperty({ default: 2024,required:false})
    year: number

    @ApiProperty({ default: 0 ,required:false})
    limit: number

    @ApiProperty({ default: 1,required:false })
    page: number

    @ApiProperty({
      default: 1,
      required: false,
      description: 'p=pending, s=completed, deleted=removed from list (customer/staff only)',
    })
    status: string

    
    @ApiProperty({ default: 1,required:false })
    staffId: number
    
    @ApiProperty({ default: '',required:false})
    startDate: Date

    @ApiProperty({ default: '',required:false })
    endDate: Date

    @ApiProperty({ default: '',required:false })
    type: string
    
    @ApiProperty({ default: '',required:false })
    keyword:string

    @ApiProperty({ required: false, description: 'Open a specific custom report from messages / deep link' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    reportId?: number

    @ApiProperty({ required: false, description: 'Sort column: staffFullName, siteName, serviceName, customerName, submittedAt, updatedAt, status, readStatus' })
    @IsOptional()
    orderBy?: string

    @ApiProperty({ required: false, description: 'Sort direction: ASC or DESC' })
    @IsOptional()
    orderValue?: string

}
