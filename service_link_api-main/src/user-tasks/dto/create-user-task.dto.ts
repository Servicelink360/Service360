import { ApiProperty } from "@nestjs/swagger"

export class CreateUserTaskDto {
   @ApiProperty({default:""})
    taskName: string
    
    @ApiProperty({default:""})
    description: string
    

    @ApiProperty({default:""})
    siteId: number

    @ApiProperty({default:""})
    siteName: string

    @ApiProperty({default:""})
    siteLocation:string

    @ApiProperty({default:""})
    siteAddress:string

    @ApiProperty({default:""})
    staffId: number

    @ApiProperty({default:""})
    serviceId: number

    @ApiProperty({default:""})
    serviceName: string

    @ApiProperty({default:""})
    customerName: string

    @ApiProperty({default:""})
    customerId: number


    @ApiProperty({default:""})
    startTime: Date
    
    @ApiProperty({default:""})
    endTime: Date
    
    @ApiProperty({default:""})
    status: number
    
    @ApiProperty({default:""})
    reportTemplateId: number
    
    @ApiProperty({default:1, description:'1 Yes 2 no'})
    notifiesStaff: number

    @ApiProperty({
      default: 2,
      description: '1 Yes 2 No — staff must attach media images when completing the task',
    })
    mediaRequired?: number

    @ApiProperty({default:""})
    companyName:string

    @ApiProperty({ default: 2, description: '1 Yes 2 No — create one task per matching day in the date range' })
    recurring?: number

    @ApiProperty({
      default: '',
      description: 'Comma-separated JS weekday numbers 0=Sun … 6=Sat when recurring=1',
    })
    recurDays?: string

    @ApiProperty({
      required: false,
      description: 'JSON array of media image/video URLs attached to the task',
    })
    images?: string
}
