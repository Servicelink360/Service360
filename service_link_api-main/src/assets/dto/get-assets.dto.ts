import { ApiProperty } from '@nestjs/swagger';
import { BaseRequest } from '../../base/request/base.request';

export class GetAssetsDto extends BaseRequest {
  @ApiProperty({ required: false, description: 'active | deleted' })
  status?: string;

  @ApiProperty({ required: false })
  companyId?: number;

  @ApiProperty({ required: false })
  assetStatus?: string;

  @ApiProperty({ required: false })
  category?: string;
}
