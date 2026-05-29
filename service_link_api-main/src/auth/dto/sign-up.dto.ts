import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, MaxLength, MinLength } from "class-validator";

export class SignUpDto {

    @ApiProperty({ required: true, default: '123456', maxLength: 50, minLength: 5 })
    @MaxLength(50)
    @MinLength(5)
    @IsNotEmpty()
    password: string;

    @ApiProperty({ required: true, default: 'quybv90@gmail.com', maxLength: 100, minLength: 6 })
    @IsNotEmpty()
    @MaxLength(100)
    @IsEmail()
    email: string;
    @ApiProperty({ required: true, default: 'WEB', enum: ['WEB', "IOS", "ANDROID"] })
    @IsNotEmpty()
    @MaxLength(10)

    // @ApiProperty({ required: false })
    // address: string
    
    @ApiProperty({ required: true, default: '', maxLength: 100 })
    fullName: string


    @ApiProperty({ required: false })
    phone: string

    @ApiProperty({ required: false })
    platform: string

    @ApiProperty({ required: false,description:'1 Yes, 2 No',default:1 })
    getSalePromotion:number

    ip: string
    @ApiProperty({ required: false })
    confirmToken:string

}