/** Print PDF "Time and Date" value for a task without generating PDF. */
require('dotenv').config({ path: require('path').join(__dirname, '../.env.prod') });
const { Client } = require('pg');
const moment = require('moment');

const OFFSET = '+10:00';

function inferSubmissionMomentFromReportMedia(reports) {
  if (!Array.isArray(reports)) return null;
  let maxTs = 0;
  for (const r of reports) {
    const val = String(r?.value ?? '');
    const re = /\/(\d{13})(?:-|\.)/g;
    let match;
    while ((match = re.exec(val)) !== null) {
      const ts = Number(match[1]);
      if (Number.isFinite(ts) && ts > maxTs) maxTs = ts;
    }
  }
  return maxTs > 0 && moment(maxTs).isValid() ? moment(maxTs) : null;
}

function getReportPdfReferenceMoment(row, reportItems) {
  const candidates = [row.check_in, row.created_at];
  let best = null;
  for (const raw of candidates) {
    if (raw == null) continue;
    const m = moment(raw);
    if (m.isValid()) {
      best = m;
      break;
    }
  }
  const reportsForMedia = Array.isArray(reportItems) ? reportItems : row?.reports;
  const media = inferSubmissionMomentFromReportMedia(reportsForMedia);
  if (media && best && media.diff(best, 'minutes') > 30) best = media;
  else if (media && !best) best = media;
  return best ? best.utcOffset(OFFSET) : moment().utcOffset(OFFSET);
}

(async () => {
  const id = Number(process.argv[2] || 163);
  const c = new Client({
    host: process.env.DATABASE_HOST,
    port: 5432,
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DB_NAME,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();
  const task = await c.query('SELECT id, check_in, pdf_file FROM user_tasks WHERE id = $1', [id]);
  const reports = await c.query(
    'SELECT name, type, value FROM user_task_reports WHERE user_task_id = $1 ORDER BY "order", id',
    [id],
  );
  const row = task.rows[0];
  const dateField = reports.rows.find((r) => String(r.type).includes('REPORT_DATE'));
  const ref = getReportPdfReferenceMoment(row, reports.rows);
  const valStr = String(dateField?.value ?? '').trim();
  const display = moment(valStr, 'YYYY-MM-DD', true).isValid()
    ? moment(`${valStr} ${ref.format('HH:mm:ss')}`, 'YYYY-MM-DD HH:mm:ss')
        .utcOffset(OFFSET, true)
        .format('DD MMM YYYY h:mm:ss a')
    : ref.format('DD MMM YYYY h:mm:ss a');
  console.log('Task', id);
  console.log('pdf_file', row.pdf_file);
  console.log('check_in', row.check_in);
  console.log('PDF Time and Date would show:', display);
  await c.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
