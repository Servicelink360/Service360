import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Res, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { customHttpCode } from '../helpers/util';
import { IUserInfo } from '../interfaces/IUserInfo';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { GetTasksDto } from './dto/get-tasks.dto';
import { ChangeStatusDto } from './dto/change-status-task.dto';

@ApiTags("Tasks")
@Controller({
  path: 'tasks',
  version: ['1'],
})
export class TasksController {
  constructor(private readonly tasksService: TasksService) { }
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  async create(@Res() res, @Body() body: CreateTaskDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.tasksService.create(user, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  async findAll(@Res() res, @Query() body: GetTasksDto) {
    return customHttpCode(res, await this.tasksService.findAll(body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(':id')
  async finOne(@Res() res, @Param('id') id: string, @Request() req) {
    return customHttpCode(res, await this.tasksService.findOne(+id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id')
  async update(@Res() res, @Param('id') id: string, @Body() body: UpdateTaskDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.tasksService.update(user, +id, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':id')
  async remove(@Res() res, @Param('id') id: string) {
    return customHttpCode(res, await this.tasksService.remove(id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('changeStatus/:id')
  async changeStatus(@Res() res, @Param('id') id: string, @Request() req, @Body() body: ChangeStatusDto) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.tasksService.changeStatus(user, +id, body));
  }
}


