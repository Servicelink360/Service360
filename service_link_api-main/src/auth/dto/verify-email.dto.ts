import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, MaxLength } from "class-validator";

export class VerifyEmailDto {
    @ApiProperty({ required: true, default: '', maxLength: 100, minLength: 5 })
    @MaxLength(100)
    @IsNotEmpty()
    active_code: string;
}