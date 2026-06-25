

import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Res, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { customHttpCode } from '../helpers/util';
import { IUserInfo } from '../interfaces/IUserInfo';
import { SetFaultDelegationDto } from './dto/set-fault-delegation.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { ReportFaultsService } from './report-faults.service';
import { CreateReportFaultDto } from './dto/create-report-fault.dto';
import { UpdateReportFaultDto } from './dto/update-report-fault.dto';
import { CreateReportFaultAnswerDto } from './dto/create-report-fault-answer.dto';
import { UpdateReportFaultAnswerDto } from './dto/update-report-fault-answer.dto';
import { GetReportFaultsDto } from './entities/get-report-faults.dto';
import { ClearDeletedFaultsDto } from './dto/clear-deleted-faults.dto';
import { userType } from '../constants/user';
import { errorCode } from '../constants/errorCode';

@ApiTags("ReportFaults")
@Controller({
  path: 'report-faults',
  version: ['1'],
})
export class ReportFaultsController {
  constructor(private readonly reportFaultsService: ReportFaultsService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  async create(@Res() res, @Body() body: CreateReportFaultDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.reportFaultsService.create(user, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('issueOptions')
  async getIssueOptions(@Res() res, @Query('serviceId') serviceId?: string) {
    return customHttpCode(res, await this.reportFaultsService.getIssueOptions(serviceId));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('findAllGroupByDate')
  async findAllGroupByDate(@Res() res, @Query() body: GetReportFaultsDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.reportFaultsService.findAllGroupByDate(user, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('my-tasks')
  async findMyTasks(@Res() res, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.reportFaultsService.findMyTasksForStaff(user));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  async findAll(@Res() res, @Query() body: GetReportFaultsDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.reportFaultsService.findAll(user,body));
  }


  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('changeStatus')
  async changeStatus(@Res() res, @Body() body: ChangeStatusDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.reportFaultsService.changeStatus(user, body));
  }


  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('markAllReportFaultsOpened')
  async markAllReportFaultsOpened(@Res() res, @Request() req) {
    const user: IUserInfo = req.user;
    if (+user.type === userType.ADMIN) {
      return customHttpCode(res, await this.reportFaultsService.markAllReportFaultsOpenedForAdmin(user));
    }
    if (+user.type === userType.CUSTOMER) {
      return customHttpCode(res, await this.reportFaultsService.markAllReportFaultsOpenedForCustomer(user));
    }
    return customHttpCode(res, errorCode.CAN_NOT_DELETE);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('markAdminOpened/:id')
  async markAdminOpened(@Res() res, @Param('id') id: string, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.reportFaultsService.markAdminOpened(user, +id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('markCustomerOpened/:id')
  async markCustomerOpened(@Res() res, @Param('id') id: string, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.reportFaultsService.markCustomerOpened(user, +id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('markAdminUnread/:id')
  async markAdminUnread(@Res() res, @Param('id') id: string, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.reportFaultsService.markAdminUnread(user, +id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('markCustomerUnread/:id')
  async markCustomerUnread(@Res() res, @Param('id') id: string, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.reportFaultsService.markCustomerUnread(user, +id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('clear-deleted')
  async clearDeletedVisible(
    @Res() res,
    @Request() req,
    @Body() body: ClearDeletedFaultsDto,
  ) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.reportFaultsService.purgeDeletedFaultsByIds(user, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id/restore')
  async restoreFault(@Res() res, @Param('id') id: string, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.reportFaultsService.restoreFault(user, id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id/staff-view')
  async markStaffAssignmentViewed(@Res() res, @Param('id') id: string, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.reportFaultsService.markStaffAssignmentViewed(user, +id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id/staff-acted')
  async markStaffAssignmentActed(@Res() res, @Param('id') id: string, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.reportFaultsService.markStaffAssignmentActed(user, +id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id/delegation')
  async setDelegation(
    @Res() res,
    @Param('id') id: string,
    @Body() body: SetFaultDelegationDto,
    @Request() req,
  ) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.reportFaultsService.setDelegation(user, +id, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id/complete')
  async completeFault(@Res() res, @Param('id') id: string, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.reportFaultsService.completeFault(user, +id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id/nudge-assignee')
  async nudgeDelegationAssignee(@Res() res, @Param('id') id: string, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.reportFaultsService.nudgeDelegationAssignee(user, +id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id/reopen')
  async reopenFault(@Res() res, @Param('id') id: string, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.reportFaultsService.reopenFault(user, +id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id/priority')
  async setFaultPriority(
    @Res() res,
    @Param('id') id: string,
    @Body() body: { priority?: number },
    @Request() req,
  ) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.reportFaultsService.setFaultPriority(user, +id, body?.priority));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id')
  async update(@Res() res, @Param('id') id: string, @Body() body: UpdateReportFaultDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.reportFaultsService.update(user, id, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':id')
  async remove(
    @Res() res,
    @Param('id') id: string,
    @Query('answerId') answerId: string,
    @Request() req,
  ) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.reportFaultsService.remove(user, id, answerId));
  }



  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('createComment')
  async createComment(@Res() res, @Body() body: CreateReportFaultAnswerDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.reportFaultsService.createComment(user, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('updateComment/:id')
  async updateComment(@Res() res, @Param('id') id: string, @Body() body: UpdateReportFaultAnswerDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.reportFaultsService.updateComment(user, +id, body));
  }
}


