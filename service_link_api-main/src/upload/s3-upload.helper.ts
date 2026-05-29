import { S3, Endpoint } from 'aws-sdk';
import config from '../config';

/** When `UPLOAD_USE_S3` is `true` or `1`, v1 multipart uploads go to S3. `false` / `0` keeps local disk. */
export function shouldStoreUploadsOnS3(): boolean {
  const raw = String(process.env.UPLOAD_USE_S3 ?? '').trim().toLowerCase();
  return raw === 'true' || raw === '1' || raw === 'yes';
}

/**
 * Whether generated report PDFs are uploaded to S3 and the returned URL is the bucket HTTPS URL
 * (`https://<bucket>.<S3_URL host>/report_<timestamp>.pdf`).
 * - `REPORT_PDF_USE_LOCAL_ONLY=true` → write `public/pdf/report_<ts>.pdf` and return `BASE_UPLOAD_URL` + that path.
 * - Else if `UPLOAD_USE_S3` or S3 bucket + keys are configured → upload to S3 (required path when enabled; upload errors throw).
 * - Otherwise → local disk only (dev).
 */
export function shouldUploadReportPdfsToS3(): boolean {
  const localOnly = String(process.env.REPORT_PDF_USE_LOCAL_ONLY ?? '').trim().toLowerCase();
  if (localOnly === 'true' || localOnly === '1' || localOnly === 'yes') {
    return false;
  }
  if (shouldStoreUploadsOnS3()) {
    return true;
  }
  return !!(config.S3_BUCKET && config.S3_ACCESS_KEY && config.S3_SECRET_ACCCESS);
}

/** Public HTTPS URL for an object key (virtual-hosted style, same shape as after `putObject`). */
export function buildS3PublicUrlForObjectKey(key: string): string | null {
  if (!config.S3_BUCKET || !config.S3_URL || !String(key || '').trim()) {
    return null;
  }
  const host = String(config.S3_URL).replace(/^https?:\/\//, '');
  const encodedKey = key
    .trim()
    .replace(/^\/+/, '')
    .split('/')
    .map(encodeURIComponent)
    .join('/');
  return `https://${config.S3_BUCKET}.${host}/${encodedKey}`;
}

/**
 * Upload a buffer to the configured S3-compatible bucket.
 * @param objectKey Optional full object key (no leading slash). If omitted, uses `admin-uploads/YYYY-MM-DD/timestamp-name`.
 */
export async function uploadBufferToS3(
  buffer: Buffer,
  originalname: string,
  mimetype: string,
  objectKey?: string,
): Promise<string> {
  if (!config.S3_BUCKET || !config.S3_ACCESS_KEY || !config.S3_SECRET_ACCCESS) {
    throw new Error('S3 env vars missing (S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_ACCCESS)');
  }

  const safeBase = String(originalname || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
  const day = new Date().toISOString().slice(0, 10);
  const key = objectKey?.trim()
    ? objectKey.trim().replace(/^\/+/, '')
    : `admin-uploads/${day}/${Date.now()}-${safeBase}`;

  const endpoint = new Endpoint(config.S3_URL);
  const s3 = new S3({
    endpoint,
    accessKeyId: config.S3_ACCESS_KEY,
    secretAccessKey: config.S3_SECRET_ACCCESS,
    s3ForcePathStyle: false,
  });

  // aws-sdk@1.x (this repo) has no `s3.upload()`; use putObject + send().
  const params = {
    Bucket: config.S3_BUCKET,
    Body: buffer,
    ACL: 'public-read',
    Key: key,
    ContentType: mimetype || 'application/octet-stream',
  };
  const req = s3.putObject(params);
  await new Promise<void>((resolve, reject) => {
    req.send((err: Error) => {
      if (err) reject(err);
      else resolve();
    });
  });

  const host = String(config.S3_URL || '').replace(/^https?:\/\//, '');
  const encodedKey = key.split('/').map(encodeURIComponent).join('/');
  return `https://${config.S3_BUCKET}.${host}/${encodedKey}`;
}
