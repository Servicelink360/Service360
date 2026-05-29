import { ApiProperty } from "@nestjs/swagger"
import { BaseRequest } from "../../base/request/base.request"
export class GetUsersDto extends BaseRequest {
    
    @ApiProperty({ required: true, default: 1})
    type: number

    @ApiProperty({ required: false, default: '' })
    startDate: Date

    @ApiProperty({ required: false, default: '' })
    endDate: Date

    /** When true, include soft-deleted users (status=4). Used on Customers admin list. */
    @ApiProperty({ required: false, default: false })
    includeDeleted?: boolean | string
}
