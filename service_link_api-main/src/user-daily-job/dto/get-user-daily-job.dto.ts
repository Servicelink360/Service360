import { ApiProperty } from "@nestjs/swagger"
import { BaseRequest } from "../../base/request/base.request";

export class GetUserDailyJobsDto extends BaseRequest {
    @ApiProperty({ default: '', description: '',required:false })
    startDate: Date

    @ApiProperty({ default: '', description: '' ,required:false})
    endDate: Date

    @ApiProperty({ default: 0, description: '' ,required:false})
    siteId: number
    @ApiProperty({ default: 0, description: '',required:false })
    staffId: number


    @ApiProperty({ default: 0, description: '',required:false })
    isTotalHours:number
}