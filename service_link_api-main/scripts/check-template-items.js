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
  const counts = await c.query(
    `SELECT report_template_id, COUNT(*)::int AS n
     FROM report_template_items
     GROUP BY report_template_id
     ORDER BY report_template_id`,
  );
  console.log('Items per template:', counts.rows);
  const id = +(process.argv[2] || 38);
  const items = await c.query(
    `SELECT id, name, type, "order"
     FROM report_template_items
     WHERE report_template_id = $1
     ORDER BY "order"`,
    [id],
  );
  console.log(`Template ${id}: ${items.rows.length} item(s)`);
  if (items.rows.length) {
    console.log(items.rows.slice(0, 5));
  }
  await c.end();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
