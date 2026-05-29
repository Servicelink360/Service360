import { ApiProperty } from "@nestjs/swagger";
import { BaseRequest } from "../../base/request/base.request";
export class GetServicesDto extends BaseRequest {
  
    @ApiProperty({
      required: false,
      default: 'name',
      description: 'id | name | createdAt | siteCount | customerCount | companyCount | staffCount | taskCount',
    })
    orderBy: string

}