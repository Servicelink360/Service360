/**
 * Move a user to a new users.id and remap all related rows.
 * Usage: node scripts/move-user-id.js <fromId> <toId> [--dry-run]
 */
/* eslint-disable no-console */
const path = require('path');
const dotenv = require('dotenv');
const { Client } = require('pg');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const FROM_ID = parseInt(process.argv[2], 10);
const TO_ID = parseInt(process.argv[3], 10);
const DRY_RUN = process.argv.includes('--dry-run');

const USER_REF_COLUMNS = ['user_id', 'staff_id', 'customer_id', 'created_by', 'updated_by'];
const SKIP_REF_TABLES = new Set(['staff', 'customers', 'user_roles', 'user_groups']);

async function getColumns(client, table) {
  const r = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
    [table],
  );
  return r.rows.map((x) => x.column_name);
}

async function findRefs(client, userId) {
  const tables = await client.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`,
  );
  const refs = [];
  for (const { table_name: table } of tables.rows) {
    if (table === 'users' || SKIP_REF_TABLES.has(table)) continue;
    const cols = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1 AND column_name = ANY($2::text[])`,
      [table, USER_REF_COLUMNS],
    );
    for (const { column_name: column } of cols.rows) {
      const r = await client.query(
        `SELECT COUNT(*)::int AS c FROM public."${table}" WHERE "${column}" = $1`,
        [userId],
      );
      if (+r.rows[0].c > 0) refs.push({ table, column, count: r.rows[0].c });
    }
  }
  return refs;
}

async function tableExists(client, table) {
  const r = await client.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [table],
  );
  return r.rows.length > 0;
}

async function copyOneToOne(client, table, fromId, toId) {
  const cols = await getColumns(client, table);
  if (!cols.includes('user_id')) return 0;
  const dataCols = cols.filter((c) => c !== 'user_id');
  const selectList = dataCols.map((c) => `"${c}"`).join(', ');
  const insertCols = ['user_id', ...dataCols].map((c) => `"${c}"`).join(', ');
  const r = await client.query(
    `INSERT INTO public."${table}" (${insertCols})
     SELECT $2, ${selectList} FROM public."${table}" WHERE user_id = $1`,
    [fromId, toId],
  );
  return r.rowCount;
}

async function main() {
  if (!FROM_ID || !TO_ID || FROM_ID === TO_ID) {
    console.error('Usage: node scripts/move-user-id.js <fromId> <toId> [--dry-run]');
    process.exit(1);
  }

  const client = new Client({
    host: process.env.DATABASE_HOST,
    port: +process.env.DATABASE_PORT,
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DB_NAME,
  });
  await client.connect();

  const fromUser = await client.query(`SELECT * FROM public.users WHERE id = $1`, [FROM_ID]);
  if (!fromUser.rows.length) {
    console.error('Source user not found:', FROM_ID);
    process.exit(1);
  }

  const toTaken = await client.query(`SELECT id, username FROM public.users WHERE id = $1`, [TO_ID]);
  if (toTaken.rows.length) {
    console.error('Target id already in use:', toTaken.rows[0]);
    process.exit(1);
  }

  const refs = await findRefs(client, FROM_ID);
  console.log('Move', fromUser.rows[0].username, `${FROM_ID} -> ${TO_ID}`, DRY_RUN ? '(dry-run)' : '');
  for (const u of refs) console.log(`  ${u.table}.${u.column}: ${u.count}`);

  if (!DRY_RUN) await client.query('BEGIN');
  try {
    if (DRY_RUN) {
      console.log(`Would copy users -> id ${TO_ID}, copy staff/customers/roles/groups, remap refs, delete id ${FROM_ID}`);
    } else {
      const orig = fromUser.rows[0];
      const tempUsername = `__move_${FROM_ID}_${Date.now()}`;
      await client.query(`UPDATE public.users SET username = $2 WHERE id = $1`, [
        FROM_ID,
        tempUsername,
      ]);

      const userCols = await getColumns(client, 'users');
      const insertCols = userCols.map((c) => `"${c}"`).join(', ');
      const selectCols = userCols
        .map((c) => {
          if (c === 'id') return `$2::int`;
          if (c === 'username') return `$3`;
          return `"${c}"`;
        })
        .join(', ');
      await client.query(
        `INSERT INTO public.users (${insertCols}) SELECT ${selectCols} FROM public.users WHERE id = $1`,
        [FROM_ID, TO_ID, orig.username],
      );
      console.log('Inserted users id', TO_ID);

      for (const table of ['staff', 'customers', 'user_roles', 'user_groups']) {
        if (!(await tableExists(client, table))) continue;
        const n = await copyOneToOne(client, table, FROM_ID, TO_ID);
        if (n > 0) console.log(`Copied ${table}:`, n);
      }

      for (const { table, column, count } of refs) {
        await client.query(
          `UPDATE public."${table}" SET "${column}" = $2 WHERE "${column}" = $1`,
          [FROM_ID, TO_ID],
        );
        console.log(`Updated ${table}.${column}: ${count}`);
      }

      try {
        const t = await client.query(
          `UPDATE public.user_tokens SET user_key = $2 WHERE user_key = $1`,
          [String(FROM_ID), String(TO_ID)],
        );
        if (t.rowCount > 0) console.log('Updated user_tokens:', t.rowCount);
      } catch (e) {
        if (e.code !== '42P01') throw e;
      }

      for (const table of ['user_groups', 'user_roles', 'staff', 'customers']) {
        if (!(await tableExists(client, table))) continue;
        const r = await client.query(`DELETE FROM public."${table}" WHERE user_id = $1`, [FROM_ID]);
        if (r.rowCount > 0) console.log(`Removed old ${table}:`, r.rowCount);
      }

      await client.query(`DELETE FROM public.users WHERE id = $1`, [FROM_ID]);
      console.log('Removed users id', FROM_ID);

      await client.query(
        `SELECT setval(pg_get_serial_sequence('public.users', 'id'), (SELECT COALESCE(MAX(id), 1) FROM public.users))`,
      );
      await client.query('COMMIT');
    }

    const verify = await client.query(
      `SELECT u.id, u.username, u.email, s.company_name
       FROM public.users u
       LEFT JOIN public.staff s ON s.user_id = u.id
       WHERE u.id = $1`,
      [TO_ID],
    );
    console.log('\nResult:', verify.rows[0] || (DRY_RUN ? '(not moved yet)' : 'missing'));
    console.log(DRY_RUN ? 'Dry run complete.' : 'Move complete.');
  } catch (e) {
    if (!DRY_RUN) await client.query('ROLLBACK');
    throw e;
  }

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
