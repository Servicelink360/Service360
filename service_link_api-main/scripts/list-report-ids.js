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
  const r = await c.query(
    'SELECT id, task_name, site_name, staff_id FROM user_tasks ORDER BY id',
  );
  console.table(r.rows);
  await c.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
