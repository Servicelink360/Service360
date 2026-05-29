const { Client } = require('pg');
const { validate } = require('class-validator');
const { plainToInstance } = require('class-transformer');

// Minimal mirror of DTO rules for quick check
async function main() {
  const id = +(process.argv[2] || 38);
  const c = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '123456',
    database: 'service360',
  });
  await c.connect();
  const t = await c.query('SELECT * FROM report_templates WHERE id = $1', [id]);
  const items = await c.query(
    `SELECT name, type, value, required, config, "order"
     FROM report_template_items WHERE report_template_id = $1 ORDER BY "order"`,
    [id],
  );
  await c.end();

  const payload = {
    name: t.rows[0].name,
    description: t.rows[0].description ?? '',
    category: 'Roof and Gutter Cleaning',
    fileUrl: t.rows[0].file_url ?? '',
    items: items.rows.map((row, index) => {
      const item = {
        name: row.name,
        type: row.type,
        value: row.value ?? '',
        order: row.order ?? index + 1,
        required: row.required ?? false,
      };
      if (row.config) {
        item.config = typeof row.config === 'string' ? JSON.parse(row.config) : row.config;
      }
      return item;
    }),
  };

  console.log('Payload items:', payload.items.length);
  const validTypes = new Set([
    'YES_NO', 'IMAGES', 'SELECT', 'TEXT', 'TEXTAREA', 'RICH_TEXT', 'NUMBER',
    'PERCENTAGE', 'CURRENCY', 'CHECKLIST', 'TABLE', 'SIGNATURE', 'GPS', 'DATE',
    'TIME', 'VIDEOS', '[REPORT_DATE]', '[REPORT_TIME]', '[SITE_NAME]',
    '[SITE_ADDRESS]', '[CUSTOMER_NAME]', '[REPORT_BY]',
  ]);
  payload.items.forEach((item, i) => {
    if (!validTypes.has(item.type)) {
      console.log(`INVALID TYPE row ${i + 1}:`, item.type, item.name);
    }
    if (!item.name || !String(item.name).trim()) {
      console.log(`EMPTY NAME row ${i + 1}`);
    }
    if (typeof item.order !== 'number' || !Number.isInteger(item.order)) {
      console.log(`BAD ORDER row ${i + 1}:`, item.order, typeof item.order);
    }
    if (item.config !== undefined && (typeof item.config !== 'object' || item.config === null || Array.isArray(item.config))) {
      console.log(`BAD CONFIG row ${i + 1}:`, item.config);
    }
  });
  console.log('Sample item:', JSON.stringify(payload.items[6], null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
