import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";

export class IsValidResetPasswordDto {

    @ApiProperty({ required: true, default: '', maxLength: 100 })
    @IsNotEmpty()
    reset_token: string


}

