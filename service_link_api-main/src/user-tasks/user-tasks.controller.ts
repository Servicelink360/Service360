import { Controller, Get, Post, Body, Patch, Param, Delete, Res, UseGuards, Request, Query, Put } from '@nestjs/common';
import { UserTasksService } from './user-tasks.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { customHttpCode } from '../helpers/util';
import { IUserInfo } from '../interfaces/IUserInfo';
import { CheckInDto } from './dto/check-in-user-task.dto';
import { ReportUserTaskDto, UserTaskItemDto } from './dto/report-user-task.dto';
import { GetUserTaskDto } from './dto/get-user-tasks.dto';
import { GetUserTasksByUserDto } from './dto/get-user-tasks-by-user.dto';
import { userType } from '../constants/user';
import { errorCode } from '../constants/errorCode';
import { UpdateUserTaskDto } from './dto/update-user-task.dto';
import { CreateUserTaskDto } from './dto/create-user-task.dto';
import { CheckoutDto } from './dto/checkout.dto';
import { CreateCustomReportsDto } from './dto/create-custom-reports.dto';
import { ClearDeletedReportsDto } from './dto/clear-deleted-reports.dto';

@ApiTags("user-tasks")
@Controller({
  path: 'user-tasks',
  version: ['1'],
})
export class UserTasksController {
  constructor(private readonly userTasksService: UserTasksService) { }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('checkIn')
  async checkIn(@Res() res, @Body() body: CheckInDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.userTasksService.checkIn(user, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('updateReport/:id')
  async updateReport(@Res() res, @Body() body: ReportUserTaskDto, @Param('id') id: number, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.userTasksService.updateReport(+id, user, body));
  }


  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('checkOut/:id')
  async checkOut(@Res() res, @Param('id') id: number, @Request() req, @Body() body: CheckoutDto) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.userTasksService.checkOut(user, +id));
  }


  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('taskSuccess/:id')
  async taskSuccess(@Res() res, @Param('id') id: number, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.userTasksService.taskSuccess(user, +id));
  }


  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  async findAll(@Res() res, @Query() body: GetUserTaskDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.userTasksService.findAll(user, body));
  }


  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('getUserTaskToday')
  async getUserTaskToday(@Res() res, @Request() req, @Query('status') status: string) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.userTasksService.getUserTaskByStatus(user, status));
  }


  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('getUserTaskByStatus')
  async getUserTaskByStatus(@Res() res, @Request() req, @Query('status') status: string) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.userTasksService.getUserTaskByStatus(user, status));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('getAllUserTaskToday')
  async getAllUserTaskToday(@Res() res, @Request() req, @Query('status') status: string) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.userTasksService.getUserTaskByStatus(user, status));
  }


  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('getUserTasksByUserId/:userId')
  async getUserTasksByUserId(@Res() res, @Request() req, @Param('userId') userId: number, @Query() body: GetUserTasksByUserDto) {
    const userInfo: IUserInfo = req.user;
    return customHttpCode(res, await this.userTasksService.getUserTasksByUserId(userInfo, body, userId));
  }




  @Post('convertHtmlToPdfTest')
  async convertHtmlToPdfTest(@Res() res, @Request() req) {
    return customHttpCode(res, await this.userTasksService.convertHtmlToPdfTest());
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('getFilterData')
  async getFilterData(@Res() res, @Request() req) {
    const userInfo: IUserInfo = req.user;
    let userId = 0;
    if (userInfo.type != userType.ADMIN) {
      userId = userInfo.userId
    }
    return customHttpCode(res, await this.userTasksService.getFilterData(+userId));
  }


  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('getAllUserTasksByUserId')
  async getAllUserTasksByUserId(@Res() res, @Request() req, @Query() body: GetUserTasksByUserDto) {
    const userInfo: IUserInfo = req.user;
    return customHttpCode(res, await this.userTasksService.getAllUserTasksByUserId(userInfo, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('getCountUserTasksByUserId')
  async getCountUserTasksByUserId(@Res() res, @Request() req, @Query() body: GetUserTasksByUserDto) {
    const userInfo: IUserInfo = req.user;
    return customHttpCode(res, await this.userTasksService.getCountUserTasksByUserId(userInfo, body));
  }

  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth()
  // @Get('getAllItemsUserTasksByUserId')
  // async getAllItemsUserTasksByUserId(@Res() res, @Request() req, @Param('userId') userId: number, @Query() body: GetUserTasksByUserDto) {
  //   const userInfo: IUserInfo = req.user;
  //   return customHttpCode(res, await this.userTasksService.getAllItemsUserTasksByUserId(userInfo, body));
  // }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('markAllNewReportsOpened')
  async markAllNewReportsOpened(@Res() res, @Request() req) {
    const user: IUserInfo = req.user;
    if (+user.type === userType.ADMIN) {
      return customHttpCode(res, await this.userTasksService.markAllNewReportsOpenedForAdmin(user));
    }
    if (+user.type === userType.CUSTOMER) {
      return customHttpCode(res, await this.userTasksService.markAllNewReportsOpenedForCustomer(user));
    }
    return customHttpCode(res, errorCode.CAN_NOT_DELETE);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('markAdminOpened/:id')
  async markAdminOpened(@Res() res, @Param('id') id: string, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.userTasksService.markAdminOpened(user, +id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('markAdminUnread/:id')
  async markAdminUnread(@Res() res, @Param('id') id: string, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.userTasksService.markAdminUnread(user, +id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('markCustomerOpened/:id')
  async markCustomerOpened(@Res() res, @Param('id') id: string, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.userTasksService.markCustomerOpened(user, +id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('markCustomerUnread/:id')
  async markCustomerUnread(@Res() res, @Param('id') id: string, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.userTasksService.markCustomerUnread(user, +id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('markStaffOpened/:id')
  async markStaffOpened(@Res() res, @Param('id') id: string, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.userTasksService.markStaffOpened(user, +id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id/restore')
  async restoreReport(@Res() res, @Param('id') id: string, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.userTasksService.restoreReport(user, id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id')
  async update(@Res() res, @Param('id') id: string, @Body() body: UpdateUserTaskDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.userTasksService.update(user, id, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('clear-deleted')
  async clearDeleted(@Res() res, @Request() req, @Query() body: GetUserTasksByUserDto) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.userTasksService.clearDeletedReports(user, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('clear-deleted')
  async clearDeletedVisible(@Res() res, @Request() req, @Body() body: ClearDeletedReportsDto) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.userTasksService.clearDeletedReportsByIds(user, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':id')
  async remove(@Res() res, @Param('id') id: string, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.userTasksService.remove(user, id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  async create(@Res() res, @Body() body: CreateUserTaskDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.userTasksService.create(user, body));
  }

  // Keep parameterized routes at the bottom so they don't shadow more specific routes.
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(':id')
  async findOne(@Res() res, @Param('id') id: number, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.userTasksService.findOne(id, user));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('createCustomerReports')
  async createCustomerReports(@Res() res, @Body() body: CreateCustomReportsDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.userTasksService.createCustomerReports(user, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put('updateCustomerReports/:id')
  async updateCustomerReports(@Res() res, @Param('id') id: number, @Body() body: CreateCustomReportsDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.userTasksService.updateCustomerReports(user, +id, body));
  }


  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('item/:id')
  async removeItem(@Res() res, @Param('id') id: string) {
    return customHttpCode(res, await this.userTasksService.removeItem(+id));
  }


  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('deleteFilePdf/:id')
  async deleteFilePdf(@Res() res, @Param('id') id: number, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.userTasksService.deleteFilePdf(user, +id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put('updateReportItem/:id')
  async updateReportItem(@Res() res, @Param('id') id: number, @Body() body: UserTaskItemDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.userTasksService.updateReportItem(user, +id, body));
  }
}
