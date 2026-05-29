import { ApiProperty } from '@nestjs/swagger';

export class ChangeStatusDto  {
    @ApiProperty()
    id: number
    
    @ApiProperty()
    status:number
}
