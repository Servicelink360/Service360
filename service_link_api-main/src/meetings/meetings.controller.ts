import { Body, Controller, Get, Post, Query, Request, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { customHttpCode } from '../helpers/util';
import { MeetingsService } from './meetings.service';

@ApiTags('Meetings')
@Controller({
  path: 'meetings',
  version: ['1'],
})
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('people')
  async people(@Res() res, @Query('id') id: string, @Request() req) {
    return customHttpCode(res, await this.meetingsService.people(req.user, id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('inbox')
  async inbox(@Res() res, @Request() req) {
    return customHttpCode(res, await this.meetingsService.inbox(req.user));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('history')
  async history(@Res() res, @Request() req) {
    return customHttpCode(res, await this.meetingsService.history(req.user));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  async create(@Res() res, @Request() req) {
    return customHttpCode(res, await this.meetingsService.create(req.user));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('join')
  async join(@Res() res, @Body() body, @Request() req) {
    return customHttpCode(res, await this.meetingsService.join(req.user, body?.id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('invite')
  async invite(@Res() res, @Body() body, @Request() req) {
    return customHttpCode(res, await this.meetingsService.invite(req.user, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('clear')
  async clearAll(@Res() res, @Request() req) {
    return customHttpCode(res, await this.meetingsService.clearAll(req.user));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('end')
  async end(@Res() res, @Body() body, @Request() req) {
    return customHttpCode(res, await this.meetingsService.end(req.user, body?.id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('leave')
  async leave(@Res() res, @Body() body, @Request() req) {
    return customHttpCode(res, await this.meetingsService.leave(req.user, body?.id));
  }
}
