import { PartialType } from '@nestjs/swagger';
import { CreateAdminPersonnelDto } from './create-admin-personnel.dto';

export class UpdateAdminPersonnelDto extends PartialType(CreateAdminPersonnelDto) {}
