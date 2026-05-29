import { ApiProperty } from "@nestjs/swagger";

export class RequestSignUpDto {

    @ApiProperty({default:'',description:"email"})
    email: string;

    @ApiProperty({ default: '' })
    platform: string

}

