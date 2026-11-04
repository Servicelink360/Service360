import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsumablesController } from './consumables.controller';
import { ConsumablesService } from './consumables.service';
import { ConsumableDeliveryEvent } from './entities/consumable-delivery-event.entity';
import { ConsumableDeliveryItem } from './entities/consumable-delivery-item.entity';
import { ConsumableDelivery } from './entities/consumable-delivery.entity';
import { ConsumableEmailSettings } from './entities/consumable-email-settings.entity';
import { ConsumableSupplier } from './entities/consumable-supplier.entity';
import { Consumable } from './entities/consumable.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Consumable,
      ConsumableDelivery,
      ConsumableDeliveryItem,
      ConsumableDeliveryEvent,
      ConsumableEmailSettings,
      ConsumableSupplier,
    ]),
  ],
  controllers: [ConsumablesController],
  providers: [ConsumablesService],
  exports: [ConsumablesService],
})
export class ConsumablesModule {}
