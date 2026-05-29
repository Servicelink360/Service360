import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, MaxLength } from "class-validator";

export class CheckEmailQueryDto {
   
    @ApiProperty({ required: true, default: 'quybv90@gmail.com', maxLength: 100, minLength: 6 })
    @IsNotEmpty()
    @MaxLength(100)
    @IsEmail()
    email: string;
}