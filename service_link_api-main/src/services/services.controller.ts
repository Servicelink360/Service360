

import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Res, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { customHttpCode } from '../helpers/util';
import { IUserInfo } from '../interfaces/IUserInfo';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { GetServicesDto } from './dto/get-services.dto';
@ApiTags("Services")
@Controller({
  path: 'services',
  version: ['1'],
})
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  async create(@Res() res, @Body() body: CreateServiceDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.servicesService.create(user, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  async findAll(@Res() res, @Query() body: GetServicesDto) {
    return customHttpCode(res, await this.servicesService.findAll(body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('getAll')
  async getAll(@Res() res) {
    return customHttpCode(res, await this.servicesService.getAll());
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id')
  async update(@Res() res, @Param('id', ParseIntPipe) id: number, @Body() body: UpdateServiceDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.servicesService.update(user, id, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':id')
  async remove(@Res() res, @Param('id', ParseIntPipe) id: number) {
    return customHttpCode(res, await this.servicesService.remove(id));
  }
}

