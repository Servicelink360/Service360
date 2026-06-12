import { ApiProperty } from "@nestjs/swagger"

class StaffShiftsDto {
    @ApiProperty({ default: '' })
    startTime: string

    @ApiProperty({ default: '' })
    endTime: string

    @ApiProperty({ default: '' })
    type: string

    @ApiProperty({ default: '' })
    typeValue: string
}
class StaffDto {
    @ApiProperty({ default: 0 })
    staffId: number

    @ApiProperty({ default: [{ startTime: '',endTime:'' }], type: [StaffShiftsDto] })
    staffShifts:StaffShiftsDto[]
}
export class SiteItemDto {
    @ApiProperty({ default: '' })
    siteId: number
    @ApiProperty({ default: 0 })
    serviceId: number
    @ApiProperty({ default: 0 })
    customerId: number
    @ApiProperty({ default: [{ staffId: 0 }], type: [StaffDto] })
    staffs: StaffDto[]

    @ApiProperty({ default: 1, required: false, description: 'Times (e.g. 5 in 5 times per 5 months)' })
    frequencyTimes?: number

    @ApiProperty({ default: 1, required: false, description: 'Per-interval count (e.g. 5 in per 5 months)' })
    frequencyCount?: number

    @ApiProperty({ default: 'week', required: false, enum: ['day', 'week', 'month', 'year'] })
    frequencyPeriod?: string

    @ApiProperty({ default: 'interval', required: false, enum: ['interval', 'annual', 'both'] })
    frequencyMode?: string

    @ApiProperty({ default: null, required: false, enum: ['simple', 'detailed'], description: 'Per site+service override; omit to inherit service default' })
    frequencyType?: 'simple' | 'detailed' | null
}
export class CreateSiteDto {
    @ApiProperty({ default: '' })
    name: string
    @ApiProperty({ default: '' })
    location: string
    @ApiProperty({ default: '' })
    addressName: string

    @ApiProperty({ default: '' })
    description: string
    @ApiProperty({ default: 500 })
    checkInDistance:number

    @ApiProperty({ default: [{ serviceId: 0, customerId: 0}], description: '', type: [SiteItemDto] })
    items: SiteItemDto[]



}
