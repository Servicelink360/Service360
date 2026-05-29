import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, MaxLength } from "class-validator";
export class GetTokenDto {
    @ApiProperty({ required: true, default: '', maxLength: 500, minLength: 6 })
    @IsNotEmpty()
    @MaxLength(500)
    refresh_token: string;
}