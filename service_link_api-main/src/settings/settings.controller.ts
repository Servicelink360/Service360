import { Controller, Get, Post, Body, Res, UseGuards, Request, Query } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { customHttpCode } from '../helpers/util';
import { IUserInfo } from '../interfaces/IUserInfo';
import { UpdateBulkDto } from './dto/update-setting.dto';
@ApiTags("Settings")
@Controller({
  path: 'settings',
  version: ['1'],
})

export class SettingsController {
  constructor(private readonly settingsService: SettingsService) { }
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('updateBulk')
  async updateBulk(@Res() res, @Request() req, @Body() body: UpdateBulkDto) {
    return customHttpCode(res, await this.settingsService.updateBulk(req.user as IUserInfo, body));
  }

  @Get('getSettings')
  async getSettings(@Res() res) {
    return customHttpCode(res, await this.settingsService.getSettings());
  }

  @Get('getSettingsAdmin')
  async getSettingsAdmin(@Res() res) {
    return customHttpCode(res, await this.settingsService.getSettingsAdmin());
  }
}

