// check-db-corruption.js
// Checks for corruption and missing required fields in report_templates and report_template_items tables.
// Requires: npm install pg

const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5433,
  user: 'postgres',
  password: '123456',
  database: 'service360',
});

async function checkCorruption() {
  await client.connect();

  // 1. report_templates: missing required fields
  const templates = await client.query(`
    SELECT id, name, description, category, "order", file_url, status
    FROM report_templates
    WHERE name IS NULL OR description IS NULL OR category IS NULL OR "order" IS NULL OR file_url IS NULL OR status IS NULL
       OR TRIM(name) = '' OR TRIM(description) = '' OR TRIM(category::text) = '' OR TRIM(file_url) = ''
  `);

  // 2. report_template_items: missing required fields
  const items = await client.query(`
    SELECT id, name, type, report_template_id, "order"
    FROM report_template_items
    WHERE name IS NULL OR type IS NULL OR report_template_id IS NULL OR "order" IS NULL
       OR TRIM(name) = '' OR TRIM(type) = ''
  `);

  // 3. Orphaned items
  const orphaned = await client.query(`
    SELECT i.*
    FROM report_template_items i
    LEFT JOIN report_templates t ON i.report_template_id = t.id
    WHERE t.id IS NULL
  `);

  // 4. Duplicate item names within a template
  const duplicates = await client.query(`
    SELECT report_template_id, name, COUNT(*)
    FROM report_template_items
    GROUP BY report_template_id, name
    HAVING COUNT(*) > 1
  `);

  // 5. Order corruption (duplicates, gaps, or not starting at 1)
  const orderCorruption = await client.query(`
    SELECT report_template_id,
           COUNT(DISTINCT "order") AS unique_orders,
           COUNT(*) AS total_items,
           MIN("order") AS min_order,
           MAX("order") AS max_order
    FROM report_template_items
    GROUP BY report_template_id
    HAVING COUNT(DISTINCT "order") <> COUNT(*) OR MIN("order") <> 1 OR MAX("order") <> COUNT(*)
  `);

  console.log('Templates with missing required fields:', templates.rows);
  console.log('Items with missing required fields:', items.rows);
  console.log('Orphaned items:', orphaned.rows);
  console.log('Duplicate item names within a template:', duplicates.rows);
  console.log('Order corruption in items:', orderCorruption.rows);

  await client.end();
}

checkCorruption().catch(err => {
  console.error('Error during corruption check:', err);
  process.exit(1);
});
