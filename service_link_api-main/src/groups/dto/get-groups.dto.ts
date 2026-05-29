import { ApiProperty } from "@nestjs/swagger";
import { BaseRequest } from "../../base/request/base.request";
export class GetGroupsDto extends BaseRequest {
  
    @ApiProperty({ required: false, default: 'createdAt', description: 'createdAt' })
    orderBy: string  

}