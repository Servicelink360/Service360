#!/usr/bin/env node
/**
 * Upload legacy report PDFs (slug filenames from old EC2) to S3.
 * Optionally rewrite user_tasks.pdf_file when the old URL basename matches.
 *
 * Run on NEW EC2 inside API container (has S3 + RDS env):
 *   node scripts/migrate-legacy-pdfs-to-s3.js /usr/src/app/public/pdf/legacy [--apply]
 *
 * Dry-run by default (uploads still happen; DB only updated with --apply).
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const AWS = require('aws-sdk');

require('dotenv').config({ path: path.join(__dirname, '../.env.prod') });

const APPLY = process.argv.includes('--apply');
const sourceArg = process.argv.find(
  (a) => !a.startsWith('-') && a !== process.argv[0] && a !== process.argv[1],
);
const SOURCE = path.resolve(sourceArg || '/usr/src/app/public/pdf/legacy');
const S3_PREFIX = (process.env.LEGACY_PDF_S3_PREFIX || 'legacy-pdf').replace(/^\/+|\/+$/g, '');

const bucket = process.env.S3_BUCKET;
const s3Host = process.env.S3_URL;

function publicUrl(key) {
  const host = String(s3Host).replace(/^https?:\/\//, '');
  const encoded = key.split('/').map(encodeURIComponent).join('/');
  return `https://${bucket}.${host}/${encoded}`;
}

function extractFileName(url) {
  const m = String(url || '').match(/\/([^/?#]+)(?:\?.*)?$/);
  return m ? m[1] : '';
}

async function uploadFile(s3, filePath) {
  const base = path.basename(filePath);
  const key = `${S3_PREFIX}/${base}`;
  const body = fs.readFileSync(filePath);
  const params = {
    Bucket: bucket,
    Key: key,
    Body: body,
    ACL: 'public-read',
    ContentType: 'application/pdf',
  };
  await new Promise((resolve, reject) => {
    s3.putObject(params, (err) => (err ? reject(err) : resolve()));
  });
  return { base, key, url: publicUrl(key) };
}

(async () => {
  if (!bucket || !s3Host || !process.env.S3_ACCESS_KEY) {
    console.error('Missing S3 env (S3_BUCKET, S3_URL, S3_ACCESS_KEY, S3_SECRET_ACCCESS)');
    process.exit(1);
  }
  if (!fs.existsSync(SOURCE)) {
    console.error('Source folder not found:', SOURCE);
    process.exit(1);
  }

  const files = fs
    .readdirSync(SOURCE)
    .filter((f) => /\.pdf$/i.test(f) && fs.statSync(path.join(SOURCE, f)).isFile());

  console.log(`Source: ${SOURCE} (${files.length} PDFs)`);
  console.log(`S3 prefix: s3://${bucket}/${S3_PREFIX}/`);
  console.log(`Mode: ${APPLY ? 'UPLOAD + UPDATE DB' : 'UPLOAD ONLY (add --apply to fix pdf_file URLs)'}`);

  const s3 = new AWS.S3({
    endpoint: new AWS.Endpoint(s3Host),
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_ACCCESS,
    s3ForcePathStyle: false,
  });

  const urlByFile = new Map();
  let uploaded = 0;
  let failed = 0;

  for (const f of files) {
    const full = path.join(SOURCE, f);
    try {
      const { base, url } = await uploadFile(s3, full);
      urlByFile.set(base, url);
      uploaded++;
      if (files.length <= 30 || uploaded % 25 === 0) {
        console.log(`uploaded ${base}`);
      }
    } catch (e) {
      failed++;
      console.error('FAIL', f, e.message);
    }
  }

  console.log(`Uploaded ${uploaded} PDFs to S3 (${failed} failed)`);

  if (!APPLY) {
    console.log('DB not updated. Re-run with --apply after verifying uploads.');
    process.exit(failed > 0 ? 1 : 0);
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

  const tasks = await c.query(`
    SELECT id, pdf_file FROM user_tasks
    WHERE pdf_file IS NOT NULL AND pdf_file <> ''
      AND pdf_file NOT LIKE '%service360basket%'
  `);

  let updated = 0;
  let skipped = 0;
  for (const row of tasks.rows) {
    const base = extractFileName(row.pdf_file);
    const s3url = urlByFile.get(base);
    if (!s3url) {
      skipped++;
      continue;
    }
    if (row.pdf_file === s3url) continue;
    await c.query('UPDATE user_tasks SET pdf_file = $1 WHERE id = $2', [s3url, row.id]);
    updated++;
    console.log(`task ${row.id} -> ${base}`);
  }

  console.log(`Updated ${updated} user_tasks.pdf_file rows (${skipped} legacy URLs had no local file)`);
  await c.end();
  process.exit(failed > 0 ? 1 : 0);
})().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
