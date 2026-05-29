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
  const r = await c.query(
    `SELECT rt.*, u1.id AS cu, u2.id AS uu
     FROM report_templates rt
     LEFT JOIN users u1 ON u1.id = rt.created_by
     LEFT JOIN users u2 ON u2.id = rt.updated_by
     WHERE rt.id = 38`,
  );
  console.log(r.rows[0]);
  const orderCol = await c.query(
    `SELECT is_nullable, column_default FROM information_schema.columns
     WHERE table_name = 'report_templates' AND column_name = 'order'`,
  );
  console.log('order column:', orderCol.rows);
  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
