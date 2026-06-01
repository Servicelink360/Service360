#!/usr/bin/env node
/** Download legacy report images from old API server into local upload folder. */
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { Client } = require('pg');

const DEST = path.resolve(process.argv[2] || '/usr/src/app/public/upload/files');
const SOURCES = (process.env.LEGACY_UPLOAD_BASES ||
  'http://3.104.215.45:8001,http://3.104.215.45:5301,http://3.106.232.253:5301')
  .split(',')
  .map((s) => s.trim().replace(/\/+$/, ''));

function extractFileName(url) {
  const m = String(url).match(/\/([^/?#]+)(?:\?.*)?$/);
  return m ? m[1] : '';
}

function fetch(url) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { timeout: 15000 }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        resolve(null);
        return;
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}

(async () => {
  fs.mkdirSync(DEST, { recursive: true });
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
    WHERE type IN ('IMAGES','VIDEOS','PHOTOS') AND value LIKE '%/public/upload/files/%'
  `);

  const names = new Set();
  for (const row of rows.rows) {
    try {
      JSON.parse(row.value).forEach((u) => {
        const n = extractFileName(u);
        if (n) names.add(n);
      });
    } catch {}
  }
  console.log(`Unique legacy filenames: ${names.size}`);

  let ok = 0;
  let miss = 0;
  for (const name of names) {
    const out = path.join(DEST, name);
    if (fs.existsSync(out) && fs.statSync(out).size > 0) {
      ok++;
      continue;
    }
    let buf = null;
    for (const base of SOURCES) {
      buf = await fetch(`${base}/public/upload/files/${encodeURIComponent(name)}`);
      if (buf && buf.length > 100) break;
    }
    if (buf && buf.length > 100) {
      fs.writeFileSync(out, buf);
      ok++;
      if (ok % 20 === 0) console.log(`downloaded ${ok}...`);
    } else {
      miss++;
    }
  }
  console.log(JSON.stringify({ downloaded: ok, missing: miss, dest: DEST }));
  await c.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
