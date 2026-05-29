/**
 * Inspect duplicate rows in public.sites
 * Usage: node scripts/inspect-sites-duplicates.js
 */
require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const c = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: +(process.env.DATABASE_PORT || 5432),
    user: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || '123456',
    database: process.env.DATABASE_DB_NAME || 'service360',
  });
  await c.connect();
  const pk = await c.query(`
    SELECT conname, pg_get_constraintdef(oid) AS def
    FROM pg_constraint
    WHERE conrelid = 'public.sites'::regclass
  `);
  console.log('constraints:', pk.rows);
  const cnt = await c.query(`
    SELECT COUNT(*)::int AS total, COUNT(DISTINCT id)::int AS distinct_ids
    FROM sites
  `);
  console.log('counts:', cnt.rows[0]);
  const dup = await c.query(`
    SELECT id, COUNT(*)::int AS n
    FROM sites
    GROUP BY id
    HAVING COUNT(*) > 1
    ORDER BY n DESC
    LIMIT 10
  `);
  console.log('sample duplicate ids:', dup.rows);
  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
