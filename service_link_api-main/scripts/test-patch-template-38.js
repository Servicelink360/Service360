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

  const t = await c.query(
    'SELECT id, name, description, category, file_url FROM report_templates WHERE id = 38',
  );
  const items = await c.query(
    `SELECT name, type, value, required, config, "order"
     FROM report_template_items WHERE report_template_id = 38 ORDER BY "order"`,
  );
  await c.end();

  const payload = {
    name: t.rows[0].name,
    description: t.rows[0].description ?? '',
    category: t.rows[0].category || 'GENERAL',
    fileUrl: t.rows[0].file_url ?? '',
    items: items.rows.map((row, index) => {
      const item = {
        name: row.name,
        type: row.type,
        value: row.value ?? '',
        order: Number(row.order) || index + 1,
        required: Boolean(row.required),
      };
      if (row.config && typeof row.config === 'object') {
        item.config = row.config;
      }
      return item;
    }),
  };

  console.log('Template:', t.rows[0]);
  console.log('Items:', payload.items.length);
  console.log('fileUrl:', JSON.stringify(payload.fileUrl));

  const validTypes = new Set([
    'YES_NO', 'IMAGES', 'SELECT', 'TEXT', 'TEXTAREA', 'RICH_TEXT', 'NUMBER',
    'PERCENTAGE', 'CURRENCY', 'CHECKLIST', 'TABLE', 'SIGNATURE', 'GPS', 'DATE',
    'TIME', 'VIDEOS', '[REPORT_DATE]', '[REPORT_TIME]', '[SITE_NAME]',
    '[SITE_ADDRESS]', '[CUSTOMER_NAME]', '[REPORT_BY]',
  ]);

  payload.items.forEach((item, i) => {
    const issues = [];
    if (!validTypes.has(item.type)) issues.push(`invalid type: ${item.type}`);
    if (!item.name || !String(item.name).trim()) issues.push('empty name');
    if (!Number.isInteger(item.order)) issues.push(`order not int: ${item.order}`);
    if (issues.length) console.log(`Item ${i + 1}:`, item.name, issues.join(', '));
  });

  // Try HTTP if fetch available
  try {
    const res = await fetch('http://localhost:5301/v1/report-templates/38', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    console.log('\nPATCH status:', res.status);
    console.log('PATCH body:', text.slice(0, 500));
  } catch (e) {
    console.log('\nPATCH fetch skipped:', e.message);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
