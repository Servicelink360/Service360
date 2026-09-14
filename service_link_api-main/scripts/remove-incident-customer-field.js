const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '123456',
    database: 'service360',
  });
  await client.connect();

  const tpl = await client.query(
    `SELECT id FROM report_templates
     WHERE LOWER(TRIM(name)) = 'incident report'
       AND UPPER(TRIM(category)) = 'INCIDENT'`,
  );
  if (!tpl.rows.length) {
    console.log('No Incident Report template found');
    await client.end();
    return;
  }

  for (const row of tpl.rows) {
    const del = await client.query(
      `DELETE FROM report_template_items
       WHERE report_template_id = $1
         AND (
           LOWER(TRIM(name)) = 'customer'
           OR type = '[CUSTOMER_NAME]'
         )
       RETURNING id, name, type`,
      [row.id],
    );
    console.log('template', row.id, 'removed', del.rows);
  }

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
