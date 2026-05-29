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

  const check = await c.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'report_templates'
       AND column_name = 'assigned_staff_id'`,
  );

  if (check.rows.length) {
    console.log('assigned_staff_id: already exists');
  } else {
    await c.query(
      `ALTER TABLE public.report_templates
       ADD COLUMN assigned_staff_id INT NULL`,
    );
    console.log('assigned_staff_id: column added');
  }

  const sample = await c.query(
    `SELECT id, name, assigned_staff_id FROM report_templates ORDER BY id DESC LIMIT 5`,
  );
  console.log('Sample rows:', JSON.stringify(sample.rows, null, 2));
  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
