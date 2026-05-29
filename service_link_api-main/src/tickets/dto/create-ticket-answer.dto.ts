import { ApiProperty } from "@nestjs/swagger"

export class CreateTicketAnswerDto {
    @ApiProperty()
    ticketId:number
    @ApiProperty()
    message: string

    @ApiProperty()
    attachFiles: string
}
