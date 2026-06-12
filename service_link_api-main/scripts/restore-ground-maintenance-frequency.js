/**
 * Sync Ground Maintenance site items to unified frequency_mode (both / annual / interval).
 * Does not delete simple fields or activity schedule rows.
 *
 *   npm run db:restore-ground-maintenance-frequency
 *   npm run db:restore-ground-maintenance-frequency -- --dry-run
 *
 * Re-import schedule grid data (Inner West TSV):
 *   npm run db:seed-inner-west-ground-maintenance
 */
/* eslint-disable no-console */
require('./load-env');
const { Client } = require('pg');

const dryRun = process.argv.includes('--dry-run');
const allowRemote = process.argv.includes('--allow-remote');

function sslOption() {
  const raw = String(process.env.DATABASE_SSL ?? '').trim().toLowerCase();
  if (raw === '1' || raw === 'true' || raw === 'yes') {
    return { rejectUnauthorized: false };
  }
  return undefined;
}

function dbConfig() {
  const host = process.env.DATABASE_HOST || 'localhost';
  if (!allowRemote && !/^localhost$|^127\.0\.0\.1$/i.test(host)) {
    throw new Error(
      `Refusing non-local host "${host}". Use .env.local with DATABASE_HOST=localhost or pass --allow-remote.`,
    );
  }
  return {
    host,
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    user: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || process.env.LOCAL_DATABASE_PASSWORD,
    database: process.env.DATABASE_DB_NAME || 'service360',
    ssl: sslOption(),
  };
}

async function ensureFrequencyColumns(client) {
  await client.query(`
    ALTER TABLE site_items ADD COLUMN IF NOT EXISTS frequency_mode VARCHAR(16) NULL;
    ALTER TABLE site_items ADD COLUMN IF NOT EXISTS frequency_times INT NULL;
    ALTER TABLE site_items ADD COLUMN IF NOT EXISTS frequency_count INT NULL;
    ALTER TABLE site_items ADD COLUMN IF NOT EXISTS frequency_period VARCHAR(16) NULL;
  `);
}

async function restoreGroundMaintenanceToAdvanced(client) {
  const preview = await client.query(`
    SELECT si.id, si.site_id, s.name AS site_name,
      si.frequency_mode, si.frequency_times, si.frequency_count, si.frequency_period,
      (SELECT COUNT(*)::int FROM site_item_activity_schedules sch WHERE sch.site_item_id = si.id) AS schedule_rows
    FROM site_items si
    INNER JOIN services svc ON svc.id = si.service_id
    INNER JOIN sites s ON s.id = si.site_id
    WHERE LOWER(TRIM(svc.name)) = 'ground maintenance'
    ORDER BY si.id
  `);

  console.log(`Ground Maintenance site items: ${preview.rows.length}`);
  for (const row of preview.rows) {
    console.log(
      `  #${row.id} site=${row.site_id} ${row.site_name} mode=${row.frequency_mode ?? '(null)'} schedules=${row.schedule_rows} simple=${row.frequency_times ?? '-'} per ${row.frequency_count ?? '-'} ${row.frequency_period ?? ''}`,
    );
  }

  if (dryRun) {
    console.log('\n[dry-run] would sync frequency_mode from simple + schedule rows (no data deleted)');
    return preview.rows.length;
  }

  const updated = await client.query(`
    UPDATE site_items si
    SET frequency_mode = CASE
      WHEN si.frequency_period IS NOT NULL
        AND TRIM(si.frequency_period) <> ''
        AND LOWER(TRIM(si.frequency_period)) <> 'na'
        AND (
          SELECT COUNT(*)::int FROM site_item_activity_schedules sch
          WHERE sch.site_item_id = si.id
        ) > 0
        THEN 'both'
      WHEN (
        SELECT COUNT(*)::int FROM site_item_activity_schedules sch
        WHERE sch.site_item_id = si.id
      ) > 0
        THEN 'annual'
      ELSE 'interval'
    END
    FROM services svc
    WHERE si.service_id = svc.id
      AND LOWER(TRIM(svc.name)) = 'ground maintenance'
    RETURNING si.id
  `);

  return updated.rowCount;
}

async function main() {
  const cfg = dbConfig();
  if (!cfg.password) {
    console.error('Missing DATABASE_PASSWORD (.env.local)');
    process.exit(1);
  }

  const client = new Client(cfg);
  await client.connect();
  console.log('Connected:', { host: cfg.host, database: cfg.database, dryRun });

  await ensureFrequencyColumns(client);
  const count = await restoreGroundMaintenanceToAdvanced(client);
  await client.end();

  console.log(`\nDone. ${dryRun ? 'Would update' : 'Updated'} ${count} Ground Maintenance site item(s) (unified mode sync, no data deleted).`);
  console.log('To reload activity/month grids: npm run db:seed-inner-west-ground-maintenance');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
