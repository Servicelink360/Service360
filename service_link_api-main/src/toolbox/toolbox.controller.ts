import { Body, Controller, Delete, Get, Param, Patch, Post, Request, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { customHttpCode } from '../helpers/util';
import { ToolboxService } from './toolbox.service';

@ApiTags('Toolbox')
@Controller({
  path: 'toolbox',
  version: ['1'],
})
export class ToolboxController {
  constructor(private readonly toolboxService: ToolboxService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('talks')
  async talks(@Res() res, @Request() req) {
    return customHttpCode(res, await this.toolboxService.listTalks(req.user));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('admin/talks')
  async adminTalks(@Res() res, @Request() req) {
    return customHttpCode(res, await this.toolboxService.adminListTalks(req.user));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('admin/talks')
  async createTalk(@Res() res, @Body() body: any, @Request() req) {
    return customHttpCode(res, await this.toolboxService.adminCreateTalk(req.user, body || {}));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('admin/talks/:id')
  async updateTalk(@Res() res, @Param('id') id: string, @Body() body: any, @Request() req) {
    return customHttpCode(res, await this.toolboxService.adminUpdateTalk(req.user, +id, body || {}));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('admin/talks/:id')
  async deleteTalk(@Res() res, @Param('id') id: string, @Request() req) {
    return customHttpCode(res, await this.toolboxService.adminDeleteTalk(req.user, +id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('admin/sessions')
  async sessions(@Res() res, @Request() req) {
    return customHttpCode(res, await this.toolboxService.listSessions(req.user));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('admin/sessions/:id')
  async session(@Res() res, @Param('id') id: string, @Request() req) {
    return customHttpCode(res, await this.toolboxService.getSession(req.user, +id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('admin/sessions')
  async createSession(@Res() res, @Body() body: any, @Request() req) {
    return customHttpCode(res, await this.toolboxService.createSession(req.user, body || {}));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('admin/sessions/:id')
  async updateSession(@Res() res, @Param('id') id: string, @Body() body: any, @Request() req) {
    return customHttpCode(res, await this.toolboxService.updateSession(req.user, +id, body || {}));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('admin/sessions/:id')
  async deleteSession(@Res() res, @Param('id') id: string, @Request() req) {
    return customHttpCode(res, await this.toolboxService.deleteSession(req.user, +id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  async mine(@Res() res, @Request() req) {
    return customHttpCode(res, await this.toolboxService.myAttendance(req.user));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('sessions/:id/acknowledge')
  async acknowledge(@Res() res, @Param('id') id: string, @Request() req) {
    return customHttpCode(res, await this.toolboxService.acknowledge(req.user, +id));
  }
}
