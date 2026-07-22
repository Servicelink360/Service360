import {
  Controller,
  Get,
  Headers,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { customHttpCode } from 'src/helpers/util';
import { PublicService } from './public.service';

@ApiTags('Public')
@Controller({
  path: 'public',
  version: ['1'],
})
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('ops-stats')
  @ApiOperation({
    summary:
      'Read-only operational totals for the Servicelink marketing site (sites, reports, faults)',
  })
  @ApiHeader({
    name: 'x-api-key',
    required: false,
    description: 'Required when PUBLIC_STATS_API_KEY is set on the API',
  })
  async opsStats(
    @Res() res,
    @Headers('x-api-key') apiKey?: string,
  ) {
    this.assertApiKey(apiKey);
    return customHttpCode(res, await this.publicService.getOpsStats());
  }

  private assertApiKey(apiKey?: string) {
    const expected = process.env.PUBLIC_STATS_API_KEY?.trim();
    if (!expected) return;
    if (!apiKey || apiKey.trim() !== expected) {
      throw new UnauthorizedException('Invalid API key');
    }
  }
}
