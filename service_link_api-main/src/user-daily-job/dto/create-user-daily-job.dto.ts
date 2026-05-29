import { ApiProperty } from "@nestjs/swagger"

export class CreateUserDailyJobDto {
    @ApiProperty({default:''})
    siteId: number

    @ApiProperty({default:''})
    siteLocation: string


    @ApiProperty({default:0})
    staffId: number

    @ApiProperty({default:0})
    type: number
    
    @ApiProperty({default:0})
    checkInId: number

    /** Staff device coordinates for geofence check (e.g. "-33.86,151.20"). */
    @ApiProperty({default:''})
    staffLocation?: string
}
