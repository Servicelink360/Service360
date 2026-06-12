/**
 * Reset check_in that was stored ~10h ahead of created_at (AU wall clock tagged as UTC).
 * Usage: node scripts/fix-check-in-skew.js [--dry-run]
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env.prod') });
const { Client } = require('pg');
const moment = require('moment');

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const client = new Client({
    host: process.env.DATABASE_HOST,
    port: +process.env.DATABASE_PORT || 5432,
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DB_NAME,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const rows = await client.query(`
    SELECT id, check_in, created_at, site_name
    FROM user_tasks
    WHERE type = 'CUSTOM' AND check_in IS NOT NULL AND created_at IS NOT NULL
  `);

  let fixed = 0;
  for (const r of rows.rows) {
    const skew = moment(r.check_in).diff(moment(r.created_at), 'minutes');
    if (skew < 540 || skew > 660) continue;
    console.log(
      `#${r.id} ${r.site_name || ''}: check_in ${r.check_in.toISOString()} -> ${r.created_at.toISOString()}`,
    );
    if (!dryRun) {
      await client.query(`UPDATE user_tasks SET check_in = created_at WHERE id = $1`, [r.id]);
    }
    fixed++;
  }

  console.log(`Done. fixed=${fixed}${dryRun ? ' (dry-run)' : ''}`);
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
