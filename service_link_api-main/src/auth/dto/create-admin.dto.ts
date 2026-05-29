import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsNumber, MaxLength, MinLength } from "class-validator";

export class CreateAdminDto {
    @ApiProperty({ required: true, default: '123456', maxLength: 20, minLength: 6 })
    @IsNotEmpty()
    @MaxLength(20)
    @MinLength(6)
    password: string;


    @ApiProperty({ required: true, default: 'quybv90@gmail.com', maxLength: 100, minLength: 6 })
    @IsNotEmpty()
    @MaxLength(100)
    @IsEmail()
    email: string;

    @ApiProperty({ required: true, default: 'Quy', maxLength: 100 })
    fullName: string

    @ApiProperty({ required: false, default: 'admin', description: "Option", maxLength: 100 })
    @MaxLength(100)
    @IsNotEmpty()
    username: string



    @ApiProperty({ required: true, default: '1', description: "1: User, 2: Admin" })
    @IsNotEmpty()
    @IsNumber()
    type: number;
}