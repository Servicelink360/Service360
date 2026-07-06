import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Res,
  UseGuards,
  Request,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FastifyReply } from 'fastify';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { customHttpCode } from '../helpers/util';
import { IUserInfo } from '../interfaces/IUserInfo';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { GetInvoicesDto } from './dto/get-invoices.dto';
import { ClearDeletedInvoicesDto } from './dto/clear-deleted-invoices.dto';

@ApiTags('Invoices')
@Controller({
  path: 'invoices',
  version: ['1'],
})
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  async create(@Res() res, @Body() body: CreateInvoiceDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.invoicesService.create(user, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  async findAll(@Res() res, @Query() body: GetInvoicesDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.invoicesService.findAll(user, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('markAllInvoicesOpened')
  async markAllOpened(@Res() res, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.invoicesService.markAllOpened(user));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('deleted/count')
  async deletedCount(@Res() res, @Query() body: GetInvoicesDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.invoicesService.countDeletedTab(user, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('clear-deleted')
  async clearDeleted(@Res() res, @Body() body: ClearDeletedInvoicesDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.invoicesService.clearDeleted(user, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(':id/download')
  async downloadFile(
    @Res({ passthrough: false }) reply: FastifyReply,
    @Param('id', ParseIntPipe) id: number,
    @Query('fileIndex') fileIndex: string,
    @Request() req,
  ) {
    const user: IUserInfo = req.user;
    const result = await this.invoicesService.downloadFile(
      user,
      id,
      fileIndex != null && fileIndex !== '' ? +fileIndex : 0,
    );
    if ('error' in result) {
      return reply.status(HttpStatus.BAD_REQUEST).send(result.error);
    }
    const safeName = result.filename.replace(/"/g, "'");
    return reply
      .header('Content-Type', result.contentType)
      .header('Content-Disposition', `attachment; filename="${safeName}"`)
      .send(result.buffer);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(':id')
  async findOne(@Res() res, @Param('id') id: string, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.invoicesService.findOne(user, +id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id/restore')
  async restore(@Res() res, @Param('id') id: string, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.invoicesService.restore(user, +id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id')
  async update(
    @Res() res,
    @Param('id') id: string,
    @Body() body: UpdateInvoiceDto,
    @Request() req,
  ) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.invoicesService.update(user, +id, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':id')
  async remove(@Res() res, @Param('id') id: string, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.invoicesService.remove(user, +id));
  }
}
