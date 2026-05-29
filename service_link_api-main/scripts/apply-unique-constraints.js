/**
 * Enforce PRIMARY KEY + business UNIQUE constraints so duplicate rows cannot be inserted.
 *
 * Usage:
 *   node scripts/apply-unique-constraints.js              # dry-run
 *   node scripts/apply-unique-constraints.js --apply
 *   node scripts/apply-unique-constraints.js --apply --record-patch
 */
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Client } = require('pg');
const { isLegacySuffix2Table } = require('./db-legacy-tables');

const PATCH_NAME = 'db_unique_keys_v1';

const SHADOW_TABLES = ['user_tasks1', 'user_task_reports1', 'report_fault_answers1'];

/** Tables that may still lack PK or have duplicate `id` rows (3× dump restores). */
const PK_TABLES = [
  { table: 'sites', constraint: 'sites_pkey' },
  { table: 'site_items', constraint: 'site_items_pkey' },
  { table: 'site_item_staffs', constraint: 'site_item_staffs_pkey' },
  { table: 'site_item_staff_shifts', constraint: 'site_item_staff_shifts_pkey' },
  { table: 'user_tasks', constraint: 'user_tasks_pkey' },
  { table: 'user_task_reports', constraint: 'user_task_reports_pkey' },
  { table: 'user_roles', constraint: 'user_roles_pkey' },
  { table: 'report_faults', constraint: 'report_faults_pkey' },
  { table: 'report_fault_answers', constraint: 'report_fault_answers_pkey' },
  { table: 'tasks', constraint: 'tasks_pkey' },
  { table: 'task_shifts', constraint: 'task_shifts_pkey' },
  { table: 'task_shift_logs', constraint: 'task_shift_logs_pkey' },
];

/** Natural keys the application treats as one row per combination. */
const UNIQUE_CONSTRAINTS = [
  {
    table: 'site_items',
    name: 'uq_site_items_site_svc_customer',
    columns: ['site_id', 'service_id', 'customer_id'],
  },
  {
    table: 'site_item_staffs',
    name: 'uq_site_item_staffs_item_staff',
    columns: ['site_item_id', 'staff_id'],
  },
  {
    table: 'user_roles',
    name: 'uq_user_roles_user_role',
    columns: ['user_id', 'role_id'],
  },
  {
    table: 'user_task_reports',
    name: 'uq_user_task_reports_task_name',
    columns: ['user_task_id', 'name'],
  },
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

async function columnExists(client, table, column) {
  const r = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [table, column],
  );
  return r.rowCount > 0;
}

async function getIdStats(client, table) {
  const counts = await client.query(
    `SELECT COUNT(*)::int AS total, COUNT(DISTINCT id)::int AS distinct_ids FROM public."${table}"`,
  );
  const row = counts.rows[0];
  const total = Number(row.total ?? 0);
  const distinctIds = Number(row.distinct_ids ?? 0);
  const pk = await client.query(
    `SELECT 1 FROM pg_constraint WHERE conrelid = $1::regclass AND contype = 'p' LIMIT 1`,
    [`public.${table}`],
  );
  return { total, distinctIds, hasPrimaryKey: pk.rowCount > 0 };
}

async function dedupeById(client, table) {
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
    await client.query(`DROP TABLE IF EXISTS public."${shadow}" CASCADE`);
    console.log(`Dropped shadow table ${shadow}`);
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
  if (await hasPrimaryKey(client, table)) return false;
  await client.query(`DROP INDEX IF EXISTS public."${constraint}"`);
  await client.query(
    `ALTER TABLE public."${table}" ADD CONSTRAINT "${constraint}" PRIMARY KEY (id)`,
  );
  return true;
}

async function hasUniqueConstraint(client, table, name) {
  const r = await client.query(
    `SELECT 1 FROM pg_constraint WHERE conrelid = $1::regclass AND conname = $2`,
    [`public.${table}`, name],
  );
  return r.rowCount > 0;
}

async function countCompositeDupes(client, table, columns) {
  const cols = columns.map((c) => `"${c}"`).join(', ');
  const r = await client.query(`
    SELECT COUNT(*)::int AS groups FROM (
      SELECT ${cols}, COUNT(*) AS c FROM public."${table}"
      GROUP BY ${cols} HAVING COUNT(*) > 1
    ) x
  `);
  return r.rows[0]?.groups ?? 0;
}

async function dedupeCompositeKeepMinCtid(client, table, columns) {
  const cols = columns.map((c) => `"${c}"`).join(', ');
  const r = await client.query(`
    DELETE FROM public."${table}" t
    WHERE t.ctid NOT IN (
      SELECT DISTINCT ON (${cols}) ctid
      FROM public."${table}"
      ORDER BY ${cols}, ctid
    )
  `);
  return r.rowCount;
}

