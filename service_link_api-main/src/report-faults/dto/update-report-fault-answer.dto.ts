import { PartialType } from '@nestjs/swagger';
import { CreateReportFaultAnswerDto } from './create-report-fault-answer.dto';

export class UpdateReportFaultAnswerDto extends PartialType(CreateReportFaultAnswerDto) {}
