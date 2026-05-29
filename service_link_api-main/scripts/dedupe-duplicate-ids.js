/**
 * Remove duplicate rows (same `id` repeated) and add missing PRIMARY KEY constraints.
 *
 * Affected tables typically had 3× copies (201 distinct → 603 rows) because pg_dump
 * files under c:/app_pc/data/ (4.sql, 5.sql) COPY data into tables with NO primary key,
 * and restores were applied more than once.
 *
 * Usage:
 *   node scripts/dedupe-duplicate-ids.js              # dry-run
 *   node scripts/dedupe-duplicate-ids.js --apply
 *   node scripts/dedupe-duplicate-ids.js --apply --record-patch
 */
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Client } = require('pg');

const PATCH_NAME = 'db_dedupe_duplicate_ids_v1';

/** pg_dump restore created `user_tasks1` etc. with PK names that block the real tables. */
const SHADOW_TABLES = ['user_tasks1', 'user_task_reports1', 'report_fault_answers1'];

const TABLES = [
  { table: 'site_items', constraint: 'site_items_pkey' },
  { table: 'site_item_staffs', constraint: 'site_item_staffs_pkey' },
  { table: 'site_item_staff_shifts', constraint: 'site_item_staff_shifts_pkey' },
  { table: 'user_tasks', constraint: 'user_tasks_pkey' },
  { table: 'report_faults', constraint: 'report_faults_pkey' },
  { table: 'report_fault_answers', constraint: 'report_fault_answers_pkey' },
];

const envPaths = [path.join(process.cwd(), '.env'), path.join(__dirname, '..', '.env')];
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

async function tableExists(client, table) {
  const r = await client.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [table],
  );
  return r.rowCount > 0;
}

async function getTableStats(client, table) {
  const counts = await client.query(
    `SELECT COUNT(*)::int AS total, COUNT(DISTINCT id)::int AS distinct_ids FROM public."${table}"`,
  );
  const toDelete = await client.query(`
    SELECT COUNT(*)::int AS rows_to_delete
    FROM public."${table}" t
    WHERE t.ctid NOT IN (
      SELECT DISTINCT ON (id) ctid
      FROM public."${table}"
      ORDER BY id, ctid DESC
    )
  `);
  const pk = await client.query(
    `SELECT 1 FROM pg_constraint WHERE conrelid = $1::regclass AND contype = 'p' LIMIT 1`,
    [`public.${table}`],
  );
  const row = counts.rows[0];
  const del = toDelete.rows[0];
  const total = Number(row.total ?? row.TOTAL ?? 0);
  const distinctIds = Number(row.distinct_ids ?? row.DISTINCT_IDS ?? 0);
  const rowsToDelete = Number(
    del?.rows_to_delete ?? del?.ROWS_TO_DELETE ?? total - distinctIds,
  );
  return {
    total,
    distinctIds,
    rowsToDelete: Math.max(0, rowsToDelete),
    hasPrimaryKey: pk.rowCount > 0,
  };
}

async function dedupeTable(client, table) {
  const r = await client.query(`
    DELETE FROM public."${table}" t
    WHERE t.ctid NOT IN (
      SELECT DISTINCT ON (id) ctid
      FROM public."${table}"
      ORDER BY id, ctid DESC
    )
  `);
  return r.rowCount;
}

async function dropShadowTables(client) {
  for (const shadow of SHADOW_TABLES) {
    if (!(await tableExists(client, shadow))) continue;
    const n = await client.query(`SELECT COUNT(*)::int AS n FROM public."${shadow}"`);
    const rows = n.rows[0]?.n ?? 0;
    console.log(`Dropping shadow table ${shadow} (${rows} row(s)) — blocks ${shadow.replace(/1$/, '')}_pkey`);
    await client.query(`DROP TABLE IF EXISTS public."${shadow}" CASCADE`);
  }
}

async function hasPrimaryKey(client, table) {
  const r = await client.query(
    `SELECT 1 FROM pg_constraint WHERE conrelid = $1::regclass AND contype = 'p' LIMIT 1`,
    [`public.${table}`],
  );
  return r.rowCount > 0;
}

async function ensurePrimaryKey(client, table, constraint) {
  if (await hasPrimaryKey(client, table)) return;
  await client.query(`DROP INDEX IF EXISTS public."${constraint}"`);
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.${table}'::regclass AND contype = 'p'
      ) THEN
        ALTER TABLE public."${table}" ADD CONSTRAINT "${constraint}" PRIMARY KEY (id);
      END IF;
    END$$;
  `);
}

async function resetSequence(client, table) {
  const seq = await client.query(`SELECT pg_get_serial_sequence($1, 'id') AS seq`, [
    `public.${table}`,
  ]);
  const seqName = seq.rows[0]?.seq;
  if (!seqName) return;
  await client.query(
    `SELECT setval($1::regclass, GREATEST((SELECT COALESCE(MAX(id), 0) FROM public."${table}"), 1), true)`,
    [seqName],
  );
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
  console.log(`Connected: ${client.database}@${client.host}\n`);

  let totalToDelete = 0;
  for (const { table } of TABLES) {
    if (!(await tableExists(client, table))) {
      console.log(`[skip] ${table} — table not found`);
      continue;
    }
    const s = await getTableStats(client, table);
    console.log(
      `${table}: total=${s.total} distinct=${s.distinctIds} to_delete=${s.rowsToDelete} PK=${s.hasPrimaryKey ? 'yes' : 'NO'}`,
    );
    totalToDelete += s.rowsToDelete;
  }

  if (!apply) {
    console.log(`\nDry-run. Would delete ${totalToDelete} duplicate row(s).`);
    console.log('Apply: node scripts/dedupe-duplicate-ids.js --apply --record-patch');
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
    const exists = await client.query(
      `SELECT 1 FROM public.schema_patches_applied WHERE name = $1`,
      [PATCH_NAME],
    );
    if (exists.rowCount) {
      console.log(`\nPatch ${PATCH_NAME} already applied.`);
      await client.end();
      return;
    }
  }

  await client.query('BEGIN');
  try {
    await dropShadowTables(client);

    for (const { table, constraint } of TABLES) {
      if (!(await tableExists(client, table))) continue;
      const before = await getTableStats(client, table);
      if (before.total > before.distinctIds) {
        const deleted = await dedupeTable(client, table);
        console.log(`Deleted ${deleted} from ${table}`);
      }
      await ensurePrimaryKey(client, table, constraint);
      await resetSequence(client, table);
      const after = await getTableStats(client, table);
      if (after.total !== after.distinctIds) {
        throw new Error(`${table}: still has duplicates after dedupe`);
      }
      console.log(`OK ${table}: ${after.total} rows, PK=${after.hasPrimaryKey ? 'yes' : 'added'}`);
    }

    if (recordPatch) {
      await client.query(
        `INSERT INTO public.schema_patches_applied (name) VALUES ($1) ON CONFLICT DO NOTHING`,
        [PATCH_NAME],
      );
    }
    await client.query('COMMIT');
    console.log('\nDone. Run: node scripts/check-db-corruption.js');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Failed:', e.message);
    process.exit(1);
  }

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
