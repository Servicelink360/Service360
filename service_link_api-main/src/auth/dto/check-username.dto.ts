import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, MaxLength, MinLength } from "class-validator";

export class CheckUsernameQueryDto {
   
    @ApiProperty({ required: true, default: 'test001', maxLength: 50, minLength: 5 })
    @MaxLength(50)
    @MinLength(5)
    @IsNotEmpty()
    username: string;
}
