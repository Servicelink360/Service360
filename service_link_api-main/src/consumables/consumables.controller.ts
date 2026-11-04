import {
  Body,
  Controller,
  Delete,
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
import { ConsumablesService } from './consumables.service';
import { CreateConsumableDeliveryDto } from './dto/create-delivery.dto';
import { CreateConsumableDto } from './dto/create-consumable.dto';
import { UpdateConsumableDto } from './dto/update-consumable.dto';
import { UpdateConsumableEmailSettingsDto } from './dto/update-email-settings.dto';
import { CreateConsumableSupplierDto } from './dto/create-supplier.dto';
import { UpdateConsumableSupplierDto } from './dto/update-supplier.dto';

@ApiTags('Consumables')
@Controller({
  path: 'consumables',
  version: ['1'],
})
export class ConsumablesController {
  constructor(private readonly consumablesService: ConsumablesService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  async listCatalog(@Res() res, @Query() query, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.consumablesService.listCatalog(user, query || {}));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  async createCatalog(@Res() res, @Body() body: CreateConsumableDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.consumablesService.createCatalog(user, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('suppliers')
  async listSuppliers(@Res() res, @Query() query, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.consumablesService.listSuppliers(user, query || {}));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('suppliers')
  async createSupplier(@Res() res, @Body() body: CreateConsumableSupplierDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.consumablesService.createSupplier(user, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('suppliers/:id')
  async updateSupplier(
    @Res() res,
    @Param('id') id: string,
    @Body() body: UpdateConsumableSupplierDto,
    @Request() req,
  ) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.consumablesService.updateSupplier(user, +id, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('suppliers/:id')
  async removeSupplier(@Res() res, @Param('id') id: string, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.consumablesService.removeSupplier(user, +id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('contacts')
  async listPartyContacts(@Res() res, @Query() query, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.consumablesService.listPartyContacts(user, query || {}));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('contacts')
  async linkPartyContact(@Res() res, @Body() body, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.consumablesService.linkPartyContact(user, body || {}));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('contacts/:userId')
  async softRemovePartyContact(
    @Res() res,
    @Param('userId') userId: string,
    @Query() query,
    @Request() req,
  ) {
    const user: IUserInfo = req.user;
    return customHttpCode(
      res,
      await this.consumablesService.softRemovePartyContact(user, +userId, query || {}),
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('email-settings')
  async getEmailSettings(@Res() res, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.consumablesService.getEmailSettings(user));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('email-settings')
  async updateEmailSettings(
    @Res() res,
    @Body() body: UpdateConsumableEmailSettingsDto,
    @Request() req,
  ) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.consumablesService.updateEmailSettings(user, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('deliveries/list')
  async listDeliveries(@Res() res, @Query() query, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.consumablesService.listDeliveries(user, query || {}));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('deliveries/:id')
  async getDelivery(@Res() res, @Param('id') id: string, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.consumablesService.getDelivery(user, +id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('deliveries')
  async createDelivery(@Res() res, @Body() body: CreateConsumableDeliveryDto, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.consumablesService.createDelivery(user, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('deliveries/:id')
  async updateDelivery(
    @Res() res,
    @Param('id') id: string,
    @Body() body: CreateConsumableDeliveryDto,
    @Request() req,
  ) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.consumablesService.updateDelivery(user, +id, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('deliveries/:id/send')
  async resendDelivery(
    @Res() res,
    @Param('id') id: string,
    @Body() body: { emailTo?: string; emailCc?: string },
    @Request() req,
  ) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.consumablesService.resendDelivery(user, +id, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('deliveries/:id/restore')
  async restoreDelivery(@Res() res, @Param('id') id: string, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.consumablesService.restoreDelivery(user, +id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('deliveries/:id')
  async removeDelivery(
    @Res() res,
    @Param('id') id: string,
    @Query('permanent') permanent: string,
    @Request() req,
  ) {
    const user: IUserInfo = req.user;
    return customHttpCode(
      res,
      await this.consumablesService.removeDelivery(user, +id, {
        permanent: String(permanent || '') === '1',
      }),
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post(':id/restore')
  async restoreCatalog(@Res() res, @Param('id') id: string, @Request() req) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.consumablesService.restoreCatalog(user, +id));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id')
  async updateCatalog(
    @Res() res,
    @Param('id') id: string,
    @Body() body: UpdateConsumableDto,
    @Request() req,
  ) {
    const user: IUserInfo = req.user;
    return customHttpCode(res, await this.consumablesService.updateCatalog(user, +id, body));
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':id')
  async removeCatalog(
    @Res() res,
    @Param('id') id: string,
    @Query('permanent') permanent: string,
    @Request() req,
  ) {
    const user: IUserInfo = req.user;
    return customHttpCode(
      res,
      await this.consumablesService.removeCatalog(user, +id, {
        permanent: String(permanent || '') === '1',
      }),
    );
  }
}
