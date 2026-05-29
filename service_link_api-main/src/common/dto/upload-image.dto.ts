import { ApiProperty } from "@nestjs/swagger";

export class UploadImageDto {

    @ApiProperty({ required: false })
    image: string

}



export class GeneratePresignedUrlDto {

    @ApiProperty({ required: false })
    filename: string


    @ApiProperty({ required: false })
    mimeType: string

}