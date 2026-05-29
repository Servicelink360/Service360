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
  const col = await c.query(
    `SELECT data_type, udt_name
     FROM information_schema.columns
     WHERE table_name = 'report_templates' AND column_name = 'category'`,
  );
  console.log('category column:', col.rows[0]);
  const enums = await c.query(
    `SELECT e.enumlabel
     FROM pg_type t
     JOIN pg_enum e ON t.oid = e.enumtypid
     WHERE t.typname = 'report_templates_category_enum'
     ORDER BY e.enumsortorder`,
  );
  console.log('enum values:', enums.rows.map((r) => r.enumlabel));
  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