async function ensureUnique(client, spec) {
  const { table, name, columns, optional } = spec;
  if (!(await tableExists(client, table))) {
    console.log(`[skip] ${table} — not found`);
    return;
  }
  for (const col of columns) {
    if (!(await columnExists(client, table, col))) {
      if (optional) {
        console.log(`[skip] ${name} — column ${col} missing on ${table}`);
        return;
      }
      throw new Error(`${table}.${col} missing — cannot add ${name}`);
    }
  }
  if (await hasUniqueConstraint(client, table, name)) {
    console.log(`OK ${name} (already exists)`);
    return;
  }
  const dupGroups = await countCompositeDupes(client, table, columns);
  if (dupGroups > 0) {
    const deleted = await dedupeCompositeKeepMinCtid(client, table, columns);
    console.log(`Deduped ${deleted} row(s) on ${table} for ${name}`);
    const left = await countCompositeDupes(client, table, columns);
    if (left > 0) {
      throw new Error(`${table}: ${left} duplicate group(s) remain for ${columns.join(', ')}`);
    }
  }
  const colList = columns.map((c) => `"${c}"`).join(', ');
  await client.query(
    `ALTER TABLE public."${table}" ADD CONSTRAINT "${name}" UNIQUE (${colList})`,
  );
  console.log(`Added UNIQUE ${name} ON ${table} (${columns.join(', ')})`);
}

/** Remove integrity constraints from legacy `*2` tables (e.g. users2). */
async function cleanupLegacySuffix2Tables(client) {
  const r = await client.query(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename ~ '2$'
  `);
  for (const { tablename } of r.rows) {
    const cons = await client.query(
      `SELECT conname FROM pg_constraint
       WHERE conrelid = $1::regclass AND contype = 'u' AND conname LIKE 'uq_%'`,
      [`public.${tablename}`],
    );
    for (const { conname } of cons.rows) {
      await client.query(
        `ALTER TABLE public."${tablename}" DROP CONSTRAINT IF EXISTS "${conname}"`,
      );
      console.log(`Dropped ${conname} on ${tablename} (legacy *2 table — excluded)`);
    }
  }
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
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DB_NAME || 'service360',
    ssl: sslOption(),
  });

  await client.connect();
  console.log(`Connected: ${client.database}@${client.host}\n`);

  console.log('=== Primary keys ===');
  for (const { table, constraint } of PK_TABLES) {
    if (isLegacySuffix2Table(table)) {
      console.log(`[skip] ${table} — legacy *2 table`);
      continue;
    }
    if (!(await tableExists(client, table))) {
      console.log(`[skip] ${table}`);
      continue;
    }
    const s = await getIdStats(client, table);
    console.log(
      `${table}: rows=${s.total} distinct_id=${s.distinctIds} PK=${s.hasPrimaryKey ? 'yes' : 'NO'}`,
    );
  }

  console.log('\n=== Unique constraints ===');
  for (const spec of UNIQUE_CONSTRAINTS) {
    if (isLegacySuffix2Table(spec.table)) continue;
    if (!(await tableExists(client, spec.table))) {
      console.log(`[skip] ${spec.name} — ${spec.table} not found`);
      continue;
    }
    const exists = await hasUniqueConstraint(client, spec.table, spec.name);
    const dupes = await countCompositeDupes(client, spec.table, spec.columns);
    console.log(
      `${spec.name} on ${spec.table}: exists=${exists ? 'yes' : 'no'} duplicate_groups=${dupes}`,
    );
  }

  if (!apply) {
    console.log('\nDry-run. Apply: node scripts/apply-unique-constraints.js --apply --record-patch');
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
    await cleanupLegacySuffix2Tables(client);

    for (const { table, constraint } of PK_TABLES) {
      if (isLegacySuffix2Table(table) || !(await tableExists(client, table))) continue;
      const before = await getIdStats(client, table);
      if (before.total > before.distinctIds) {
        const n = await dedupeById(client, table);
        console.log(`Deleted ${n} duplicate id row(s) from ${table}`);
      }
      const added = await ensurePrimaryKey(client, table, constraint);
      if (added) console.log(`Added PRIMARY KEY ${constraint} on ${table}`);
      await resetSequence(client, table);
      const after = await getIdStats(client, table);
      if (after.total !== after.distinctIds) {
        throw new Error(`${table}: duplicate ids remain`);
      }
    }

    for (const spec of UNIQUE_CONSTRAINTS) {
      if (isLegacySuffix2Table(spec.table)) continue;
      await ensureUnique(client, spec);
    }

    if (recordPatch) {
      await client.query(
        `INSERT INTO public.schema_patches_applied (name) VALUES ($1) ON CONFLICT DO NOTHING`,
        [PATCH_NAME],
      );
    }
    await client.query('COMMIT');
    console.log('\nDone. Verify: npm run db:check');
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
