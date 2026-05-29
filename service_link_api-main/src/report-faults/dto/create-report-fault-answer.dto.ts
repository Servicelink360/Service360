import { ApiProperty } from "@nestjs/swagger"

export class CreateReportFaultAnswerDto {
    @ApiProperty()
    reportFaultId:number
    @ApiProperty()
    message: string

    @ApiProperty()
    attachFiles: string
}
