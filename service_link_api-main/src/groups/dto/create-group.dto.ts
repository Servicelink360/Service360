import { ApiProperty } from "@nestjs/swagger"

export class CreateGroupDto {
    @ApiProperty({ default: '' })
    id: string

    @ApiProperty({ default: '' })
    name: string

    @ApiProperty({ default: '' })
    description: string

    @ApiProperty({ default: 0 })
    serviceId: number

    @ApiProperty({ default: '' })
    order: number
}
