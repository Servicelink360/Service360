import { ApiProperty } from "@nestjs/swagger"

export class CheckoutDto {
   @ApiProperty({default:""})
    isCompleted:number
}
