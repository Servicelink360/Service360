import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNotEmpty, MaxLength, MinLength } from "class-validator";

export class ResetPasswordDto {
    @ApiProperty({ required: true, description: 'Password', maxLength: 50, minLength: 6 })
    @Transform(({ obj, value }) => value ?? obj?.Password)
    @MaxLength(50)
    @IsNotEmpty()
    @MinLength(6)
    password: string;


    @ApiProperty({ required: true, description: '', maxLength: 100 })
    @Transform(({ obj, value }) =>
      String(value ?? obj?.Token ?? obj?.token ?? '')
        .trim()
        .toUpperCase(),
    )
    @IsNotEmpty()
    @MaxLength(100)
    token: string;
}
