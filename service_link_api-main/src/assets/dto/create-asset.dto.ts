import { ApiProperty } from '@nestjs/swagger';

export class CreateAssetDto {
  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  assetTag?: string;

  @ApiProperty({ required: false })
  category?: string;

  @ApiProperty({ required: false, description: 'active | maintenance | retired | disposed' })
  status?: string;

  @ApiProperty({ description: 'customer_companies.id (required)' })
  companyId: number;

  @ApiProperty({ required: false })
  companyName?: string;

  @ApiProperty({ required: false })
  siteId?: number;

  @ApiProperty({ required: false })
  siteName?: string;

  @ApiProperty({ required: false })
  locationDetail?: string;

  @ApiProperty({ required: false })
  manufacturer?: string;

  @ApiProperty({ required: false })
  model?: string;

  @ApiProperty({ required: false })
  serialNumber?: string;

  @ApiProperty({ required: false })
  installDate?: string;

  @ApiProperty({ required: false })
  warrantyExpiry?: string;

  @ApiProperty({ required: false, description: 'good | fair | poor | critical' })
  condition?: string;

  @ApiProperty({ required: false })
  notes?: string;

  @ApiProperty({ required: false, description: 'JSON array of file URLs' })
  attachFiles?: string;
}
