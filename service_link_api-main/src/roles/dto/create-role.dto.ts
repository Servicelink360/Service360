import { ApiProperty } from "@nestjs/swagger";

export class CreateRoleDto {
    @ApiProperty({ default: '' })
    id: string

    @ApiProperty({ default: '' })
    name: string

    @ApiProperty({ default: '' })
    description: string

    @ApiProperty({ default: '' })
    order: number
}
