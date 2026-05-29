import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Res, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { customHttpCode } from '../helpers/util';
import { IUserInfo } from '../interfaces/IUserInfo';
import { SitesService } from './sites.service';
import { CreateSiteDto, SiteItemDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';
import { GetShiftsDto, GetSitesDto, GetStaffsBySiteDto } from './dto/get-sites.dto';
@ApiTags("Sites")
@Controller({
  path: 'sites',
  version: ['1'],
})
export class SitesController {
  constructor(private readonly sitesService: SitesService) { }
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  async create(@Res() res, @Body() body: CreateSiteDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.sitesService.create(user, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  async findAll(@Res() res, @Query() body: GetSitesDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.sitesService.findAll(user, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(':id')
  async findOne(@Res() res, @Param('id') id: number) {
    return customHttpCode(res, await this.sitesService.findOne(id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('getAll')
  async getAll(@Res() res) {
    return customHttpCode(res, await this.sitesService.getAll());
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id')
  async update(@Res() res, @Param('id') id: number, @Body() body: UpdateSiteDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.sitesService.update(user, +id, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':id')
  async remove(@Res() res, @Param('id') id: string) {
    return customHttpCode(res, await this.sitesService.remove(id));
  }



  @Post("scheduleSendReminderEmail")
  async scheduleSendReminderEmail(@Res() res, @Request() req) {
    return customHttpCode(res, await this.sitesService.scheduleSendReminderEmail());
  }

  @Get("getUserTaskToday")
  async checkUserTaskToday(@Res() res, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.sitesService.getUserTaskToday(user));
  }


  @Get("getStaffsBySite")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getStaffsBySite(@Res() res, @Request() req, @Query() body: GetStaffsBySiteDto) {
    return customHttpCode(res, await this.sitesService.getStaffsBySite(body.siteId, body.serviceId, body.customerId));
  }


  @Get("getServicesBySite")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getServicesBySite(@Res() res, @Request() req, @Query() body: GetStaffsBySiteDto) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.sitesService.getServicesBySite(user, body.siteId));
  }


  @Get("getCustomersBySite")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getCustomersBySite(@Res() res, @Request() req, @Query() body: GetStaffsBySiteDto) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.sitesService.getCustomersBySite(user, body.siteId, body.serviceId));
  }

  @Get('getStaffDefaultReportAssignment')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getStaffDefaultReportAssignment(@Res() res, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.sitesService.getStaffDefaultReportAssignment(user));
  }

  @Get('getStaffReportAssignmentBySite')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getStaffReportAssignmentBySite(@Res() res, @Request() req, @Query() body: GetStaffsBySiteDto) {
    const user: IUserInfo = req.user;
    const staffId = body.staffId != null && body.staffId !== ('' as any) ? +body.staffId : undefined;
    const serviceId =
      body.serviceId != null && body.serviceId !== ('' as any) && +body.serviceId > 0
        ? +body.serviceId
        : undefined;
    return customHttpCode(
      res,
      await this.sitesService.getStaffReportAssignmentBySite(user, body.siteId, staffId, serviceId),
    );
  }


  @Get("getSites")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getSites(@Res() res, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.sitesService.getSites(user));
  }

  @Get("getShifts")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getShifts(@Res() res, @Request() req, @Query() body: GetShiftsDto) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.sitesService.getShifts(user, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('site-item')
  async AddSiteItem(@Res() res, @Body() body: SiteItemDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.sitesService.AddItem(user, body));
  }


  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('site-item/:id')
  async updateSiteItem(@Res() res, @Param('id') id: number, @Body() body: SiteItemDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.sitesService.updateItem(user, +id, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('site-item/:id')
  async removeSiteItem(@Res() res, @Param('id') id: number, @Request() req) {
    return customHttpCode(res, await this.sitesService.removeSiteItem(id));
  }



  @Get("getSitesByStaff")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getSitesByStaff(@Res() res, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.sitesService.getSitesByStaff(user));
  }
}



