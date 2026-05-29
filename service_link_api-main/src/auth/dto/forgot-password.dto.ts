import { ApiProperty } from "@nestjs/swagger";
import { IsEmail } from "class-validator";

export class ForgotPasswordDto {

    @ApiProperty({ required: true, default: '', maxLength: 100 })
    @IsEmail()
    email: string
}


export class ForgotPassword2Dto {

    @ApiProperty({ required: true, default: '', maxLength: 100 })
    email: string

    @ApiProperty({ required: false, default: '', maxLength: 10 })
    phone: string

    @ApiProperty({ required: false, default: '', maxLength: 10 })
    platform:string
}

