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
  const t = await c.query(`
    SELECT id, task_name, check_in, created_at, pdf_file
    FROM user_tasks
    WHERE site_name ILIKE '%Bayside%'
      AND created_at >= '2026-05-29'
    ORDER BY id DESC
    LIMIT 10
  `);
  console.table(t.rows);
  for (const id of [163, 161, 162, 168]) {
    const t = await c.query('SELECT * FROM user_tasks WHERE id = $1', [id]);
    const r = await c.query(
      `SELECT name, type, value FROM user_task_reports WHERE user_task_id = $1 ORDER BY "order", id`,
      [id],
    );
    const row = t.rows[0];
    if (!row) continue;
    const moment = require('moment');
    console.log('\n---', id, row.site_name, '|', row.task_name);
    console.log('check_in:', row.check_in);
    console.log('  moment():', moment(row.check_in).format('DD MMM YYYY HH:mm:ss'));
    console.log('  utc+10:   ', moment(row.check_in).utcOffset('+10:00', true).format('DD MMM YYYY HH:mm:ss'));
    for (const f of r.rows) {
      console.log(`  ${f.name} (${f.type}): ${f.value}`);
    }
  }
  await c.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
