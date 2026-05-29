import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, MaxLength, MinLength } from "class-validator";

export class ResetPasswordDto {
    @ApiProperty({ required: true, description: 'Password', maxLength: 50, minLength: 6 })
    @MaxLength(50)
    @IsNotEmpty()
    @MinLength(6)
    password: string;


    @ApiProperty({ required: true, description: '', maxLength: 100 })
    @IsNotEmpty()
    @MaxLength(100)
    token: string;
}
