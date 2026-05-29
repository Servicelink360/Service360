import { ApiProperty } from "@nestjs/swagger"
import { UserTaskItemDto } from "./report-user-task.dto"

export class CreateCustomReportsDto {
    @ApiProperty({ default: "" })
    taskName: string

    @ApiProperty({ default: "" })
    description: string


    @ApiProperty({ default: "" })
    siteId: number

    @ApiProperty({ default: "" })
    siteName: string

    @ApiProperty({ default: "" })
    siteLocation: string

    @ApiProperty({ default: "" })
    siteAddress: string

    @ApiProperty({ default: "" })
    staffId: number

    @ApiProperty({ default: "" })
    serviceId: number

    @ApiProperty({ default: "" })
    serviceName: string

    @ApiProperty({ default: "" })
    customerName: string

    @ApiProperty({ default: "" })
    companyName: string

    @ApiProperty({ default: "" })
    customerId: number


    @ApiProperty({ default: "" })
    startTime: Date

    @ApiProperty({ default: "" })
    endTime: Date

    @ApiProperty({ default: "" })
    checkIn: Date

    
    @ApiProperty({ default: "" })
    completed: Date

    @ApiProperty({ default: "" })
    status: number

    @ApiProperty({ default: "" })
    reportTemplateId: number

    @ApiProperty({ default: 1, description: '1 Yes 2 no' })
    notifiesStaff: number

    @ApiProperty({ default: [], type: [UserTaskItemDto] })
    items: UserTaskItemDto[]
}
