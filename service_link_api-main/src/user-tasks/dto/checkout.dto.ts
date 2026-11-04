import { ApiProperty } from "@nestjs/swagger"

export class CheckoutDto {
   @ApiProperty({default:""})
    isCompleted:number

   @ApiProperty({
     required: false,
     description: 'JSON array or comma-separated media URLs when media is required',
   })
   images?: string
}
