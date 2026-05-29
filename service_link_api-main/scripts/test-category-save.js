const { Client } = require('pg');

async function main() {
  const c = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: +(process.env.DATABASE_PORT || 5432),
    user: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || '123456',
    database: process.env.DATABASE_DB_NAME || 'service360',
  });
  await c.connect();
  await c.query(
    `UPDATE report_templates SET category = $1 WHERE id = 38`,
    ['Roof and Gutter'],
  );
  const r = await c.query(
    'SELECT id, name, category FROM report_templates WHERE id = 38',
  );
  console.log(r.rows[0]);
  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
