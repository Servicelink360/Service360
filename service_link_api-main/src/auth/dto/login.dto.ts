import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, MaxLength, MinLength } from "class-validator";
import { userType } from "../../constants/user";

export class LoginDto {

    @ApiProperty({ required: true, default: 'admin', maxLength: 50, minLength: 5 })
    @MaxLength(50)
    @MinLength(5)
    @IsNotEmpty()
    username: string;

    @ApiProperty({ required: true, default: '123456', maxLength: 50, minLength: 6 })
    @IsNotEmpty()
    @MaxLength(50)
    @MinLength(6)
    password: string;

    @ApiProperty({ required: true, default: '1.0.0', description: "1.0.0", maxLength: 10 })
    @IsNotEmpty()
    @MaxLength(10)
    version: string;

    @ApiProperty({ required: true, default: userType.ADMIN, enum: userType })
    type: number

    @ApiProperty({ required: true, default: '', description: "" })
    sessionId: string;
}