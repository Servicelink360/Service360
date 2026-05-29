const { Client } = require('pg');

async function main() {
  const c = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '123456',
    database: 'service360',
  });
  await c.connect();

  const cols = await c.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'report_template_items' ORDER BY ordinal_position`,
  );
  console.log('columns:', cols.rows.map((r) => r.column_name));

  const items = await c.query(
    'SELECT * FROM report_template_items WHERE report_template_id = 38 LIMIT 1',
  );
  console.log('sample item keys:', items.rows[0] ? Object.keys(items.rows[0]) : 'none');

  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
