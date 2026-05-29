import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";

export class VerifyTokenDto {
    @ApiProperty({ required: true, description: '', maxLength: 100 })
    @IsNotEmpty()
    confirmToken: string;
}