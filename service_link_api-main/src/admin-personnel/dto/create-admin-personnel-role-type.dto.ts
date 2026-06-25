import { ApiProperty } from '@nestjs/swagger';

export class CreateAdminPersonnelRoleTypeDto {
  @ApiProperty()
  label: string;
}
