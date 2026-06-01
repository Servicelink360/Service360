#!/usr/bin/env node
/**
 * Import missing CUSTOM user_tasks (+ user_task_reports) from SQL dump into RDS.
 * Skips IDs already present. Maps legacy pdf_file URLs to S3 legacy-pdf/ prefix.
 *
 *   node scripts/merge-missing-reports-from-dump.js [--apply] [--dump=path]
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env.prod') });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const APPLY = process.argv.includes('--apply');
const dumpArg = process.argv.find((a) => a.startsWith('--dump='));
const DUMP_PATH = dumpArg
  ? path.resolve(dumpArg.split('=').slice(1).join('='))
  : path.join(__dirname, '../../deploy/database/29__05_2026.sql');

const TASK_COLS = [
  'id', 'created_at', 'status', 'staff_id', 'updated_at', 'task_shift_id', 'task_id',
  'task_name', 'site_id', 'site_name', 'site_address', 'service_name', 'report_template_id',
  'description', 'start_time', 'end_time', 'customer_id', 'customer_name', 'notifies_staff',
  'type', 'created_by', 'updated_by', 'site_location', 'company_name', 'check_in', 'check_out',
  'images', 'pdf_file', 'admin_opened_at', 'customer_opened_at', 'staff_opened_at',
  'admin_dashboard_dismissed_at', 'customer_dashboard_dismissed_at', 'service_id', 'cleared_at',
];

function nullVal(v) {
  if (v === undefined || v === null || v === '\\N' || v === '') return null;
  return v;
}

function extractCopyBlock(sql, table) {
  const re = new RegExp(
    `COPY public\\.${table} \\([^)]+\\) FROM stdin;\\n([\\s\\S]*?)\\n\\\\\\.`,
  );
  const m = sql.match(re);
  if (!m) throw new Error(`COPY block not found for ${table}`);
  return m[1].split('\n').filter((l) => l.length > 0 && /^\d/.test(l));
}

function parseTaskLine(line) {
  const parts = line.split('\t');
  if (parts.length !== TASK_COLS.length) {
    throw new Error(`user_tasks row id ${parts[0]}: expected ${TASK_COLS.length} cols, got ${parts.length}`);
  }
  const row = {};
  TASK_COLS.forEach((c, i) => {
    row[c] = nullVal(parts[i]);
  });
  return row;
}

function parseReportLine(line) {
  const parts = line.split('\t');
  if (parts.length < 7) throw new Error(`Bad report line: ${line.slice(0, 80)}`);
  if (parts.length === 7) {
    return {
      id: +parts[0],
      name: nullVal(parts[1]),
      type: nullVal(parts[2]),
      created_at: nullVal(parts[3]),
      value: nullVal(parts[4]),
      user_task_id: +parts[5],
      order: parts[6] === '\\N' ? null : +parts[6],
    };
  }
  return {
    id: +parts[0],
    name: nullVal(parts[1]),
    type: nullVal(parts[2]),
    created_at: nullVal(parts[3]),
    value: nullVal(parts.slice(4, -2).join('\t')),
    user_task_id: +parts[parts.length - 2],
    order: parts[parts.length - 1] === '\\N' ? null : +parts[parts.length - 1],
  };
}

function extractFileName(url) {
  const m = String(url || '').match(/\/([^/?#]+)(?:\?.*)?$/);
  return m ? m[1] : '';
}

function mapPdfUrl(pdf) {
  if (!pdf) return null;
  const bucket = process.env.S3_BUCKET;
  const host = String(process.env.S3_URL || '').replace(/^https?:\/\//, '');
  const base = extractFileName(pdf);
  if (!base || !/\.pdf$/i.test(base)) return pdf;
  if (
    pdf.includes('3.104.215.45') ||
    pdf.includes('/public/pdf/') ||
    (pdf.includes('service360basket') && base.startsWith('report_'))
  ) {
    return `https://${bucket}.${host}/legacy-pdf/${base}`;
  }
  return pdf;
}

(async () => {
  const sql = fs.readFileSync(DUMP_PATH, 'utf8');
  const taskLines = extractCopyBlock(sql, 'user_tasks');
  const reportLines = extractCopyBlock(sql, 'user_task_reports');

  const dumpTasks = taskLines.map(parseTaskLine).filter((t) => t.type === 'CUSTOM');
  const dumpReportsByTask = new Map();
  for (const line of reportLines) {
    const r = parseReportLine(line);
    if (!dumpReportsByTask.has(r.user_task_id)) dumpReportsByTask.set(r.user_task_id, []);
    dumpReportsByTask.get(r.user_task_id).push(r);
  }

  const c = new Client({
    host: process.env.DATABASE_HOST,
    port: +(process.env.DATABASE_PORT || 5432),
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DB_NAME,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  const existing = await c.query('SELECT id FROM user_tasks');
  const existingIds = new Set(existing.rows.map((r) => r.id));
  const existingReportIds = new Set(
    (await c.query('SELECT id FROM user_task_reports')).rows.map((r) => r.id),
  );

  const toInsert = dumpTasks.filter((t) => !existingIds.has(+t.id)).sort((a, b) => a.id - b.id);

  console.log(`Dump CUSTOM tasks: ${dumpTasks.length}`);
  console.log(`Already in RDS: ${dumpTasks.length - toInsert.length}`);
  console.log(`To insert: ${toInsert.length}`);
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY RUN (pass --apply)'}`);

  let tasksInserted = 0;
  let reportsInserted = 0;
  let pdfsMapped = 0;

  for (const t of toInsert) {
    const pdf = mapPdfUrl(t.pdf_file);
    if (t.pdf_file && pdf !== t.pdf_file) pdfsMapped++;
    const reports = dumpReportsByTask.get(+t.id) || [];

    console.log(`  task ${t.id} | ${t.task_name || '(no name)'} | reports: ${reports.length} | pdf: ${pdf ? 'yes' : 'no'}`);

    if (!APPLY) continue;

    await c.query(
      `INSERT INTO user_tasks (${TASK_COLS.join(', ')})
       VALUES (${TASK_COLS.map((_, i) => `$${i + 1}`).join(', ')})
       ON CONFLICT (id) DO NOTHING`,
      TASK_COLS.map((col) => {
        if (col === 'pdf_file') return pdf;
        const v = t[col];
        if (['id', 'status', 'staff_id', 'task_shift_id', 'task_id', 'site_id', 'report_template_id',
          'customer_id', 'notifies_staff', 'created_by', 'updated_by', 'service_id'].includes(col)) {
          return v === null ? null : +v;
        }
        return v;
      }),
    );
    tasksInserted++;

    for (const r of reports) {
      if (existingReportIds.has(r.id)) continue;
      await c.query(
        `INSERT INTO user_task_reports (id, name, type, created_at, value, user_task_id, "order")
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [r.id, r.name, r.type, r.created_at, r.value, r.user_task_id, r.order],
      );
      reportsInserted++;
      existingReportIds.add(r.id);
    }
  }

  if (APPLY && tasksInserted > 0) {
    await c.query(`SELECT setval('user_tasks_id_seq', (SELECT COALESCE(MAX(id), 1) FROM user_tasks))`);
    await c.query(
      `SELECT setval('user_task_reports_id_seq', (SELECT COALESCE(MAX(id), 1) FROM user_task_reports))`,
    );
    const total = await c.query(`SELECT COUNT(*)::int n FROM user_tasks WHERE type = 'CUSTOM'`);
    console.log(`\nDone. Inserted ${tasksInserted} tasks, ${reportsInserted} report fields.`);
    console.log(`CUSTOM reports in RDS now: ${total.rows[0].n}`);
  } else if (!APPLY) {
    console.log(`\nWould map ${toInsert.filter((t) => t.pdf_file).length} pdf_file URLs to legacy-pdf/ S3`);
  }

  await c.end();
})().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
