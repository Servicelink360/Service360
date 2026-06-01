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
  for (const id of [149, 140, 155]) {
    const t = await c.query(
      'SELECT id, created_at, updated_at, check_in, start_time FROM user_tasks WHERE id = $1',
      [id],
    );
    const r = await c.query(
      'SELECT name, type, value FROM user_task_reports WHERE user_task_id = $1 ORDER BY "order", id',
      [id],
    );
    console.log('\n=== task', id, '===');
    console.log(t.rows[0]);
    for (const row of r.rows) {
      if (/date|time|report/i.test(row.name + row.type)) console.log(row);
    }
  }
  await c.end();
})();
