import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateTicketDto } from './create-ticket.dto';

export class ChangeStatusDto  {
    @ApiProperty()
    id: number
    
    @ApiProperty()
    status:number
}
