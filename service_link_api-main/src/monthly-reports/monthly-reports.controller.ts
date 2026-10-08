import { Body, Controller, Delete, Get, Post, Put, Query, Request, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { customHttpCode } from '../helpers/util';
import { MonthlyReportsService } from './monthly-reports.service';

@ApiTags('Monthly reports')
@Controller({
  path: 'monthly-reports',
  version: ['1'],
})
export class MonthlyReportsController {
  constructor(private readonly monthlyReportsService: MonthlyReportsService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('published')
  async published(@Res() res, @Request() req) {
    return customHttpCode(res, await this.monthlyReportsService.listPublished(req.user));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('customers')
  async customers(
    @Res() res,
    @Query('month') month: string,
    @Query('deleted') deleted: string,
    @Request() req,
  ) {
    return customHttpCode(res, await this.monthlyReportsService.listCustomers(req.user, month, deleted));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put('restore')
  async restoreReport(@Res() res, @Body() body, @Request() req) {
    return customHttpCode(res, await this.monthlyReportsService.restoreReport(req.user, body));
  }

  @Put('visibility')
  async setVisibility(@Res() res, @Body() body, @Request() req) {
    return customHttpCode(res, await this.monthlyReportsService.setClientVisible(req.user, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('copy')
  async copyReport(@Res() res, @Body() body, @Request() req) {
    return customHttpCode(res, await this.monthlyReportsService.copyReport(req.user, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete()
  async deleteReport(
    @Res() res,
    @Query('companyId') companyId: string,
    @Query('month') month: string,
    @Query('permanent') permanent: string,
    @Request() req,
  ) {
    return customHttpCode(res, await this.monthlyReportsService.deleteReport(req.user, companyId, month, permanent));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('pdf')
  async pdf(@Res() res, @Body() body, @Request() req) {
    return customHttpCode(res, await this.monthlyReportsService.createPdf(req.user, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put()
  async saveReport(@Res() res, @Body() body, @Request() req) {
    return customHttpCode(res, await this.monthlyReportsService.saveReport(req.user, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  async getReport(
    @Res() res,
    @Query('companyId') companyId: string,
    @Query('month') month: string,
    @Request() req,
  ) {
    return customHttpCode(
      res,
      await this.monthlyReportsService.getReport(req.user, companyId, month),
    );
  }
}
