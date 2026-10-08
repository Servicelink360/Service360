import { Module } from '@nestjs/common';
import { FieldPhotosController } from './field-photos.controller';
import { FieldPhotosService } from './field-photos.service';

@Module({
  controllers: [FieldPhotosController],
  providers: [FieldPhotosService],
})
export class FieldPhotosModule {}
