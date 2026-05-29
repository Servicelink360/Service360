import { Controller, Get, Post, Body, Request, Query, Res, UseGuards, Delete, Param, Patch } from '@nestjs/common';
import { UserDailyJobsService } from './user-daily-jobs.service';
import { GetUserDailyJobsDto } from './dto/get-user-daily-job.dto';
import { CreateUserDailyJobDto } from './dto/create-user-daily-job.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { customHttpCode } from '../helpers/util';
import { IUserInfo } from '../interfaces/IUserInfo';
import { UpdateUserDailyJobDto } from './dto/update-user-daily-job.dto';

@ApiTags("User Daily Jobs")
@Controller({
  path: 'user-daily-jobs',
  version: ['1'],
})
export class UserDailyJobsController {
  constructor(private readonly userDailyJobsService: UserDailyJobsService) { }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  async create(@Res() res, @Body() body: CreateUserDailyJobDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.userDailyJobsService.create(user, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  async findAll(@Res() res, @Query() body: GetUserDailyJobsDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.userDailyJobsService.findAll(user, body));
  }


  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('getUsers')
  async getUsers(@Res() res, @Query() body: GetUserDailyJobsDto) {
    return customHttpCode(res, await this.userDailyJobsService.getUsers(body));
  }


  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id')
  async update(@Res() res, @Param('id') id: string, @Body() body: UpdateUserDailyJobDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.userDailyJobsService.update(user, +id, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':id')
  async remove(@Res() res, @Param('id') id: string) {
    return customHttpCode(res, await this.userDailyJobsService.remove(id));
  }

}
