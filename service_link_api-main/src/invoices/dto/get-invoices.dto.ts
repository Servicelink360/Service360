import { ApiProperty } from '@nestjs/swagger';
import { BaseRequest } from '../../base/request/base.request';

export class GetInvoicesDto extends BaseRequest {
  @ApiProperty({ required: false })
  startDate?: string;

  @ApiProperty({ required: false })
  endDate?: string;

  @ApiProperty({ required: false, description: 'active | deleted' })
  status?: string;
}
