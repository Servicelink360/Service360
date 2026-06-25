import { ApiProperty } from '@nestjs/swagger';

export class SetFaultDelegationDto {
  @ApiProperty({ enum: ['admin', 'personnel', 'staff', 'admin_personnel'] })
  delegatedToType: 'admin' | 'personnel' | 'staff' | 'admin_personnel';

  @ApiProperty({ required: false })
  delegatedToPersonnelId?: number;

  @ApiProperty({ required: false })
  delegatedToStaffId?: number;

  @ApiProperty()
  delegatedUntil: string;

  @ApiProperty({ required: false })
  delegationNote?: string;
}
