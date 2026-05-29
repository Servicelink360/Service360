import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, MaxLength } from "class-validator";

export class ChangeEmailDto {

    user_id: number;
    @ApiProperty({ required: true, maxLength: 100, description: "new email" })
    @IsEmail()
    @IsNotEmpty()
    @MaxLength(100)
    email: string
}