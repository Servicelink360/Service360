import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { customHttpCode } from '../helpers/util';
import { IUserInfo } from '../interfaces/IUserInfo';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { GetAssetsDto } from './dto/get-assets.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';

@ApiTags('Assets')
@Controller({
  path: 'assets',
  version: ['1'],
})
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  async create(@Res() res, @Body() body: CreateAssetDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.assetsService.create(user, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  async findAll(@Res() res, @Query() body: GetAssetsDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.assetsService.findAll(user, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('deleted/count')
  async deletedCount(@Res() res, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.assetsService.countDeletedTab(user));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(':id')
  async findOne(@Res() res, @Param('id') id: string, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.assetsService.findOne(user, +id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id/restore')
  async restore(@Res() res, @Param('id') id: string, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.assetsService.restore(user, +id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id')
  async update(
    @Res() res,
    @Param('id') id: string,
    @Body() body: UpdateAssetDto,
    @Request() req,
  ) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.assetsService.update(user, +id, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':id')
  async remove(@Res() res, @Param('id') id: string, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.assetsService.remove(user, +id));
  }
}
