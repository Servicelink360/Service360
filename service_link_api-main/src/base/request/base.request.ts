import { ApiProperty } from "@nestjs/swagger"

export abstract class BaseRequest {
    @ApiProperty({ required: false, default: '', description: '' })
    keyword?: string
    @ApiProperty({ required: true, default: 1, description: 'Page=0 All, Page!=0 by page' })
    // @IsOptional()
    // @IsNumber()
    page: number

    @ApiProperty({ required: true, default: 10, description: 'All: Limit=0 , Limit!=0 by limit' })
    // @IsOptional()
    // @IsNumber()
    limit: number

    @ApiProperty({ required: false, default: 'createdAt', description: 'createdAt' })
    orderBy?: string

    @ApiProperty({ required: false, default: 'DESC', description: 'DESC | ASC', enum: ['DESC', 'ASC'] })
    orderValue: string
}
