import { ApiProperty } from "@nestjs/swagger"

export class CreateTicketDto {

    @ApiProperty()
    subject: string

    @ApiProperty()
    customerId: number

    @ApiProperty()
    customerName: string
    
    @ApiProperty()
    companyName:string

    @ApiProperty()
    siteId: number


    @ApiProperty()
    siteName: string


    @ApiProperty()
    serviceId: number


    @ApiProperty()
    serviceName: string


    @ApiProperty()
    priority: number

    @ApiProperty()
    message: string

    @ApiProperty()
    attachFiles: string
}
