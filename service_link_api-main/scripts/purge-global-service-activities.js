/**
 * Remove all rows from service_activities (global catalogue).
 * Preserves site schedules by copying names to activity_name and clearing activity_id.
 *
 * Usage: node scripts/purge-global-service-activities.js [--dry-run]
 */
require('./load-env');
const { Client } = require('pg');

const dryRun = process.argv.includes('--dry-run');

async function main() {
  const client = new Client({
    host: process.env.DATABASE_HOST,
    port: +(process.env.DATABASE_PORT || 5432),
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DB_NAME,
    ssl: String(process.env.DATABASE_SSL || '').toLowerCase() === 'true'
      ? { rejectUnauthorized: false }
      : false,
  });

  await client.connect();
  const db = await client.query('SELECT current_database() AS db');
  console.log(`Connected: ${db.rows[0].db}${dryRun ? ' (dry-run)' : ''}`);

  const before = await client.query(`
    SELECT id, service_id, name
    FROM service_activities
    ORDER BY service_id, name
  `);
  console.log(`Global service_activities: ${before.rowCount}`);
  for (const row of before.rows) {
    console.log(`  id=${row.id} service_id=${row.service_id} name="${row.name}"`);
  }

  const linked = await client.query(`
    SELECT COUNT(*)::int AS n
    FROM site_item_activity_schedules
    WHERE activity_id IS NOT NULL
  `);
  console.log(`Schedule rows still linked via activity_id: ${linked.rows[0].n}`);

  if (dryRun) {
    console.log('Dry-run — no changes made.');
    await client.end();
    return;
  }

  await client.query('BEGIN');

  const backfill = await client.query(`
    UPDATE site_item_activity_schedules s
    SET activity_name = a.name,
        updated_at = NOW()
    FROM service_activities a
    WHERE a.id = s.activity_id
      AND (s.activity_name IS NULL OR TRIM(s.activity_name) = '')
  `);
  console.log(`Backfilled activity_name on ${backfill.rowCount} schedule row(s).`);

  const unlink = await client.query(`
    UPDATE site_item_activity_schedules
    SET activity_id = NULL,
        updated_at = NOW()
    WHERE activity_id IS NOT NULL
  `);
  console.log(`Cleared activity_id on ${unlink.rowCount} schedule row(s).`);

  const deleted = await client.query('DELETE FROM service_activities');
  console.log(`Deleted ${deleted.rowCount} global service_activities row(s).`);

  await client.query('COMMIT');

  const after = await client.query('SELECT COUNT(*)::int AS n FROM service_activities');
  console.log(`Remaining service_activities: ${after.rows[0].n}`);

  await client.end();
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
