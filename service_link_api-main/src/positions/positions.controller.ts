

import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Res, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { customHttpCode } from '../helpers/util';
import { IUserInfo } from '../interfaces/IUserInfo';
import { PositionsService } from './positions.service';
import { CreatePositionDto } from './dto/create-position.dto';
import { GetPositionsDto } from './dto/get-positions.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
@ApiTags("Positions")
@Controller({
  path: 'positions',
  version: ['1'],
})
export class PositionsController {
  constructor(private readonly positionsService: PositionsService) { }
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  async create(@Res() res, @Body() body: CreatePositionDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.positionsService.create(user, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  async findAll(@Res() res, @Query() body: GetPositionsDto) {
    return customHttpCode(res, await this.positionsService.findAll(body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('getAll')
  async getAll(@Res() res) {
    return customHttpCode(res, await this.positionsService.getAll());
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id')
  async update(@Res() res, @Param('id') id: string, @Body() body: UpdatePositionDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.positionsService.update(user, id, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':id')
  async remove(@Res() res, @Param('id') id: string) {
    return customHttpCode(res, await this.positionsService.remove(id));
  }
}


