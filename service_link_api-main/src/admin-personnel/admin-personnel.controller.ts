import { Controller, Delete, Get, Param, Patch, Post, Body, Res, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { customHttpCode } from '../helpers/util';
import { IUserInfo } from '../interfaces/IUserInfo';
import { AdminPersonnelService } from './admin-personnel.service';
import { CreateAdminPersonnelDto } from './dto/create-admin-personnel.dto';
import { UpdateAdminPersonnelDto } from './dto/update-admin-personnel.dto';
import { CreateAdminPersonnelRoleTypeDto } from './dto/create-admin-personnel-role-type.dto';

@ApiTags('AdminPersonnel')
@Controller({ path: 'admin-personnel', version: ['1'] })
export class AdminPersonnelController {
  constructor(private readonly service: AdminPersonnelService) {}

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
  async createRoleType(@Res() res, @Request() req, @Body() body: CreateAdminPersonnelRoleTypeDto) {
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
  async list(@Res() res, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.service.list(user));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  async create(@Res() res, @Request() req, @Body() body: CreateAdminPersonnelDto) {
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
    @Body() body: UpdateAdminPersonnelDto,
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
