import { Module } from '@nestjs/common';
import { PublicPdfController } from './public-pdf.controller';
import { UploadController } from './upload.controller';

@Module({
  controllers: [UploadController, PublicPdfController],
})
export class UploadModule {}
