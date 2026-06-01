const https = require('https');
const { Client } = require('pg');

function headSize(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD', timeout: 10000 }, (res) => {
      const len = parseInt(res.headers['content-length'] || '0', 10);
      res.resume();
      resolve(res.statusCode === 200 ? len : 0);
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

  const urls = new Set();
  const rows = await c.query(`
    SELECT value FROM user_task_reports WHERE value LIKE '%service360basket%'
    UNION ALL
    SELECT attach_files AS value FROM report_faults WHERE attach_files LIKE '%service360basket%'
  `);

  for (const r of rows.rows) {
    const raw = String(r.value || '');
    try {
      const p = JSON.parse(raw);
      if (Array.isArray(p)) p.forEach((u) => urls.add(String(u).trim()));
      else if (typeof p === 'string') urls.add(p.trim());
    } catch {
      const matches = raw.match(/https:\/\/service360basket[^\s"']+/g);
      if (matches) matches.forEach((u) => urls.add(u.trim()));
    }
  }
  urls.delete('');

  let total = 0;
  let ok = 0;
  const list = [...urls];
  for (let i = 0; i < list.length; i++) {
    const sz = await headSize(list[i]);
    if (sz > 0) {
      total += sz;
      ok++;
    }
    if ((i + 1) % 100 === 0) console.error(`checked ${i + 1}/${list.length}...`);
  }

  console.log(
    JSON.stringify(
      {
        uniqueS3UrlsInDb: list.length,
        reachableObjects: ok,
        referencedBytes: total,
        referencedMb: +(total / 1048576).toFixed(2),
        note: 'Migrated folder alone is ~190 MB (939 files). IAM blocks full bucket listing.',
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
