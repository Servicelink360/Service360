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
  @Get('admin/signoffs')
  async signoffs(@Res() res, @Request() req) {
    return customHttpCode(res, await this.toolboxService.listSignoffs(req.user));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('signoffs/:id/pdf')
  async signoffPdf(@Res() res, @Param('id') id: string, @Request() req) {
    return customHttpCode(res, await this.toolboxService.printSignoff(req.user, +id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('sessions/:id/pdf')
  async sessionPdf(@Res() res, @Param('id') id: string, @Request() req) {
    return customHttpCode(res, await this.toolboxService.printSession(req.user, +id));
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
  @Patch('admin/sessions/:id/form')
  async updateSessionForm(@Res() res, @Param('id') id: string, @Body() body: any, @Request() req) {
    return customHttpCode(res, await this.toolboxService.updateSessionForm(req.user, +id, body || {}));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('admin/sessions/:id')
  async deleteSession(@Res() res, @Param('id') id: string, @Request() req) {
    return customHttpCode(res, await this.toolboxService.deleteSession(req.user, +id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('admin/sessions/:id/restore')
  async restoreSession(@Res() res, @Param('id') id: string, @Request() req) {
    return customHttpCode(res, await this.toolboxService.restoreSession(req.user, +id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('admin/sessions/:id/permanent')
  async purgeSession(@Res() res, @Param('id') id: string, @Request() req) {
    return customHttpCode(res, await this.toolboxService.purgeSession(req.user, +id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('deleted')
  async deleted(@Res() res, @Request() req) {
    return customHttpCode(res, await this.toolboxService.listDeleted(req.user));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('signoffs/:id')
  async updateSignoff(@Res() res, @Param('id') id: string, @Body() body: any, @Request() req) {
    return customHttpCode(res, await this.toolboxService.updateSignoff(req.user, +id, body || {}));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('signoffs/:id')
  async deleteSignoff(@Res() res, @Param('id') id: string, @Request() req) {
    return customHttpCode(res, await this.toolboxService.deleteSignoff(req.user, +id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('signoffs/:id/restore')
  async restoreSignoff(@Res() res, @Param('id') id: string, @Request() req) {
    return customHttpCode(res, await this.toolboxService.restoreSignoff(req.user, +id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('signoffs/:id/permanent')
  async purgeSignoff(@Res() res, @Param('id') id: string, @Request() req) {
    return customHttpCode(res, await this.toolboxService.purgeSignoff(req.user, +id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  async mine(@Res() res, @Request() req) {
    return customHttpCode(res, await this.toolboxService.myAttendance(req.user));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('talks/:id/signoff')
  async signoff(@Res() res, @Param('id') id: string, @Body() body: { signatureName?: string }, @Request() req) {
    return customHttpCode(
      res,
      await this.toolboxService.signTalk(req.user, +id, body?.signatureName || ''),
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('sessions/:id/acknowledge')
  async acknowledge(
    @Res() res,
    @Param('id') id: string,
    @Body() body: { signatureName?: string },
    @Request() req,
  ) {
    return customHttpCode(
      res,
      await this.toolboxService.acknowledge(req.user, +id, body?.signatureName || ''),
    );
  }
}
