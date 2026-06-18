import { Controller, Get, Post, Body, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { customHttpCode } from '../helpers/util';
import { FaultIssuesService } from './fault-issues.service';
import { CreateFaultIssueDto } from './dto/create-fault-issue.dto';

@ApiTags('FaultIssues')
@Controller({
  path: 'fault-issues',
  version: ['1'],
})
export class FaultIssuesController {
  constructor(private readonly faultIssuesService: FaultIssuesService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  async listCatalog(@Res() res) {
    return customHttpCode(res, await this.faultIssuesService.listCatalog());
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  async createCatalogIssue(@Res() res, @Body() body: CreateFaultIssueDto) {
    return customHttpCode(res, await this.faultIssuesService.createCatalogIssue(body));
  }
}
