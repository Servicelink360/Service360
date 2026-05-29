// Script to fix invalid report_template_items.type values in PostgreSQL
// Usage: node fix-invalid-item-types.js

const { Client } = require('pg');

// Update these with your actual DB credentials or use environment variables
const client = new Client({
  host: process.env.DATABASE_HOST || 'localhost',
  port: process.env.DATABASE_PORT || 5432,
  user: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_DB_NAME || 'servicelink360',
});

// List of valid enum values (must match backend and DB)
const validTypes = [
  'YES_NO', 'IMAGES', 'SELECT', 'TEXT', 'TEXTAREA', 'RICH_TEXT', 'NUMBER', 'PERCENTAGE', 'CURRENCY',
  'CHECKLIST', 'TABLE', 'SIGNATURE', 'GPS', 'DATE', 'TIME', 'VIDEOS', '[REPORT_DATE]', '[REPORT_TIME]',
  '[SITE_NAME]', '[SITE_ADDRESS]', '[CUSTOMER_NAME]', '[REPORT_BY]'
];

const DEFAULT_TYPE = 'TEXT';

async function fixInvalidTypes() {
  await client.connect();
  // Find all invalid types
  const { rows } = await client.query(`SELECT id, type FROM report_template_items WHERE type NOT IN (${validTypes.map(t => `'${t}'`).join(',')})`);
  if (rows.length === 0) {
    console.log('No invalid types found.');
    await client.end();
    return;
  }
  console.log(`Found ${rows.length} invalid items. Fixing...`);
  for (const row of rows) {
    console.log(`Fixing item id=${row.id}, type='${row.type}' => '${DEFAULT_TYPE}'`);
    await client.query('UPDATE report_template_items SET type = $1 WHERE id = $2', [DEFAULT_TYPE, row.id]);
  }
  await client.end();
  console.log('All invalid types fixed.');
}

fixInvalidTypes().catch(err => {
  console.error('Error running fix script:', err);
  process.exit(1);
});
