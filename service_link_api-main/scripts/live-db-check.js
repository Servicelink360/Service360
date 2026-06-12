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

  const host = await c.query('SELECT inet_server_addr()::text AS ip, current_database() AS db');
  console.log('Connected:', host.rows[0]);

  const totals = await c.query(`
    SELECT
      COUNT(*) FILTER (WHERE type='CUSTOM' AND status=1)::int AS admin_list_count,
      COUNT(*) FILTER (WHERE type='CUSTOM' AND status=1 AND staff_id=140 AND created_by=140)::int AS staff_adam_own,
      COUNT(*) FILTER (WHERE type='CUSTOM' AND status=1 AND staff_id=140 AND created_by<>140)::int AS adam_admin_submitted_hidden_from_staff,
      COUNT(*) FILTER (WHERE type='CUSTOM' AND status=1 AND staff_id<>created_by)::int AS any_staff_not_self_submitted
    FROM user_tasks
  `);
  console.log('Totals:', totals.rows[0]);

  const top = await c.query(`
    SELECT id, site_name, staff_id, created_by, check_in, updated_at,
           (pdf_file IS NOT NULL AND pdf_file <> '') AS has_pdf
    FROM user_tasks
    WHERE type='CUSTOM' AND status=1
    ORDER BY COALESCE(check_in, created_at) DESC
    LIMIT 8
  `);
  console.log('Top reports:');
  for (const r of top.rows) console.log(r);

  await c.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
