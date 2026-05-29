import { PartialType } from '@nestjs/swagger';
import { CreateTicketAnswerDto } from './create-ticket-answer.dto';

export class UpdateTicketAnswerDto extends PartialType(CreateTicketAnswerDto) {}
