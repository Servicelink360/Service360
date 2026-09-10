import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Res,
  Version,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { FastifyReply } from 'fastify';

const sharp = require('sharp');

const ALLOWED_HOST_SUFFIXES = [
  '.amazonaws.com',
  'localhost',
  '127.0.0.1',
];

function isAllowedImageUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    const host = u.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1') return true;
    if (host.endsWith('.amazonaws.com')) return true;
    // Allow same-origin style upload URLs from configured hosts (IP / custom domains).
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
    if (host.endsWith('.servicelink.net.au') || host === 'servicelink.net.au') return true;
    return ALLOWED_HOST_SUFFIXES.some((s) => host === s || host.endsWith(s));
  } catch {
    return false;
  }
}

@Controller({ version: ['1'] })
@ApiTags('Upload File')
export class ImageThumbController {
  @Get('image-thumb')
  @ApiOperation({ summary: 'Resize remote image for list thumbnails (does not load full size in UI)' })
  async thumb(
    @Query('url') url: string,
    @Query('w') widthRaw: string,
    @Res({ passthrough: false }) reply: FastifyReply,
  ) {
    const src = String(url || '').trim();
    if (!src || !isAllowedImageUrl(src)) {
      throw new BadRequestException('Invalid image url');
    }
    const width = Math.max(32, Math.min(320, Number(widthRaw) || 88));

    const upstream = await fetch(src, {
      redirect: 'follow',
      headers: { Accept: 'image/*,*/*;q=0.8' },
    });
    if (!upstream.ok) {
      throw new BadRequestException(`Failed to fetch image (${upstream.status})`);
    }
    const contentType = String(upstream.headers.get('content-type') || '').toLowerCase();
    if (contentType && !contentType.startsWith('image/') && !contentType.includes('octet-stream')) {
      throw new BadRequestException('URL is not an image');
    }
    const buf = Buffer.from(await upstream.arrayBuffer());
    if (!buf.length) {
      throw new BadRequestException('Empty image');
    }

    const out = await sharp(buf, { failOnError: false })
      .rotate()
      .resize({
        width,
        height: width,
        fit: 'cover',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 72, mozjpeg: true })
      .toBuffer();

    reply
      .header('Content-Type', 'image/jpeg')
      .header('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800')
      .header('Content-Length', String(out.length))
      .send(out);
  }
}
