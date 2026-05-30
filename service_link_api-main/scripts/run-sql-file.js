const fs = require('fs');
const { Client } = require('pg');

(async () => {
  const sql = fs.readFileSync('/tmp/034_fix.sql', 'utf8');
  const c = new Client({
    host: process.env.DATABASE_HOST,
    port: +(process.env.DATABASE_PORT || 5432),
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DB_NAME,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });
  await c.connect();
  await c.query(sql);
  const sample = await c.query(
    "SELECT id, name FROM report_template_items WHERE name ILIKE '%After Photos%' LIMIT 3",
  );
  console.log(JSON.stringify(sample.rows, null, 2));
  await c.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
