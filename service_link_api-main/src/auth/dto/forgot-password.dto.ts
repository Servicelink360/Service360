import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEmail } from "class-validator";

export class ForgotPasswordDto {

    @ApiProperty({ required: true, default: '', maxLength: 100 })
    @Transform(({ obj, value }) => (value ?? obj?.Email ?? '').toString().trim().toLowerCase())
    @IsEmail()
    email: string
}


export class ForgotPassword2Dto {

    @ApiProperty({ required: true, default: '', maxLength: 100 })
    @Transform(({ obj, value }) => (value ?? obj?.Email ?? '').toString().trim().toLowerCase())
    email: string

    @ApiProperty({ required: false, default: '', maxLength: 10 })
    @Transform(({ obj, value }) => (value ?? obj?.Phone ?? '').toString().trim())
    phone: string

    @ApiProperty({ required: false, default: '', maxLength: 10 })
    @Transform(({ obj, value }) => (value ?? obj?.OS ?? obj?.Platform ?? value ?? 'web').toString())
    platform:string
}

