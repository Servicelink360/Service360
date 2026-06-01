/**
 * Regenerate report PDFs for tasks still pointing at legacy server URLs.
 * Usage: node scripts/regenerate-report-pdfs.js [--dry-run] [--id=155]
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env.prod') });
const { Client } = require('pg');
const path = require('path');

async function loadConvertHtmlToPdf() {
  const distUtil = path.join(__dirname, '../dist/src/helpers/util.js');
  try {
    return require(distUtil).convertHtmlToPdf;
  } catch {
    console.error('Build API first: npm run build');
    process.exit(1);
  }
}

function parseArgs() {
  const dryRun = process.argv.includes('--dry-run');
  const idArg = process.argv.find((a) => a.startsWith('--id='));
  const id = idArg ? Number(idArg.split('=')[1]) : null;
  return { dryRun, id };
}

async function fetchTaskBundle(client, taskId) {
  const taskRes = await client.query(
    `SELECT ut.*,
            row_to_json(rt.*) AS report_template,
            row_to_json(st.*) AS staff,
            row_to_json(cu.*) AS created_user
     FROM user_tasks ut
     LEFT JOIN report_templates rt ON rt.id = ut.report_template_id
     LEFT JOIN users st ON st.id = ut.staff_id
     LEFT JOIN users cu ON cu.id = ut.created_by
     WHERE ut.id = $1`,
    [taskId],
  );
  if (!taskRes.rows.length) return null;

  const reportsRes = await client.query(
    `SELECT id, name, type, value, "order", created_at AS "createdAt"
     FROM user_task_reports
     WHERE user_task_id = $1
     ORDER BY "order" ASC, id ASC`,
    [taskId],
  );

  const rowNumRes = await client.query(
    `SELECT row_num FROM (
       SELECT id, ROW_NUMBER() OVER (PARTITION BY 'id') AS row_num FROM user_tasks
     ) t WHERE t.id = $1`,
    [taskId],
  );

  const row = taskRes.rows[0];
  row.reportTemplate = row.report_template;
  row.staff = row.staff ? { fullName: row.staff.full_name, username: row.staff.username } : null;
  row.createdUser = row.created_user
    ? { fullName: row.created_user.full_name, username: row.created_user.username, type: row.created_user.type }
    : null;

  return {
    row,
    reports: reportsRes.rows,
    rowNum: rowNumRes.rows[0]?.row_num ?? 1,
  };
}

async function main() {
  const { dryRun, id } = parseArgs();
  const convertHtmlToPdf = await loadConvertHtmlToPdf();

  const client = new Client({
    host: process.env.DATABASE_HOST,
    port: +process.env.DATABASE_PORT || 5432,
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DB_NAME,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });
  await client.connect();

  let taskIds;
  if (id) {
    taskIds = [id];
  } else {
    const q = await client.query(`
      SELECT id FROM user_tasks
      WHERE pdf_file IS NOT NULL AND pdf_file <> ''
      ORDER BY id ASC
    `);
    taskIds = q.rows.map((r) => r.id);
  }

  console.log(`Tasks to regenerate: ${taskIds.length}${dryRun ? ' (dry-run)' : ''}`);

  let ok = 0;
  let fail = 0;
  for (const taskId of taskIds) {
    const bundle = await fetchTaskBundle(client, taskId);
    if (!bundle) {
      console.warn(`skip ${taskId}: not found`);
      continue;
    }
    const oldUrl = bundle.row.pdf_file;
    process.stdout.write(`#${taskId} reports=${bundle.reports.length} ... `);
    if (dryRun) {
      console.log(`would regen (current: ${oldUrl})`);
      continue;
    }
    try {
      const pdfUrl = await convertHtmlToPdf(bundle.row, bundle.reports, bundle.rowNum);
      await client.query('UPDATE user_tasks SET pdf_file = $1 WHERE id = $2', [
        pdfUrl,
        taskId,
      ]);
      console.log(`OK -> ${pdfUrl}`);
      ok++;
    } catch (e) {
      console.log(`FAIL: ${e?.message || e}`);
      fail++;
    }
  }

  console.log(`Done. ok=${ok} fail=${fail}`);
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
