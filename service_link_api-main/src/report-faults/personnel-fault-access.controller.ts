import { Controller, Get, Patch, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { customHttpCode } from '../helpers/util';
import { PersonnelFaultAccessService } from './personnel-fault-access.service';

@ApiTags('PersonnelFaultAccess')
@Controller({ path: 'personnel-fault-access', version: ['1'] })
export class PersonnelFaultAccessController {
  constructor(private readonly service: PersonnelFaultAccessService) {}

  @Get('view')
  @ApiOperation({ summary: 'Public magic-link view of delegated fault report' })
  async view(@Res() res, @Query('token') token?: string) {
    return customHttpCode(res, await this.service.viewByToken(token ?? ''));
  }

  @Patch('mark-acted')
  @ApiOperation({ summary: 'Personnel confirms they acted on delegated fault' })
  async markActed(@Res() res, @Query('token') token?: string) {
    return customHttpCode(res, await this.service.markActedByToken(token ?? ''));
  }
}
