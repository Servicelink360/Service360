

import { Controller, Get, Post, Body, Patch, Param, Delete, Put, Query, Res, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { customHttpCode } from '../helpers/util';
import { IUserInfo } from '../interfaces/IUserInfo';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { GetServicesDto } from './dto/get-services.dto';
import {
  CreateServiceActivityDto,
  UpdateServiceActivityDto,
} from './dto/service-activity.dto';
import { FaultIssuesService } from '../fault-issues/fault-issues.service';
import { AddServiceFaultIssueDto } from '../fault-issues/dto/add-service-fault-issue.dto';
import { ReplaceServiceFaultIssuesDto } from '../fault-issues/dto/replace-service-fault-issues.dto';

@ApiTags("Services")
@Controller({
  path: 'services',
  version: ['1'],
})
export class ServicesController {
  constructor(
    private readonly servicesService: ServicesService,
    private readonly faultIssuesService: FaultIssuesService,
  ) {}
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
  @Get(':id/activities')
  async listActivities(@Res() res, @Param('id', ParseIntPipe) id: number) {
    return customHttpCode(res, await this.servicesService.listActivities(id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post(':id/activities')
  async createActivity(
    @Res() res,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CreateServiceActivityDto,
  ) {
    return customHttpCode(res, await this.servicesService.createActivity(id, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id/activities/:activityId')
  async updateActivity(
    @Res() res,
    @Param('id', ParseIntPipe) id: number,
    @Param('activityId', ParseIntPipe) activityId: number,
    @Body() body: UpdateServiceActivityDto,
  ) {
    return customHttpCode(res, await this.servicesService.updateActivity(id, activityId, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':id/activities/:activityId')
  async removeActivity(
    @Res() res,
    @Param('id', ParseIntPipe) id: number,
    @Param('activityId', ParseIntPipe) activityId: number,
  ) {
    return customHttpCode(res, await this.servicesService.removeActivity(id, activityId));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(':id/fault-issues')
  async listFaultIssues(@Res() res, @Param('id', ParseIntPipe) id: number) {
    return customHttpCode(res, await this.faultIssuesService.listForService(id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post(':id/fault-issues')
  async addFaultIssue(
    @Res() res,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AddServiceFaultIssueDto,
  ) {
    return customHttpCode(res, await this.faultIssuesService.addToService(id, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':id/fault-issues/:faultIssueId')
  async removeFaultIssue(
    @Res() res,
    @Param('id', ParseIntPipe) id: number,
    @Param('faultIssueId', ParseIntPipe) faultIssueId: number,
  ) {
    return customHttpCode(res, await this.faultIssuesService.removeFromService(id, faultIssueId));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put(':id/fault-issues')
  async replaceFaultIssues(
    @Res() res,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ReplaceServiceFaultIssuesDto,
  ) {
    return customHttpCode(
      res,
      await this.faultIssuesService.replaceForService(id, body.faultIssueIds ?? []),
    );
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

