const { Client } = require('pg');
const https = require('https');

function head(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD', timeout: 8000 }, (res) => {
      resolve(res.statusCode);
      res.resume();
    });
    req.on('error', () => resolve(0));
    req.on('timeout', () => {
      req.destroy();
      resolve(0);
    });
    req.end();
  });
}

function extractFileName(url) {
  const m = String(url).match(/\/([^/?#]+)(?:\?.*)?$/);
  return m ? m[1] : '';
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

  const s3Index = await c.query(`
    SELECT DISTINCT regexp_replace(elem, '^.*\/uploads\/[0-9]+_', '') AS base_name
    FROM report_faults rf,
      LATERAL jsonb_array_elements_text(rf.attach_files::jsonb) AS elem
    WHERE rf.attach_files IS NOT NULL AND rf.attach_files LIKE '%service360basket%'
  `).catch(() => ({ rows: [] }));

  // also from messages/any table - use fault attach_files as index
  const s3Map = new Map();
  for (const row of s3Index.rows) {
    if (row.base_name) s3Map.set(row.base_name, true);
  }

  const legacy = await c.query(`
    SELECT ut.id AS task_id, ut.created_at, utr.value
    FROM user_task_reports utr
    JOIN user_tasks ut ON ut.id = utr.user_task_id
    WHERE utr.type = 'IMAGES' AND utr.value LIKE '%api.service360.com.au%'
    ORDER BY ut.created_at
    LIMIT 2
  `);

  for (const row of legacy.rows) {
    let urls = [];
    try {
      urls = JSON.parse(row.value);
    } catch {}
    console.log('task', row.task_id, row.created_at);
    for (const u of urls.slice(0, 3)) {
      const base = extractFileName(u);
      const s3Candidates = [
        `https://service360basket.s3.ap-southeast-2.amazonaws.com/uploads/${base}`,
      ];
      // try fault-style prefixed keys from DB
      const fault = await c.query(
        `SELECT elem FROM report_faults rf, LATERAL jsonb_array_elements_text(rf.attach_files::jsonb) AS elem
         WHERE elem LIKE $1 LIMIT 1`,
        [`%${base}%`],
      );
      const faultUrl = fault.rows[0]?.elem;
      console.log({
        legacy: u,
        base,
        inFaultIndex: s3Map.has(base),
        faultMatch: faultUrl || null,
        faultStatus: faultUrl ? await head(faultUrl) : 0,
      });
    }
  }

  await c.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
