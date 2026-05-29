/**
 * Remove duplicate rows in public.sites (same id repeated 2+ times) and add PRIMARY KEY on id.
 *
 * Your DB had 513 rows / 171 distinct ids (typically 3 copies each). There was no PK on sites,
 * only NOT NULL on id — which allowed duplicates and broke list/sort performance.
 *
 * Usage (from service_link_api-main):
 *   node scripts/dedupe-sites.js              # dry-run (default) — report only
 *   node scripts/dedupe-sites.js --apply      # run cleanup in a transaction
 *
 * Optional:
 *   node scripts/dedupe-sites.js --apply --record-patch
 *     Also inserts into schema_patches_applied (name: sites_dedupe_unique_id_v1).
 *
 * Re-run inspect after apply:
 *   node scripts/inspect-sites-duplicates.js
 */
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Client } = require('pg');

const PATCH_NAME = 'sites_dedupe_unique_id_v1';

const envPaths = [
  path.join(process.cwd(), '.env'),
  path.join(__dirname, '..', '.env'),
];
for (const p of envPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

function sslOption() {
  const raw = String(process.env.DATABASE_SSL ?? '').trim().toLowerCase();
  if (raw === '1' || raw === 'true' || raw === 'yes') {
    return { rejectUnauthorized: false };
  }
  return undefined;
}

async function getStats(client) {
  const counts = await client.query(`
    SELECT COUNT(*)::int AS total, COUNT(DISTINCT id)::int AS distinct_ids
    FROM public.sites
  `);
  const dupGroups = await client.query(`
    SELECT COUNT(*)::int AS duplicate_id_groups
    FROM (
      SELECT id FROM public.sites GROUP BY id HAVING COUNT(*) > 1
    ) d
  `);
  const toDelete = await client.query(`
    SELECT COUNT(*)::int AS rows_to_delete
    FROM public.sites s
    WHERE s.ctid NOT IN (
      SELECT DISTINCT ON (id) ctid
      FROM public.sites
      ORDER BY id, updated_at DESC NULLS LAST, created_at DESC NULLS LAST, ctid DESC
    )
  `);
  const pk = await client.query(`
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.sites'::regclass AND contype = 'p'
    LIMIT 1
  `);
  return {
    total: counts.rows[0].total,
    distinctIds: counts.rows[0].distinct_ids,
    duplicateIdGroups: dupGroups.rows[0].duplicate_id_groups,
    rowsToDelete: toDelete.rows[0].rows_to_delete,
    hasPrimaryKey: pk.rowCount > 0,
  };
}

async function sampleDuplicates(client, limit = 5) {
  const r = await client.query(
    `
    SELECT id, COUNT(*)::int AS copies,
      MIN(updated_at) AS oldest_updated,
      MAX(updated_at) AS newest_updated
    FROM public.sites
    GROUP BY id
    HAVING COUNT(*) > 1
    ORDER BY copies DESC, id DESC
    LIMIT $1
    `,
    [limit],
  );
  return r.rows;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const recordPatch = process.argv.includes('--record-patch');

  const client = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    user: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DB_NAME || 'service360',
    ssl: sslOption(),
  });

  await client.connect();
  console.log(`Connected to ${client.database}@${client.host}`);

  const before = await getStats(client);
  console.log('\n--- Before ---');
  console.log(`Total rows:        ${before.total}`);
  console.log(`Distinct site ids: ${before.distinctIds}`);
  console.log(`Ids with copies:   ${before.duplicateIdGroups}`);
  console.log(`Rows to remove:    ${before.rowsToDelete}`);
  console.log(`Has PRIMARY KEY:   ${before.hasPrimaryKey}`);

  if (before.rowsToDelete > 0) {
    console.log('\nSample duplicate ids:');
    console.table(await sampleDuplicates(client));
  }

  if (!apply) {
    console.log('\nDry-run only. To apply cleanup, run:');
    console.log('  node scripts/dedupe-sites.js --apply');
    await client.end();
    return;
  }

  if (before.rowsToDelete === 0 && before.hasPrimaryKey) {
    console.log('\nNothing to do — no duplicates and PRIMARY KEY already exists.');
    await client.end();
    return;
  }

  if (recordPatch) {
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.schema_patches_applied (
        name VARCHAR(128) PRIMARY KEY,
        applied_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    const existing = await client.query(
      `SELECT 1 FROM public.schema_patches_applied WHERE name = $1 LIMIT 1`,
      [PATCH_NAME],
    );
    if (existing.rowCount > 0) {
      console.log(`\nPatch "${PATCH_NAME}" already recorded. Skipping apply.`);
      await client.end();
      return;
    }
  }

  const migrationPath = path.join(
    __dirname,
    '..',
    'database',
    'migrations',
    '006_sites_dedupe_unique_id.sql',
  );
  const sql = fs.readFileSync(migrationPath, 'utf8');

  try {
    await client.query(sql);
    if (recordPatch) {
      await client.query(
        `INSERT INTO public.schema_patches_applied (name) VALUES ($1) ON CONFLICT DO NOTHING`,
        [PATCH_NAME],
      );
    }
  } catch (err) {
    console.error('\nApply failed:', err.message);
    process.exit(1);
  }

  const after = await getStats(client);
  console.log('\n--- After ---');
  console.log(`Total rows:        ${after.total}`);
  console.log(`Distinct site ids: ${after.distinctIds}`);
  console.log(`Ids with copies:   ${after.duplicateIdGroups}`);
  console.log(`Has PRIMARY KEY:   ${after.hasPrimaryKey}`);

  if (after.total !== after.distinctIds || after.duplicateIdGroups > 0) {
    console.error('\nVerification failed — duplicates may remain.');
    process.exit(1);
  }

  console.log('\nDone. Restart the API and re-test Job sites staff sort.');
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
