#!/usr/bin/env node
/**
 * Download legacy report PDFs from old API servers into a local folder.
 * Collects URLs from RDS user_tasks + optional SQL dump (for rows not yet in RDS).
 *
 *   node scripts/download-legacy-pdfs.js [destFolder] [--dump=path/to.sql]
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { Client } = require('pg');

require('dotenv').config({ path: path.join(__dirname, '../.env.prod') });

const DEST = path.resolve(process.argv[2] || path.join(__dirname, '../public/pdf/legacy'));
const dumpArg = process.argv.find((a) => a.startsWith('--dump='));
const DUMP_PATH = dumpArg
  ? path.resolve(dumpArg.split('=').slice(1).join('='))
  : path.join(__dirname, '../../deploy/database/29__05_2026.sql');

const SOURCES = (process.env.LEGACY_PDF_BASES ||
  'http://3.104.215.45:8001,http://3.104.215.45:5301,http://3.106.232.253:5301,http://13.55.122.55:5301,http://api.service360.com.au')
  .split(',')
  .map((s) => s.trim().replace(/\/+$/, ''));

function extractFileName(url) {
  const m = String(url || '').match(/\/([^/?#]+)(?:\?.*)?$/);
  return m ? m[1] : '';
}

function fetch(url) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { timeout: 8000 }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        resolve(null);
        return;
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        resolve(buf.length > 500 && buf.slice(0, 4).toString() === '%PDF' ? buf : null);
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}

function pdfUrlsFromDump(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const text = fs.readFileSync(filePath, 'utf8');
  const m = text.match(/COPY public\.user_tasks[^;]+FROM stdin;\n([\s\S]*?)\n\\\./);
  if (!m) return [];
  const urls = [];
  for (const line of m[1].split('\n')) {
    if (!/^\d/.test(line)) continue;
    const pdf = line.match(/(https?:\/\/[^\t]+\.pdf|http:\/\/[^\t]+\.pdf)/i);
    if (pdf) urls.push(pdf[1]);
  }
  return urls;
}

(async () => {
  fs.mkdirSync(DEST, { recursive: true });

  const urlSet = new Set();

  const c = new Client({
    host: process.env.DATABASE_HOST,
    port: +(process.env.DATABASE_PORT || 5432),
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DB_NAME,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();
  const dbRows = await c.query(`
    SELECT pdf_file FROM user_tasks
    WHERE pdf_file IS NOT NULL AND pdf_file <> ''
      AND pdf_file NOT LIKE '%service360basket%'
  `);
  dbRows.rows.forEach((r) => urlSet.add(r.pdf_file));
  await c.end();

  for (const u of pdfUrlsFromDump(DUMP_PATH)) urlSet.add(u);

  const byFile = new Map();
  for (const url of urlSet) {
    const name = extractFileName(url);
    if (name && /\.pdf$/i.test(name)) byFile.set(name, url);
  }

  console.log(`Unique legacy PDFs to fetch: ${byFile.size}`);
  console.log(`Dest: ${DEST}`);
  console.log(`Sources: ${SOURCES.join(', ')}`);

  let ok = 0;
  let miss = 0;
  let skipped = 0;

  for (const [name, originalUrl] of byFile) {
    const out = path.join(DEST, name);
    if (fs.existsSync(out) && fs.statSync(out).size > 500) {
      skipped++;
      continue;
    }
    let buf = null;
    const tryUrls = [
      originalUrl,
      ...SOURCES.map((base) => `${base}/public/pdf/${encodeURIComponent(name)}`),
    ];
    for (const u of [...new Set(tryUrls)]) {
      buf = await fetch(u);
      if (buf) break;
    }
    if (buf) {
      fs.writeFileSync(out, buf);
      ok++;
      if (ok % 10 === 0) console.log(`downloaded ${ok}...`);
    } else {
      miss++;
      console.error(`MISS ${name}`);
    }
  }

  console.log(JSON.stringify({ downloaded: ok, skipped, missing: miss, dest: DEST }));
  process.exit(miss > 0 ? 1 : 0);
})().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
