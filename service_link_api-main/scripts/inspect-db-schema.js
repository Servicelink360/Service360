/**
 * Print live Postgres column metadata for tables used by custom reports.
 * Uses DATABASE_* from .env (same as Nest database.module).
 *
 * Usage (from service_link_api-main):
 *   node scripts/inspect-db-schema.js
 *   node scripts/inspect-db-schema.js user_tasks user_task_reports sites
 *
 * Optional: DATABASE_SSL=true for providers that require SSL.
 */
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Client } = require('pg');

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

const tables =
  process.argv.slice(2).length > 0
    ? process.argv.slice(2)
    : ['user_tasks', 'user_task_reports'];

function sslOption() {
  const raw = String(process.env.DATABASE_SSL ?? '').trim().toLowerCase();
  if (raw === '1' || raw === 'true' || raw === 'yes') {
    return { rejectUnauthorized: false };
  }
  return undefined;
}

async function main() {
  const host = process.env.DATABASE_HOST;
  const user = process.env.DATABASE_USERNAME;
  const database = process.env.DATABASE_DB_NAME || 'servicelink360';
  const port = parseInt(process.env.DATABASE_PORT || '5432', 10);
  if (!host || !user) {
    console.error('Missing DATABASE_HOST or DATABASE_USERNAME in .env');
    process.exit(1);
  }

  const client = new Client({
    host,
    port,
    user,
    password: process.env.DATABASE_PASSWORD,
    database,
    ssl: sslOption(),
  });

  await client.connect();
  console.log('Connected:', { host, port, database, user });

  for (const table of tables) {
    const fq = `public.${table}`;
    console.log(`\n========== ${fq} ==========`);

    const cols = await client.query(
      `
      SELECT
        ordinal_position AS pos,
        column_name,
        data_type,
        udt_name,
        is_nullable,
        column_default,
        character_maximum_length AS char_len,
        numeric_precision,
        numeric_scale,
        is_identity,
        identity_generation
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `,
      [table],
    );
    if (!cols.rows.length) {
      console.log('(no columns — table missing in schema public?)');
      continue;
    }
    console.table(cols.rows);

    const seq = await client.query(`SELECT pg_get_serial_sequence($1, 'id') AS seq`, [fq]);
    console.log('pg_get_serial_sequence:', seq.rows[0]);

    const pk = await client.query(
      `
      SELECT tc.constraint_name, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public'
        AND tc.table_name = $1
        AND tc.constraint_type = 'PRIMARY KEY'
      ORDER BY kcu.ordinal_position
    `,
      [table],
    );
    console.log('PRIMARY KEY:', pk.rows);

    const nn = await client.query(
      `
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
        AND is_nullable = 'NO'
        AND column_default IS NULL
      ORDER BY ordinal_position
    `,
      [table],
    );
    console.log('NOT NULL columns with no default (must be supplied on INSERT):', nn.rows);
  }

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
