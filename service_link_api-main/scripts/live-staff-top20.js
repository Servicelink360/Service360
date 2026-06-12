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

  const staffSql = `
    SELECT id, site_name, status, staff_id, created_by,
           COALESCE(check_in, created_at) AS submitted_at
    FROM user_tasks
    WHERE type = 'CUSTOM'
      AND status != 4
      AND status = 1
      AND staff_id = 140
      AND created_by = staff_id
    ORDER BY id DESC
    LIMIT 20
  `;
  const adminSql = `
    SELECT id, site_name, status, staff_id, created_by,
           COALESCE(check_in, created_at) AS submitted_at
    FROM user_tasks
    WHERE type = 'CUSTOM'
      AND (status = 1 OR status = 4)
    ORDER BY COALESCE(check_in, created_at) DESC, id DESC
    LIMIT 20
  `;

  const staff = await c.query(staffSql);
  const admin = await c.query(adminSql);

  console.log('STAFF top 20 (id DESC):');
  staff.rows.forEach((r) =>
    console.log(`  #${r.id} ${r.site_name} submitted=${r.submitted_at?.toISOString?.() || r.submitted_at}`),
  );
  console.log('\nADMIN top 20 (submittedAt DESC):');
  admin.rows.forEach((r) =>
    console.log(`  #${r.id} ${r.site_name} staff=${r.staff_id} created_by=${r.created_by} submitted=${r.submitted_at?.toISOString?.() || r.submitted_at}`),
  );

  const staffHas163 = staff.rows.some((r) => r.id === 163);
  const staffHas162 = staff.rows.some((r) => r.id === 162);
  console.log('\nStaff top-20 includes #163?', staffHas163, '#162?', staffHas162);

  // Reports where admin sees Adam Kay but staff filter hides
  const mismatch = await c.query(`
    SELECT id, site_name, staff_id, created_by, status
    FROM user_tasks
    WHERE type = 'CUSTOM' AND status = 1 AND staff_id = 140 AND created_by <> 140
  `);
  console.log('\nMismatch rows (staff_id=140, created_by!=140, status=1):', mismatch.rows.length);

  await c.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
