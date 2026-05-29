import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
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
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { GetCompaniesDto } from './dto/get-companies.dto';

@ApiTags('Companies')
@Controller({
  path: 'companies',
  version: ['1'],
})
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  async findAll(@Res() res, @Query() query: GetCompaniesDto) {
    return customHttpCode(res, await this.companiesService.findAll(query));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('options')
  async options(@Res() res) {
    return customHttpCode(res, await this.companiesService.getAllOptions());
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  async create(@Res() res, @Body() body: CreateCompanyDto, @Request() req) {
    return customHttpCode(res, await this.companiesService.create(body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id')
  async update(
    @Res() res,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateCompanyDto,
  ) {
    return customHttpCode(res, await this.companiesService.update(id, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':id')
  async remove(@Res() res, @Param('id', ParseIntPipe) id: number) {
    return customHttpCode(res, await this.companiesService.remove(id));
  }
}
