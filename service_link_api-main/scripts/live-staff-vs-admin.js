const { Client } = require('pg');

(async () => {
  const c = new Client({
    host: process.env.DATABASE_HOST,
    port: +(process.env.DATABASE_PORT || 5432),
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DB_NAME,
    ssl: String(process.env.DATABASE_SSL || '').toLowerCase() === 'true'
      ? { rejectUnauthorized: false }
      : false,
  });
  await c.connect();

  const adam = await c.query(
    `SELECT id, username, full_name, type FROM users WHERE id = 140 OR full_name ILIKE '%Adam Kay%'`,
  );
  console.log('Adam user row(s):', adam.rows);

  const may = await c.query(`
    SELECT id, staff_id, created_by, site_name, status, check_in, updated_at, created_at,
           (pdf_file IS NOT NULL AND pdf_file <> '') AS has_pdf
    FROM user_tasks
    WHERE type = 'CUSTOM' AND id IN (162, 163)
  `);
  console.log('\nReports 162/163:');
  for (const r of may.rows) {
    const staffSees =
      r.staff_id === 140 && r.created_by === 140 && r.status !== 3 ? 'YES if status completed' : 'CHECK';
    console.log({ ...r, staff_id_eq_created_by: r.staff_id === r.created_by, staffSees });
  }

  const adminList = await c.query(`
    SELECT COUNT(*)::int n FROM user_tasks
    WHERE type = 'CUSTOM' AND status IN (1, 3)
  `);
  const staffList = await c.query(`
    SELECT COUNT(*)::int n FROM user_tasks
    WHERE type = 'CUSTOM' AND status = 1 AND staff_id = 140 AND created_by = 140
  `);
  const hidden = await c.query(`
    SELECT id, staff_id, created_by, site_name, status, check_in
    FROM user_tasks
    WHERE type = 'CUSTOM' AND status = 1 AND staff_id = 140 AND created_by <> 140
    ORDER BY id
  `);
  console.log('\nAdmin sees (completed+deleted status s):', adminList.rows[0]);
  console.log('Staff Adam sees (status=1, own submit):', staffList.rows[0]);
  console.log('Admin-visible but STAFF-HIDDEN (staff_id=140, created_by<>140):', hidden.rows);

  await c.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
