import { ApiProperty } from "@nestjs/swagger";
import { IsNumber } from "class-validator";

export class ChangeStatusDto {
    @ApiProperty({ required: true, default: 1, enum:[1,2],description:"1: Active, 3: Lock" })
    @IsNumber()
    status: number;
}