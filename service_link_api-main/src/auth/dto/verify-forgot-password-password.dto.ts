import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, MaxLength } from "class-validator";

export class VerifyForgotPasswordDto {
    @ApiProperty({ required: true, description: '', maxLength: 100 })
    @IsNotEmpty()
    @MaxLength(100)
    token: string;
}
