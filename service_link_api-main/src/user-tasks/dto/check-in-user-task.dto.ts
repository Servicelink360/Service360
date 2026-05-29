import { ApiProperty } from "@nestjs/swagger"

export class CheckInDto {
    @ApiProperty({ default: 0 })
    id: number
    @ApiProperty({ default: 0 })
    userId: number

    @ApiProperty({ default: 0 })
    status: number

    @ApiProperty({ default: ''})
    checkIn: Date

   

    @ApiProperty({ default: 0 })
    taskShiftId: number


    @ApiProperty({ default: 0 })
    taskId: number


    @ApiProperty({ default: ''})
    taskName: string



    @ApiProperty({ default: 0 })
    siteId: number


    @ApiProperty({ default: ''})
    siteName: string

    @ApiProperty({ default: ''})
    siteAddress: string

    @ApiProperty({ default: ''})
    siteLocation: string

    @ApiProperty({ default: ''})
    customerId: number

    @ApiProperty({ default: ''})
    customerName: string


    @ApiProperty({ default: '' })
    serviceId: number


    @ApiProperty({ default: ''})
    serviceName: string


    @ApiProperty({ default: 0 })
    reportTemplateId: number


    @ApiProperty({ default: ''})
    description: string

    @ApiProperty({ default: ''})
    startTime: Date

    @ApiProperty({ default: ''})
    endTime: Date

    @ApiProperty({ default: ''})
    type: string
    
    @ApiProperty({ default: ''})
    companyName:string
}
