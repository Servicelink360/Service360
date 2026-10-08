import { Body, Controller, Delete, Get, Post, Query, Request, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { customHttpCode } from '../helpers/util';
import { FieldPhotosService } from './field-photos.service';

@ApiTags('Field photos')
@Controller({
  path: 'field-photos',
  version: ['1'],
})
export class FieldPhotosController {
  constructor(private readonly fieldPhotosService: FieldPhotosService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  async list(@Res() res, @Request() req) {
    return customHttpCode(res, await this.fieldPhotosService.list(req.user));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  async create(@Res() res, @Body() body, @Request() req) {
    return customHttpCode(res, await this.fieldPhotosService.create(req.user, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete()
  async remove(@Res() res, @Query('id') id: string, @Request() req) {
    return customHttpCode(res, await this.fieldPhotosService.remove(req.user, id));
  }
}
