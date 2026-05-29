const { Client } = require('pg');

async function main() {
  const id = +(process.argv[2] || 56);
  const c = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '123456',
    database: 'service360',
  });
  await c.connect();
  const t = await c.query('SELECT id, name FROM report_templates WHERE id = $1', [id]);
  console.log('Template:', t.rows[0]);
  const items = await c.query(
    `SELECT name, type, "order", value, required, config
     FROM report_template_items WHERE report_template_id = $1 ORDER BY "order"`,
    [id],
  );
  items.rows.forEach((row, i) => {
    console.log(`${i + 1}. [${row.type}] ${row.name} (order ${row.order})`);
  });
  await c.end();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
