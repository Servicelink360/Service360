/**
 * Remove testuser (users.id 141) from service360.
 * Usage: node scripts/remove-testuser.js [--dry-run]
 */
/* eslint-disable no-console */
const path = require('path');
const dotenv = require('dotenv');
const { Client } = require('pg');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const TARGET_ID = 141;
const DRY_RUN = process.argv.includes('--dry-run');

const USER_REF_COLUMNS = ['user_id', 'staff_id', 'customer_id', 'created_by', 'updated_by'];

async function findRefs(client, userId) {
  const tables = await client.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`,
  );
  const refs = [];
  for (const { table_name: table } of tables.rows) {
    if (table === 'users') continue;
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

async function main() {
  const client = new Client({
    host: process.env.DATABASE_HOST,
    port: +process.env.DATABASE_PORT,
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DB_NAME,
  });
  await client.connect();

  const user = await client.query(
    `SELECT id, username, email, type, status FROM public.users WHERE id = $1`,
    [TARGET_ID],
  );
  if (!user.rows.length) {
    console.log('No user with id', TARGET_ID);
    await client.end();
    return;
  }
  const row = user.rows[0];
  if (row.username !== 'testuser') {
    console.error('Refusing: id', TARGET_ID, 'is not testuser:', row);
    await client.end();
    process.exit(1);
  }

  const refs = await findRefs(client, TARGET_ID);
  if (refs.length) {
    console.error('Cannot delete: related rows still reference id', TARGET_ID);
    console.error(refs);
    await client.end();
    process.exit(1);
  }

  console.log('Will remove:', row, DRY_RUN ? '(dry-run)' : '');

  const childDeletes = [
    ['staff', `DELETE FROM public.staff WHERE user_id = $1`],
    ['customers', `DELETE FROM public.customers WHERE user_id = $1`],
    ['user_roles', `DELETE FROM public.user_roles WHERE user_id = $1`],
    ['user_groups', `DELETE FROM public.user_groups WHERE user_id = $1`],
    ['user_tokens', `DELETE FROM public.user_tokens WHERE user_key = $1`],
  ];

  if (!DRY_RUN) await client.query('BEGIN');
  try {
    for (const [label, sql] of childDeletes) {
      if (DRY_RUN) continue;
      try {
        const params = label === 'user_tokens' ? [String(TARGET_ID)] : [TARGET_ID];
        const r = await client.query(sql, params);
        if (r.rowCount > 0) console.log(`Deleted ${r.rowCount} from ${label}`);
      } catch (e) {
        if (e.code !== '42P01' && e.code !== '42703') throw e;
      }
    }
    if (DRY_RUN) {
      console.log('Would DELETE FROM users WHERE id =', TARGET_ID);
    } else {
      const r = await client.query(`DELETE FROM public.users WHERE id = $1`, [TARGET_ID]);
      console.log('Deleted users rows:', r.rowCount);
      await client.query('COMMIT');
    }
    console.log(DRY_RUN ? 'Dry run complete.' : 'testuser removed.');
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
