import { Controller, Delete, Get, Param, Patch, Post, Body, Query, Res, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { customHttpCode } from '../helpers/util';
import { IUserInfo } from '../interfaces/IUserInfo';
import { CustomerPersonnelService } from './customer-personnel.service';
import { CreateCustomerPersonnelDto } from './dto/create-customer-personnel.dto';
import { UpdateCustomerPersonnelDto } from './dto/update-customer-personnel.dto';
import { CreateCustomerPersonnelRoleTypeDto } from './dto/create-customer-personnel-role-type.dto';

@ApiTags('CustomerPersonnel')
@Controller({ path: 'customer-personnel', version: ['1'] })
export class CustomerPersonnelController {
  constructor(private readonly service: CustomerPersonnelService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('role-types')
  async listRoleTypes(@Res() res, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.service.listRoleTypes(user));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('role-types')
  async createRoleType(
    @Res() res,
    @Request() req,
    @Body() body: CreateCustomerPersonnelRoleTypeDto,
  ) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.service.createRoleType(user, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('role-types/:typeId')
  async removeRoleType(@Res() res, @Request() req, @Param('typeId') typeId: string) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.service.removeRoleType(user, +typeId));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  async list(@Res() res, @Request() req, @Query('faultId') faultId?: string) {
    const user: IUserInfo = req.user;
    const fid = faultId != null && faultId !== '' ? +faultId : undefined;
    return customHttpCode(res, await this.service.list(user, fid));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  async create(@Res() res, @Request() req, @Body() body: CreateCustomerPersonnelDto) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.service.create(user, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id')
  async update(
    @Res() res,
    @Request() req,
    @Param('id') id: string,
    @Body() body: UpdateCustomerPersonnelDto,
  ) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.service.update(user, +id, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':id')
  async remove(@Res() res, @Request() req, @Param('id') id: string) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.service.remove(user, +id));
  }
}
