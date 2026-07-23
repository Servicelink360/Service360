import { ApiProperty } from '@nestjs/swagger';

export class UpdateAssetDto {
  @ApiProperty({ required: false })
  name?: string;

  @ApiProperty({ required: false })
  assetTag?: string | null;

  @ApiProperty({ required: false })
  category?: string | null;

  @ApiProperty({ required: false })
  status?: string;

  @ApiProperty({ required: false })
  companyId?: number;

  @ApiProperty({ required: false })
  companyName?: string;

  @ApiProperty({ required: false })
  siteId?: number | null;

  @ApiProperty({ required: false })
  siteName?: string | null;

  @ApiProperty({ required: false })
  locationDetail?: string | null;

  @ApiProperty({ required: false })
  manufacturer?: string | null;

  @ApiProperty({ required: false })
  model?: string | null;

  @ApiProperty({ required: false })
  serialNumber?: string | null;

  @ApiProperty({ required: false })
  installDate?: string | null;

  @ApiProperty({ required: false })
  warrantyExpiry?: string | null;

  @ApiProperty({ required: false })
  condition?: string | null;

  @ApiProperty({ required: false })
  notes?: string | null;

  @ApiProperty({ required: false })
  attachFiles?: string;
}
