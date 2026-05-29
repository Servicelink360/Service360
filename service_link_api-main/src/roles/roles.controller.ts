import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Res, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { customHttpCode } from '../helpers/util';
import { IUserInfo } from '../interfaces/IUserInfo';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { GetRolesDto } from './dto/get-roles.dto';

@ApiTags("Roles")
@Controller({
  path: 'roles',
  version: ['1'],
})
export class RolesController {
  constructor(private readonly rolesService: RolesService) { }
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  async create(@Res() res, @Body() body: CreateRoleDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.rolesService.create(user, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  async findAll(@Res() res, @Query() body: GetRolesDto) {
    return customHttpCode(res, await this.rolesService.findAll(body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('getAll')
  async getAll(@Res() res) {
    return customHttpCode(res, await this.rolesService.getAll());
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id')
  async update(@Res() res, @Param('id') id: string, @Body() body: UpdateRoleDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.rolesService.update(user, id, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':id')
  async remove(@Res() res, @Param('id') id: string) {
    return customHttpCode(res, await this.rolesService.remove(id));
  }
}


