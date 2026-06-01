const { Client } = require('pg');
const https = require('https');
const http = require('http');

function head(url) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.request(url, { method: 'HEAD', timeout: 8000 }, (res) => {
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

  const rows = await c.query(`
    SELECT value FROM user_task_reports
    WHERE type = 'IMAGES' AND value LIKE '%IMG-%'
    LIMIT 3
  `);

  const urls = [];
  for (const row of rows.rows) {
    try {
      JSON.parse(row.value).forEach((u) => urls.push(u));
    } catch {}
  }

  const unique = [...new Set(urls)].slice(0, 5);
  for (const u of unique) {
    const code = await head(u);
    const alt1 = u.replace('api.service360.com.au', '13.55.122.55:5301');
    const alt2 = u.replace('http://api.service360.com.au', 'http://3.104.215.45:8001');
    console.log(JSON.stringify({ url: u, status: code, newEc2: await head(alt1), oldEc2: await head(alt2) }));
  }

  const count = await c.query(`
    SELECT COUNT(*)::int AS reports,
      (SELECT COUNT(*)::int FROM user_task_reports utr WHERE type='IMAGES' AND value LIKE '%service360basket.s3%') AS s3_reports,
      (SELECT COUNT(*)::int FROM user_task_reports utr WHERE type='IMAGES' AND value LIKE '%api.service360.com.au%') AS legacy_reports
    FROM user_task_reports WHERE type='IMAGES'
  `);
  console.log('counts', count.rows[0]);

  await c.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
