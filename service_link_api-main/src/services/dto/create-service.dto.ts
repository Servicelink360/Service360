import { ApiProperty } from "@nestjs/swagger"

export class CreateServiceDto {

    @ApiProperty({ default: '' })
    name: string

    @ApiProperty({ default: '', required: false })
    description: string

    @ApiProperty({ enum: ['simple', 'detailed'], default: 'simple', required: false })
    frequencyType?: 'simple' | 'detailed'

    @ApiProperty({ default: '' })
    order: number

    @ApiProperty({ default: [], description: '', type: 'array', items: { type: 'number' } })
    staffs: number[]
    
    @ApiProperty({ default: [], description: '', type: 'array', items: { type: 'string' } })
    sites:string[]
}
