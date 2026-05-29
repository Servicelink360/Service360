import { ApiProperty } from "@nestjs/swagger"
import { IsUrl } from "class-validator"

export class UpdateAdminGuideDto {
    @ApiProperty({ default: '' })
    settingKey:string
    @ApiProperty({ default: '' })
    @IsUrl()
    fileUrl: string
}
