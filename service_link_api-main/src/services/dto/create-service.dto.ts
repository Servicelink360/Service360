import { ApiProperty } from "@nestjs/swagger"

export class CreateServiceDto {

    @ApiProperty({ default: '' })
    name: string

    @ApiProperty({ default: '' })
    description: string

    @ApiProperty({ default: '' })
    order: number

    @ApiProperty({ default: [], description: '', type: 'array', items: { type: 'number' } })
    staffs: number[]
    
    @ApiProperty({ default: [], description: '', type: 'array', items: { type: 'string' } })
    sites:string[]
}
