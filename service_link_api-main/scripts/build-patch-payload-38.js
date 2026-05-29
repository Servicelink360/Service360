const { Client } = require('pg');

async function main() {
  const id = 38;
  const c = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '123456',
    database: 'service360',
  });
  await c.connect();
  const t = await c.query('SELECT name, description, category, file_url FROM report_templates WHERE id = $1', [id]);
  const items = await c.query(
    `SELECT name, type, value, required, config, "order"
     FROM report_template_items WHERE report_template_id = $1 ORDER BY "order"`,
    [id],
  );
  await c.end();

  const payload = {
    name: t.rows[0].name,
    description: t.rows[0].description ?? '',
    category: 'Roof and Gutter',
    fileUrl: t.rows[0].file_url ?? '',
    items: items.rows.map((row, index) => {
      const item = {
        name: row.name,
        type: row.type,
        value: row.value ?? '',
        order: row.order ?? index + 1,
      };
      if (typeof row.required === 'boolean') item.required = row.required;
      if (row.config) {
        item.config = typeof row.config === 'string' ? JSON.parse(row.config) : row.config;
      }
      return item;
    }),
  };
  console.log(JSON.stringify(payload, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
