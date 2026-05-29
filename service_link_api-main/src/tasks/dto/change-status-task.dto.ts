import { ApiProperty } from '@nestjs/swagger';

export class ChangeStatusDto {
    @ApiProperty({ default: 0, enum: [0, 1, 2, 3] })
    status: number
}
