import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";

export class ConfirmEmailDto {
    @ApiProperty({ required: true, default: '' })
    @IsNotEmpty()
    confirm_token: string
    
}