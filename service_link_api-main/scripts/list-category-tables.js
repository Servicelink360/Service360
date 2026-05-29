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
  const tables = await c.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name ILIKE '%categor%'
     ORDER BY table_name`,
  );
  console.log('Tables:', tables.rows);

  for (const row of tables.rows) {
    const name = row.table_name;
    const cols = await c.query(
      `SELECT column_name, data_type FROM information_schema.columns
       WHERE table_name = $1 ORDER BY ordinal_position`,
      [name],
    );
    console.log('\n', name, cols.rows);
    const sample = await c.query(`SELECT * FROM "${name}" LIMIT 5`);
    console.log(' sample:', sample.rows);
  }
  await c.end();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
