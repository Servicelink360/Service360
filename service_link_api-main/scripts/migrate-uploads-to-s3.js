#!/usr/bin/env node
/**
 * Upload all files from a local folder to S3 (same bucket as production API).
 * Then rewrite legacy report photo URLs in RDS to the new S3 URLs (match by filename).
 *
 * Run inside API container:
 *   node scripts/migrate-uploads-to-s3.js /usr/src/app/public/upload/files [--apply]
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const AWS = require('aws-sdk');

const APPLY = process.argv.includes('--apply');
const sourceArg = process.argv.find((a) => !a.startsWith('-') && a !== process.argv[0] && a !== process.argv[1]);
const SOURCE = path.resolve(sourceArg || '/usr/src/app/public/upload/files');

const bucket = process.env.S3_BUCKET;
const s3Host = process.env.S3_URL;

function mimeFor(name) {
  const ext = path.extname(name).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.mp4') return 'video/mp4';
  if (ext === '.pdf') return 'application/pdf';
  return 'application/octet-stream';
}

function publicUrl(key) {
  const host = String(s3Host).replace(/^https?:\/\//, '');
  const encoded = key.split('/').map(encodeURIComponent).join('/');
  return `https://${bucket}.${host}/${encoded}`;
}

async function uploadFile(s3, filePath) {
  const base = path.basename(filePath);
  const key = `admin-uploads/migrated/${base}`;
  const body = fs.readFileSync(filePath);
  const params = {
    Bucket: bucket,
    Key: key,
    Body: body,
    ACL: 'public-read',
    ContentType: mimeFor(base),
  };
  await new Promise((resolve, reject) => {
    s3.putObject(params, (err) => (err ? reject(err) : resolve()));
  });
  return { base, key, url: publicUrl(key) };
}

function extractFileName(url) {
  const m = String(url).match(/\/([^/?#]+)(?:\?.*)?$/);
  return m ? m[1] : '';
}

(async () => {
  if (!fs.existsSync(SOURCE)) {
    console.error('Source folder not found:', SOURCE);
    process.exit(1);
  }
  const files = fs.readdirSync(SOURCE).filter((f) => fs.statSync(path.join(SOURCE, f)).isFile());
  console.log(`Source: ${SOURCE} (${files.length} files)`);

  const s3 = new AWS.S3({
    endpoint: new AWS.Endpoint(s3Host),
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_ACCCESS,
    s3ForcePathStyle: false,
  });

  const urlByFile = new Map();
  for (const f of files) {
    const full = path.join(SOURCE, f);
    try {
      const { base, url } = await uploadFile(s3, full);
      urlByFile.set(base, url);
      if (files.length <= 20 || files.indexOf(f) % 50 === 0) {
        console.log(`uploaded ${base}`);
      }
    } catch (e) {
      console.error('FAIL', f, e.message);
    }
  }
  console.log(`Uploaded ${urlByFile.size} files to s3://${bucket}/admin-uploads/migrated/`);

  if (!APPLY) {
    console.log('Dry run — DB not updated. Re-run with --apply');
    process.exit(0);
  }

  const c = new Client({
    host: process.env.DATABASE_HOST,
    port: +(process.env.DATABASE_PORT || 5432),
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DB_NAME,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });
  await c.connect();

  const rows = await c.query(`
    SELECT id, value FROM user_task_reports
    WHERE type IN ('IMAGES','VIDEOS','PHOTOS','PHOTO','IMAGE','VIDEO')
      AND value IS NOT NULL AND value != '[]'
      AND value NOT LIKE '%service360basket.s3%'
  `);

  let updatedRows = 0;
  for (const row of rows.rows) {
    let arr;
    try {
      arr = JSON.parse(row.value);
    } catch {
      continue;
    }
    if (!Array.isArray(arr)) continue;
    let changed = false;
    const next = arr.map((u) => {
      const base = extractFileName(u);
      const s3url = urlByFile.get(base);
      if (s3url && String(u) !== s3url) {
        changed = true;
        return s3url;
      }
      return u;
    });
    if (changed) {
      await c.query('UPDATE user_task_reports SET value = $1 WHERE id = $2', [
        JSON.stringify(next),
        row.id,
      ]);
      updatedRows++;
    }
  }

  console.log(`Updated ${updatedRows} report image fields in DB`);
  await c.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
