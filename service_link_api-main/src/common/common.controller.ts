import { Controller, Get, Query, Res, UseGuards, Request, Body, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { customHttpCode } from 'src/helpers/util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CommonService } from './common.service';
import { GetInitDataDto } from './dto/get-init-data';
import { IErrorData } from '../interfaces/IErrorData';
import { IUserInfo } from '../interfaces/IUserInfo';
import { GeneratePresignedUrlDto, UploadImageDto } from './dto/upload-image.dto';

@ApiTags("Common")
@Controller({
  path: 'common',
  version: ['1'],
})

export class CommonController {
  constructor(private readonly commonService: CommonService) { }

  @Get("getInitData")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Only use for Dropdown' })
  async getInitData(@Res() res, @Query() body: GetInitDataDto, @Request() req): Promise<IErrorData> {
    const userInfo: IUserInfo = req.user;
    return customHttpCode(res, await this.commonService.getInitData(body, userInfo));
  }
  @Get("dashboardData")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async dashboardData(@Res() res, @Request() req): Promise<IErrorData> {
    const userInfo: IUserInfo = req.user;
    return customHttpCode(res, await this.commonService.dashboardData(userInfo));
  }


  @Post("uploadImage")
  async uploadImage(@Res() res, @Body() body: UploadImageDto): Promise<IErrorData> {
    return customHttpCode(res, await this.commonService.uploadImage(body));
  }

  @Post("generatePresignedUrl")
  async generatePresignedUrl(@Res() res, @Body() body: GeneratePresignedUrlDto): Promise<IErrorData> {
    return customHttpCode(res, await this.commonService.generatePresignedUrl(body));
  }

}
