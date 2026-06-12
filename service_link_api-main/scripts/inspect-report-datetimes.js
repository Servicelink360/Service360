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

  const rows = await c.query(`
    SELECT ut.id, ut.check_in, ut.created_at, ut.updated_at,
           json_agg(json_build_object('name', r.name, 'type', r.type, 'value', LEFT(r.value, 120)))
             FILTER (WHERE r.id IS NOT NULL) AS fields
    FROM user_tasks ut
    LEFT JOIN user_task_reports r ON r.user_task_id = ut.id
    WHERE ut.id IN (163, 162, 207)
    GROUP BY ut.id
    ORDER BY ut.id
  `);

  for (const row of rows.rows) {
    console.log('\n=== #' + row.id + ' ===');
    console.log('check_in:', row.check_in?.toISOString?.());
    console.log('created_at:', row.created_at?.toISOString?.());
    console.log('updated_at:', row.updated_at?.toISOString?.());
    const fields = row.fields || [];
    for (const f of fields) {
      const n = String(f.name || '');
      const t = String(f.type || '');
      if (
        /time|date|report_date|report_time/i.test(n) ||
        /DATE|TIME|REPORT/i.test(t)
      ) {
        console.log(`  [${t}] ${n}: ${f.value}`);
      }
    }
  }

  await c.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
