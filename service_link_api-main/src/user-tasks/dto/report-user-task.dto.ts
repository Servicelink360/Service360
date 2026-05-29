import { ApiProperty } from "@nestjs/swagger"

export class UserTaskItemDto{
    @ApiProperty({ default: ''})
    name: string
    @ApiProperty({ default: ''})
    value: string
    
    @ApiProperty({ default: ''})
    type: string
    
    @ApiProperty({ default: 0})
    order: number
}

export class ReportUserTaskDto {
  

    @ApiProperty({ default: ''})
    description: string

    @ApiProperty({ default: [],type:[UserTaskItemDto]})
    items:UserTaskItemDto[]
}
