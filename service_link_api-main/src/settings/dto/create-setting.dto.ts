import { ApiProperty } from "@nestjs/swagger"

export class CreateSettingDto {
    @ApiProperty({ default: '' })
    settingKey: string

    @ApiProperty({ default: '' })
    settingValue: string

    @ApiProperty({ default: '' })
    settingLable:string

}

