import {
  Body,
  Controller,
  Get,
  Param,
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
import { IUserInfo } from '../interfaces/IUserInfo';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';
import { ListMessagesDto } from './dto/list-messages.dto';

@ApiTags('Messages')
@Controller({ path: 'messages', version: ['1'] })
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('threads')
  async listThreads(@Res() res, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.messagesService.listThreads(user));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('recipients')
  async recipients(@Res() res, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.messagesService.listNewMessageRecipients(user));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('company-cc')
  async companyCc(@Res() res, @Query('customerId') customerId: string, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(
      res,
      await this.messagesService.listCompanyCcRecipients(
        user,
        customerId ? +customerId : undefined,
      ),
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('unreadCount')
  async unreadCount(@Res() res, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.messagesService.unreadCount(user));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('report-conversation')
  async resolveReportConversation(
    @Res() res,
    @Query('userTaskId') userTaskId: string,
    @Query('reportFaultId') reportFaultId: string,
    @Request() req,
  ) {
    const user: IUserInfo = req.user;
    return customHttpCode(
      res,
      await this.messagesService.resolveReportConversation(
        user,
        userTaskId ? +userTaskId : undefined,
        reportFaultId ? +reportFaultId : undefined,
      ),
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  async listMessages(@Res() res, @Query() query: ListMessagesDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.messagesService.listMessages(user, query));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('send')
  async send(@Res() res, @Body() body: SendMessageDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.messagesService.sendMessage(user, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('markRead')
  async markRead(
    @Res() res,
    @Query('threadId') threadId: string,
    @Query('customerId') customerId: string,
    @Query('staffId') staffId: string,
    @Request() req,
  ) {
    const user: IUserInfo = req.user;
    return customHttpCode(
      res,
      await this.messagesService.markRead(
        user,
        threadId ? +threadId : undefined,
        customerId ? +customerId : undefined,
        staffId ? +staffId : undefined,
      ),
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('deleted/clear')
  async clearDeleted(
    @Res() res,
    @Query('threadId') threadId: string,
    @Query('customerId') customerId: string,
    @Query('staffId') staffId: string,
    @Request() req,
  ) {
    const user: IUserInfo = req.user;
    return customHttpCode(
      res,
      await this.messagesService.clearDeletedMessages(
        user,
        threadId ? +threadId : undefined,
        customerId ? +customerId : undefined,
        staffId ? +staffId : undefined,
      ),
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id/delete')
  async softDelete(@Res() res, @Param('id') id: string, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.messagesService.softDeleteMessage(user, +id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id/restore')
  async restore(@Res() res, @Param('id') id: string, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.messagesService.restoreMessage(user, +id));
  }
}
