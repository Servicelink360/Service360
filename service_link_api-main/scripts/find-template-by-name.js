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
  const term = process.argv[2] || 'roof';
  const r = await c.query(
    `SELECT t.id, t.name, t.category, COUNT(i.id)::int AS item_count
     FROM report_templates t
     LEFT JOIN report_template_items i ON i.report_template_id = t.id
     WHERE t.name ILIKE $1
     GROUP BY t.id, t.name, t.category
     ORDER BY t.id`,
    [`%${term}%`],
  );
  console.log(r.rows);
  await c.end();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
