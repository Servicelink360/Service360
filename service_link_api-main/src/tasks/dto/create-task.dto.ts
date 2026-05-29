import { ApiProperty } from "@nestjs/swagger"
export class CreateTaskShiftDto {
    @ApiProperty({ default: '' })
    from: string
   
    @ApiProperty({ default: 0, description: '' })
    to :string
}
export class CreateTaskDto {

    @ApiProperty({ default: '' })
    taskId: string

    @ApiProperty({ default: '' })
    name: string

    @ApiProperty({ default: '' })
    siteItemId: string

    @ApiProperty({ default: '' })
    description: string

   
    @ApiProperty({ default: '' })
    staffId: number
    
    @ApiProperty({ default: '' })
    reportTemplateId: number

    @ApiProperty({ default: '' })
    status: number

    @ApiProperty({ default: [], type: [CreateTaskShiftDto] })
    shifts: CreateTaskShiftDto[]

    @ApiProperty({ default: '', description: 'E: Everyday, W:Working day, C:Custom' })
    type: string

    @ApiProperty({ default: '', description: '0,1,2,3,4,5,6,7 /Week' })
    typeValue: string

    @ApiProperty({ default: '', description: '' })
    startDate: Date
    
    @ApiProperty({ default: '', description: '' })
    endDate: Date
    
}
