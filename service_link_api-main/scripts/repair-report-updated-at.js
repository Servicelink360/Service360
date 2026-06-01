/**
 * Restore user_tasks.updated_at after accidental PDF backfill bumps.
 * Only resets rows where updated_at is much later than created_at (regen artifact).
 *
 * Usage: node scripts/repair-report-updated-at.js [--dry-run]
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env.prod') });
const { Client } = require('pg');

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const c = new Client({
    host: process.env.DATABASE_HOST,
    port: +process.env.DATABASE_PORT || 5432,
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DB_NAME,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });
  await c.connect();

  const preview = await c.query(`
    SELECT id, created_at, updated_at, check_in, site_name
    FROM user_tasks
    WHERE type = 'CUSTOM'
      AND pdf_file IS NOT NULL AND pdf_file <> ''
      AND updated_at > created_at + interval '7 days'
    ORDER BY id
  `);
  console.log(`Rows to repair: ${preview.rows.length}${dryRun ? ' (dry-run)' : ''}`);
  for (const row of preview.rows) {
    console.log(
      `#${row.id} ${row.site_name} created=${row.created_at?.toISOString?.()} updated=${row.updated_at?.toISOString?.()}`,
    );
  }

  if (!dryRun && preview.rows.length) {
    const res = await c.query(`
      UPDATE user_tasks
      SET updated_at = COALESCE(check_in, created_at)
      WHERE type = 'CUSTOM'
        AND pdf_file IS NOT NULL AND pdf_file <> ''
        AND updated_at > created_at + interval '7 days'
    `);
    console.log(`Updated ${res.rowCount} row(s).`);
  }

  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
