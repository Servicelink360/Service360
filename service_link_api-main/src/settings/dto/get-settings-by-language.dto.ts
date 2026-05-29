import { ApiProperty } from "@nestjs/swagger"
import { IsNotEmpty } from "class-validator"

export class GetSettingByLanguageDto {
    @ApiProperty({ default: '' })
    @IsNotEmpty()
    languageId: string
}
