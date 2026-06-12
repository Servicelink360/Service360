require('dotenv').config({ path: require('path').join(__dirname, '../.env.prod') });
const { Client } = require('pg');

(async () => {
  const c = new Client({
    host: process.env.DATABASE_HOST,
    port: 5432,
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DB_NAME,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  const adam = await c.query(
    `SELECT id, full_name, username FROM users
     WHERE full_name ILIKE '%Adam Kay%' OR username ILIKE '%adam%kay%'
     ORDER BY id LIMIT 5`,
  );
  console.log('Adam users:', adam.rows);
  const staffId = adam.rows[0]?.id;
  if (!staffId) {
    await c.end();
    return;
  }

  const q = await c.query(
    `SELECT
       COUNT(*)::int AS total_assigned,
       COUNT(*) FILTER (WHERE created_by = staff_id)::int AS staff_submitted,
       COUNT(*) FILTER (WHERE created_by <> staff_id)::int AS admin_submitted_for_staff,
       COUNT(*) FILTER (WHERE pdf_file IS NULL OR pdf_file = '')::int AS no_pdf
     FROM user_tasks
     WHERE type = 'CUSTOM' AND staff_id = $1`,
    [staffId],
  );
  console.log('\nReports assigned to Adam (staff_id=' + staffId + '):', q.rows[0]);
  console.log('Staff view shows only staff_submitted =', q.rows[0].staff_submitted);

  const adminOnly = await c.query(
    `SELECT id, site_name, check_in, created_by, staff_id,
            (pdf_file IS NOT NULL AND pdf_file <> '') AS has_pdf
     FROM user_tasks
     WHERE type = 'CUSTOM' AND staff_id = $1 AND created_by <> staff_id
     ORDER BY COALESCE(check_in, created_at) DESC`,
    [staffId],
  );
  console.log('\nHidden from staff (admin-created on Adam\'s name):', adminOnly.rows.length);
  for (const r of adminOnly.rows) {
    console.log(`  #${r.id} ${r.site_name} check_in=${r.check_in} has_pdf=${r.has_pdf}`);
  }

  const noPdf = await c.query(
    `SELECT id, site_name, check_in, created_by, staff_id
     FROM user_tasks
     WHERE type = 'CUSTOM' AND staff_id = $1 AND created_by = staff_id
       AND (pdf_file IS NULL OR pdf_file = '')
     ORDER BY COALESCE(check_in, created_at) DESC`,
    [staffId],
  );
  console.log('\nStaff-own reports WITHOUT pdf (shows — in column):', noPdf.rows.length);
  for (const r of noPdf.rows) {
    console.log(`  #${r.id} ${r.site_name} ${r.check_in}`);
  }

  const t = await c.query(`SELECT COUNT(*)::int n FROM user_tasks WHERE type='CUSTOM'`);
  const may = await c.query(
    `SELECT id, staff_id, created_by, site_name, check_in FROM user_tasks
     WHERE type='CUSTOM' AND check_in >= '2026-05-29' ORDER BY id`,
  );
  console.log('\nTotal CUSTOM reports in RDS:', t.rows[0].n);
  console.log('May 2026 admin reports:', may.rows);

  await c.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
