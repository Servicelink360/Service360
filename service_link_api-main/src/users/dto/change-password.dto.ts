import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, MaxLength, MinLength } from "class-validator";

export class ChangePasswordDto {


    @ApiProperty({ required: true, maxLength: 100, description: "new password" })
    @IsNotEmpty()
    @MaxLength(100)
    @MinLength(6)
    newPassword: string

    @ApiProperty({ required: true, maxLength: 100, description: "current password" })
    @IsNotEmpty()
    @MaxLength(100)
    @MinLength(6)
    oldPassword: string

}


export class ChangePasswordByUserDto {

    @ApiProperty({ required: true, maxLength: 100, description: "new password" })
    @IsNotEmpty()
    @MaxLength(100)
    @MinLength(6)
    newPassword: string

}


export class ChangePasswordAdminDto {


    @ApiProperty({ required: true, maxLength: 100, description: "new password" })
    @IsNotEmpty()
    @MaxLength(100)
    @MinLength(6)
    newPassword: string

    @ApiProperty({ required: true, default:0})
    userId:number

}