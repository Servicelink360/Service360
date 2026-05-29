import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, MaxLength } from "class-validator";

export class ChangeProfileDto {

    @ApiProperty({ required: true, default: "",  maxLength: 300 })
    @MaxLength(300)
    @IsOptional()
    avatar: string;

    @ApiProperty({ required: true, default: '', maxLength: 100 })
    fullName: string


    @ApiProperty({ required: true, default: '', maxLength: 100 })
    phone: string

    @ApiProperty({ required: true, default: '' })
    gender: string


    @ApiProperty({ required: true, default: '' })
    dob: Date

    @ApiProperty({ required: true, default: '' })
    address: string

}

