import { ApiProperty } from "@nestjs/swagger"

export class CreateReportFaultDto {

    @ApiProperty({ required: false })
    subject: string

    @ApiProperty()
    issue: string

    @ApiProperty({ required: false })
    toiletArea?: string

    @ApiProperty()
    customerId: number

    @ApiProperty()
    customerName: string
    
    @ApiProperty()
    companyName:string

    @ApiProperty({ required: false })
    siteId: number

    @ApiProperty({ required: false })
    isOtherSite?: boolean

    @ApiProperty()
    siteName: string


    @ApiProperty()
    serviceId: number


    @ApiProperty()
    serviceName: string


    @ApiProperty()
    priority: number

    @ApiProperty({ required: false })
    message: string

    @ApiProperty({ required: false })
    attachFiles: string
}
