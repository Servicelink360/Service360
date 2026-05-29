/**
 * Copy report_template_items from one template to another.
 * Usage: node scripts/restore-template-items-from.js <targetId> <sourceId>
 * Example: node scripts/restore-template-items-from.js 38 56
 */
const { Client } = require('pg');

async function main() {
  const targetId = +process.argv[2];
  const sourceId = +process.argv[3];
  if (!targetId || !sourceId) {
    console.error('Usage: node scripts/restore-template-items-from.js <targetId> <sourceId>');
    process.exit(1);
  }

  const c = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: +(process.env.DATABASE_PORT || 5432),
    user: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || '123456',
    database: process.env.DATABASE_DB_NAME || 'service360',
  });
  await c.connect();

  const target = await c.query('SELECT id, name FROM report_templates WHERE id = $1', [targetId]);
  if (!target.rows[0]) {
    throw new Error(`Target template ${targetId} not found`);
  }

  const srcItems = await c.query(
    `SELECT name, type, value, required, config, "order"
     FROM report_template_items WHERE report_template_id = $1 ORDER BY "order"`,
    [sourceId],
  );
  if (!srcItems.rows.length) {
    throw new Error(`Source template ${sourceId} has no items`);
  }

  await c.query('BEGIN');
  await c.query('DELETE FROM report_template_items WHERE report_template_id = $1', [targetId]);

  for (const row of srcItems.rows) {
    await c.query(
      `INSERT INTO report_template_items
        (name, type, value, required, config, report_template_id, "order", created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        row.name,
        row.type,
        row.value ?? '',
        row.required ?? false,
        row.config ? JSON.stringify(row.config) : null,
        targetId,
        row.order,
      ],
    );
  }

  await c.query(
    `UPDATE report_templates SET updated_at = NOW() WHERE id = $1`,
    [targetId],
  );
  await c.query('COMMIT');

  console.log(
    `Restored ${srcItems.rows.length} item(s) from template ${sourceId} → "${target.rows[0].name}" (${targetId})`,
  );
  await c.end();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
