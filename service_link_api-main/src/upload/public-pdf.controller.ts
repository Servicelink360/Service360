import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Res,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { createReadStream, existsSync } from 'fs';
import { basename, join } from 'path';
import { getPublicRoot } from '../paths';

/** Only `report_<unix_ms>.pdf` — same naming as objects on S3. */
const REPORT_PDF_NAME = /^report_\d{10,}\.pdf$/i;

/**
 * Serves a report PDF from disk **only** when running in local mode (`REPORT_PDF_USE_LOCAL_ONLY`).
 * Production report URLs must be the S3 HTTPS URL returned by `convertHtmlToPdf` (e.g.
 * `https://<bucket>.s3.<region>.amazonaws.com/report_<timestamp>.pdf`).
 */
@Controller({ path: 'public/pdf', version: VERSION_NEUTRAL })
export class PublicPdfController {
  @Get(':filename')
  getReportPdf(
    @Param('filename') raw: string,
    @Res({ passthrough: false }) reply: FastifyReply,
  ): void {
    const filename = basename(String(raw || ''));
    if (!REPORT_PDF_NAME.test(filename)) {
      throw new BadRequestException('Invalid report PDF name (expected report_<timestamp>.pdf)');
    }

    const fullPath = join(getPublicRoot(), 'pdf', filename);
    if (!existsSync(fullPath)) {
      throw new NotFoundException(`Cannot GET /public/pdf/${filename}`);
    }

    reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `inline; filename="${filename.replace(/"/g, '')}"`);
    reply.send(createReadStream(fullPath));
  }
}
