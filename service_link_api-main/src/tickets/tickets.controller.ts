import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Res, UseGuards, Request } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { customHttpCode } from '../helpers/util';
import { IUserInfo } from '../interfaces/IUserInfo';
import { GetTicketsDto } from './dto/get-tickets.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { CreateTicketAnswerDto } from './dto/create-ticket-answer.dto';
import { UpdateTicketAnswerDto } from './dto/update-ticket-answer.dto';


@ApiTags("Tickets")
@Controller({
  path: 'tickets',
  version: ['1'],
})
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) { }
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  async create(@Res() res, @Body() body: CreateTicketDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.ticketsService.create(user, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  async findAll(@Res() res, @Query() body: GetTicketsDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.ticketsService.findAll(user,body));
  }


  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id')
  async update(@Res() res, @Param('id') id: string, @Body() body: UpdateTicketDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.ticketsService.update(user, id, body));
  }


  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('changeStatus')
  async changeStatus(@Res() res, @Body() body: ChangeStatusDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.ticketsService.changeStatus(user, body));
  }


  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':id')
  async remove(@Res() res, @Param('id') id: string) {
    return customHttpCode(res, await this.ticketsService.remove(id));
  }



  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('createComment')
  async createComment(@Res() res, @Body() body: CreateTicketAnswerDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.ticketsService.createComment(user, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('updateComment/:id')
  async updateComment(@Res() res, @Param('id') id: string, @Body() body: UpdateTicketAnswerDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.ticketsService.updateComment(user, +id, body));
  }
}


