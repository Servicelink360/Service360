import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import {Query, Res, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { customHttpCode } from '../helpers/util';
import { IUserInfo } from '../interfaces/IUserInfo';
import { GetGroupsDto } from './dto/get-groups.dto';
@ApiTags("Groups")
@Controller({
  path: 'groups',
  version: ['1'],
})
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  async create(@Res() res, @Body() body: CreateGroupDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.groupsService.create(user, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  async findAll(@Res() res, @Query() body: GetGroupsDto) {
    return customHttpCode(res, await this.groupsService.findAll(body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('getAll')
  async getAll(@Res() res) {
    return customHttpCode(res, await this.groupsService.getAll());
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id')
  async update(@Res() res, @Param('id') id: string, @Body() body: UpdateGroupDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.groupsService.update(user, id, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':id')
  async remove(@Res() res, @Param('id') id: string) {
    return customHttpCode(res, await this.groupsService.remove(id));
  }
}


