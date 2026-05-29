import { ApiProperty } from "@nestjs/swagger";
import { BaseRequest } from "../../base/request/base.request";
export class GetTicketsDto extends BaseRequest {
  
    @ApiProperty({ required: false, default: 'createdAt', description: 'createdAt' })
    orderBy: string  

    @ApiProperty()
    status: number
    
    @ApiProperty({ required: false, default: '2024-01-01' })
    startDate: string  

    @ApiProperty({ required: false, default: '2024-12-01' })
    endDate: string  
}