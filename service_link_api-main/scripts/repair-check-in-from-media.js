/**
 * Fix stale check_in on admin reports where photo uploads finished much later.
 * Usage: node scripts/repair-check-in-from-media.js [--dry-run] [--id=163]
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env.prod') });
const { Client } = require('pg');
const moment = require('moment');

function parseArgs() {
  return {
    dryRun: process.argv.includes('--dry-run'),
    id: (() => {
      const a = process.argv.find((x) => x.startsWith('--id='));
      return a ? Number(a.split('=')[1]) : null;
    })(),
  };
}

function maxUploadTsFromReports(reports) {
  let maxTs = 0;
  for (const r of reports || []) {
    const val = String(r?.value ?? '');
    const re = /\/(\d{13})(?:-|\.)/g;
    let match;
    while ((match = re.exec(val)) !== null) {
      const ts = Number(match[1]);
      if (Number.isFinite(ts) && ts > maxTs) maxTs = ts;
    }
  }
  return maxTs > 0 ? maxTs : null;
}

async function main() {
  const { dryRun, id } = parseArgs();
  const client = new Client({
    host: process.env.DATABASE_HOST,
    port: +process.env.DATABASE_PORT || 5432,
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DB_NAME,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const tasks = await client.query(
    id
      ? `SELECT id, check_in, task_name, site_name FROM user_tasks WHERE id = $1`
      : `SELECT id, check_in, task_name, site_name FROM user_tasks
         WHERE type = 'CUSTOM' AND check_in IS NOT NULL
         ORDER BY id ASC`,
    id ? [id] : [],
  );

  let repaired = 0;
  let skipped = 0;

  for (const task of tasks.rows) {
    const reports = await client.query(
      `SELECT value FROM user_task_reports WHERE user_task_id = $1`,
      [task.id],
    );
    const maxTs = maxUploadTsFromReports(reports.rows);
    if (!maxTs) {
      skipped++;
      continue;
    }
    const checkIn = moment(task.check_in);
    const media = moment(maxTs);
    if (!checkIn.isValid() || !media.isValid()) {
      skipped++;
      continue;
    }
    if (media.diff(checkIn, 'minutes') <= 30) {
      skipped++;
      continue;
    }
    const newCheckIn = media.toDate();
    console.log(
      `#${task.id} ${task.site_name || task.task_name}: check_in ${checkIn.toISOString()} -> ${media.toISOString()} (${media.utcOffset('+10:00').format('DD/MM/YYYY HH:mm')} AU)`,
    );
    if (!dryRun) {
      await client.query(`UPDATE user_tasks SET check_in = $1 WHERE id = $2`, [newCheckIn, task.id]);
    }
    repaired++;
  }

  console.log(`Done. repaired=${repaired} skipped=${skipped}${dryRun ? ' (dry-run)' : ''}`);
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
