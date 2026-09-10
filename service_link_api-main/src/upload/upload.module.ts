import { Module } from '@nestjs/common';
import { PublicPdfController } from './public-pdf.controller';
import { UploadController } from './upload.controller';
import { ImageThumbController } from './image-thumb.controller';

@Module({
  controllers: [UploadController, PublicPdfController, ImageThumbController],
})
export class UploadModule {}
