import { PartialType } from '@nestjs/swagger';
import { CreateCustomerPersonnelDto } from './create-customer-personnel.dto';

export class UpdateCustomerPersonnelDto extends PartialType(CreateCustomerPersonnelDto) {
  isActive?: boolean;
}
