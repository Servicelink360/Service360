

import { Controller, Get, Post, Body, Patch, Put, Param, Delete, Query, Res, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { customHttpCode } from '../helpers/util';
import { IUserInfo } from '../interfaces/IUserInfo';
import { ReportTemplatesService } from './report-templates.service';
import { CreateReportTemplateDto } from './dto/create-report-template.dto';
import { UpdateReportTemplateDto } from './dto/update-report-template.dto';
import { GetReportTemplatesDto } from './dto/get-report-templates.dto';
import { CreateReportTemplateCategoryDto } from './dto/create-report-template-category.dto';
import { ReplaceReportTemplateItemsDto } from './dto/replace-report-template-items.dto';

@ApiTags("ReportTemplates")
@Controller({
  path: 'report-templates',
  version: ['1'],
})

export class ReportTemplatesController {
  constructor(private readonly reportTemplatesService: ReportTemplatesService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  async create(@Res() res, @Body() body: CreateReportTemplateDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.reportTemplatesService.create(user, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  async findAll(@Res() res, @Query() body: GetReportTemplatesDto) {
    return customHttpCode(res, await this.reportTemplatesService.findAll(body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('categories')
  async getCategories(@Res() res) {
    return customHttpCode(res, await this.reportTemplatesService.getCategories());
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('categories')
  async createCategory(@Res() res, @Body() body: CreateReportTemplateCategoryDto) {
    return customHttpCode(res, await this.reportTemplatesService.createCategory(body.name));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(':id')
  async findOne(@Res() res, @Param('id') id: string) {
    return customHttpCode(res, await this.reportTemplatesService.findOne(id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post(':id/duplicate')
  async duplicate(@Res() res, @Param('id') id: string, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.reportTemplatesService.duplicate(user, id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id')
  async update(@Res() res, @Param('id') id: string, @Body() body: UpdateReportTemplateDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.reportTemplatesService.update(user, id, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put(':id/items')
  async replaceItems(
    @Res() res,
    @Param('id') id: string,
    @Body() body: ReplaceReportTemplateItemsDto,
    @Request() req,
  ) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.reportTemplatesService.replaceItems(user, id, body.items));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':id')
  async remove(@Res() res, @Param('id') id: string) {
    return customHttpCode(res, await this.reportTemplatesService.remove(id));
  }
}


