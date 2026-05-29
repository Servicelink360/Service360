import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDailyJobDto  {
    @ApiProperty({default:''})
    checkIn: Date
    @ApiProperty({default:''})
    checkOut:Date
}
