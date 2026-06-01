/**
 * Recover legacy report photo URLs using S3 URLs already stored in report_faults / messages.
 * Dry-run by default; pass --apply to update user_task_reports.
 */
const { Client } = require('pg');

const APPLY = process.argv.includes('--apply');

function extractFileName(url) {
  const m = String(url).match(/\/([^/?#]+)(?:\?.*)?$/);
  return m ? m[1] : '';
}

function originalImageName(storedName) {
  const m = String(storedName).match(/^(.+)-[0-9a-f]{4}(\.[^.]+)$/i);
  if (m) return `${m[1]}${m[2]}`;
  return storedName;
}

function indexS3Url(url) {
  const file = extractFileName(url);
  const original = originalImageName(file);
  const raw = file.replace(/\.[^.]+$/, '');
  const origRaw = original.replace(/\.[^.]+$/, '');
  return { file, original, raw, origRaw };
}

(async () => {
  const c = new Client({
    host: process.env.DATABASE_HOST,
    port: +(process.env.DATABASE_PORT || 5432),
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DB_NAME,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });
  await c.connect();

  const s3Rows = await c.query(`
    SELECT jsonb_array_elements_text(attach_files::jsonb) AS url
    FROM report_faults
    WHERE attach_files IS NOT NULL AND attach_files LIKE '%service360basket%'
  `);

  const byExact = new Map();
  const byStem = new Map();
  for (const row of s3Rows.rows) {
    const url = row.url;
    const { file, original, raw, origRaw } = indexS3Url(url);
    for (const k of [file, original]) {
      if (k && !byExact.has(k)) byExact.set(k, url);
    }
    for (const k of [raw, origRaw]) {
      if (k && !byStem.has(k)) byStem.set(k, url);
    }
  }

  function resolveLegacy(url) {
    const file = extractFileName(url);
    const original = originalImageName(file);
    if (byExact.has(file)) return byExact.get(file);
    if (byExact.has(original)) return byExact.get(original);
    const raw = file.replace(/\.[^.]+$/, '');
    const origRaw = original.replace(/\.[^.]+$/, '');
    if (byStem.has(raw)) return byStem.get(raw);
    if (byStem.has(origRaw)) return byStem.get(origRaw);
    return null;
  }

  const rows = await c.query(`
    SELECT id, value FROM user_task_reports
    WHERE type = 'IMAGES' AND value LIKE '%api.service360.com.au%'
  `);

  let fields = 0;
  let urls = 0;
  let resolved = 0;
  let fieldsNoMatch = 0;

  for (const row of rows.rows) {
    let arr;
    try {
      arr = JSON.parse(row.value);
    } catch {
      continue;
    }
    if (!Array.isArray(arr)) continue;
    fields++;
    let changed = false;
    const next = arr.map((u) => {
      urls++;
      if (!String(u).includes('api.service360.com.au')) return u;
      const fixed = resolveLegacy(u);
      if (fixed) {
        resolved++;
        changed = true;
        return fixed;
      }
      return u;
    });
    if (!changed) fieldsNoMatch++;
    else if (APPLY) {
      await c.query('UPDATE user_task_reports SET value = $1 WHERE id = $2', [
        JSON.stringify(next),
        row.id,
      ]);
    }
  }

  console.log(
    JSON.stringify(
      {
        mode: APPLY ? 'apply' : 'dry-run',
        s3IndexSize: byExact.size,
        legacyFields: fields,
        legacyUrls: urls,
        resolvedUrls: resolved,
        fieldsWithNoMatch: fieldsNoMatch,
      },
      null,
      2,
    ),
  );

  await c.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
