import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsOptional, IsString } from "class-validator";
import { BaseRequest } from "../../base/request/base.request";
export class GetSitesDto extends BaseRequest {

    @ApiProperty({ required: false, description: 'Search name, address, location, description' })
    @IsOptional()
    @IsString()
    @Transform(({ value }) => (value == null ? '' : String(value).trim()))
    keyword?: string;

    @ApiProperty({
      required: false,
      default: 'createdAt',
      description: 'createdAt | name | addressName | staffCount | customer | updatedAt | location',
    })
    orderBy: string
    @ApiProperty({ required: false, default: '', enum: ['', 'TODAY'] })
    filter: string

    @ApiProperty({ default: '' })
    staffId: string

}

export class GetStaffsBySiteDto {
    @ApiProperty({ default: '' })
    siteId: number
    @ApiProperty({ default: 0 })
    serviceId: number

    @ApiProperty({ default: '' })
    customerId: number

    /** Admin: optional — resolve assignment for a specific staff on this site. */
    @ApiProperty({ required: false })
    staffId?: number

}

export class GetShiftsDto extends BaseRequest {

    @ApiProperty({ required: false, default: 'createdAt', description: 'createdAt' })
    orderBy: string

    @ApiProperty({ default: '' })
    staffId:number
}