import { PartialType } from '@nestjs/swagger';
import { CreateReportFaultDto } from './create-report-fault.dto';

export class UpdateReportFaultDto extends PartialType(CreateReportFaultDto) {}
