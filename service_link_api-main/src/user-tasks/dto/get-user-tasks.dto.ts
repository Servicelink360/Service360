import { ApiProperty } from "@nestjs/swagger";
import { BaseRequest } from "../../base/request/base.request";
export class GetUserTaskDto extends BaseRequest {
  
    @ApiProperty({ required: false, default: 'createdAt', description: 'createdAt' })
    orderBy: string  
    @ApiProperty({ required: false, default: '', enum:['','TODAY'] })
    filter:string

    @ApiProperty({ required: false, default: ''})
    status:string

}