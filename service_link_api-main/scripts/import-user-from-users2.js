/**
 * Import one user from public.users2 into public.users and related data.
 *
 * Usage (from service_link_api-main):
 *   node scripts/import-user-from-users2.js Abo
 *   node scripts/import-user-from-users2.js Abo --dry-run
 */
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Client } = require('pg');

const envPaths = [path.join(process.cwd(), '.env'), path.join(__dirname, '..', '.env')];
for (const p of envPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

const USERNAME = (process.argv[2] || 'Abo').trim();
const DRY_RUN = process.argv.includes('--dry-run');

/** userType: STAFF=2, CUSTOMER=1, ADMIN=3 */
const USER_TYPE = { CUSTOMER: 1, STAFF: 2, ADMIN: 3 };

const USER_REF_COLUMNS = ['user_id', 'staff_id', 'customer_id', 'created_by', 'updated_by'];

function sslOption() {
  const raw = String(process.env.DATABASE_SSL ?? '').trim().toLowerCase();
  if (raw === '1' || raw === 'true' || raw === 'yes') return { rejectUnauthorized: false };
  return undefined;
}

async function getColumns(client, table) {
  const r = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
    [table],
  );
  return r.rows.map((x) => x.column_name);
}

async function findUserRefUpdates(client, legacyId) {
  const tables = await client.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name != 'users2'
     ORDER BY table_name`,
  );
  const updates = [];
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
        [legacyId],
      );
      const c = +r.rows[0].c;
      if (c > 0) updates.push({ table, column, count: c });
    }
  }
  return updates;
}

async function main() {
  if (!USERNAME) {
    console.error('Usage: node scripts/import-user-from-users2.js <username> [--dry-run]');
    process.exit(1);
  }

  const client = new Client({
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DB_NAME || 'service360',
    ssl: sslOption(),
  });

  await client.connect();
  console.log('Database:', process.env.DATABASE_DB_NAME);
  console.log('Import:', USERNAME, DRY_RUN ? '(dry-run)' : '');

  const src = await client.query(
    `SELECT DISTINCT ON (id) * FROM public.users2
     WHERE LOWER(username) = LOWER($1)
     ORDER BY id`,
    [USERNAME],
  );
  if (!src.rows.length) {
    console.error('Not found in users2:', USERNAME);
    await client.end();
    process.exit(1);
  }
  const legacy = src.rows[0];
  const legacyId = +legacy.id;

  const dup = await client.query(
    `SELECT id, username, email FROM public.users
     WHERE LOWER(username) = LOWER($1) OR (email IS NOT NULL AND email = $2)`,
    [USERNAME, legacy.email],
  );
  if (dup.rows.length) {
    console.log('Already in users:', dup.rows[0]);
    await client.end();
    process.exit(0);
  }

  const idTaken = await client.query(`SELECT id, username FROM public.users WHERE id = $1`, [legacyId]);
  let newUserId = legacyId;
  if (idTaken.rows.length) {
    const next = await client.query(`SELECT COALESCE(MAX(id), 0) + 1 AS n FROM public.users`);
    newUserId = +next.rows[0].n;
    console.log(`users.id ${legacyId} is "${idTaken.rows[0].username}"; new id = ${newUserId}`);
  } else {
    console.log(`users.id = ${newUserId}`);
  }

  const userCols = await getColumns(client, 'users');
  const row = {};
  for (const col of userCols) {
    if (col === 'id') row.id = newUserId;
    else if (Object.prototype.hasOwnProperty.call(legacy, col)) row[col] = legacy[col];
  }
  if (row.allow_delete == null) row.allow_delete = 2;
  if (row.type == null) row.type = USER_TYPE.STAFF;

  const refUpdates = await findUserRefUpdates(client, legacyId);
  console.log('\nRelated rows to remap', legacyId, '->', newUserId, ':');
  for (const u of refUpdates) console.log(`  ${u.table}.${u.column}: ${u.count}`);

  if (!DRY_RUN) await client.query('BEGIN');

  try {
    if (DRY_RUN) {
      console.log('\nWould insert users:', {
        id: row.id,
        username: row.username,
        email: row.email,
        type: row.type,
        full_name: row.full_name,
      });
    } else {
      const placeholders = userCols.map((_, i) => `$${i + 1}`).join(', ');
      const values = userCols.map((c) => row[c]);
      await client.query(
        `INSERT INTO public.users (${userCols.join(', ')}) VALUES (${placeholders})`,
        values,
      );
      console.log('Inserted users id', newUserId);
    }

    const userType = +row.type;

    if (userType === USER_TYPE.STAFF) {
      const staffExists = await client.query(`SELECT 1 FROM public.staff WHERE user_id = $1`, [legacyId]);
      const hasStaff = staffExists.rows.length > 0;
      const companyName = legacy.position || legacy.full_name || legacy.username;
      const startDate = legacy.created_at || new Date();
      if (DRY_RUN) {
        console.log(
          hasStaff
            ? `Would copy staff row user_id ${legacyId} -> ${newUserId}`
            : `Would insert staff (company: ${companyName})`,
        );
      } else if (hasStaff) {
        await client.query(`UPDATE public.staff SET user_id = $2 WHERE user_id = $1`, [legacyId, newUserId]);
        console.log('Updated staff.user_id');
      } else {
        await client.query(
          `INSERT INTO public.staff (user_id, start_date, ratings, company_name) VALUES ($1, $2, $3, $4)`,
          [newUserId, startDate, 1, companyName],
        );
        console.log('Inserted staff for user', newUserId);
      }
    }

    if (userType === USER_TYPE.CUSTOMER) {
      const custExists = await client.query(`SELECT 1 FROM public.customers WHERE user_id = $1`, [legacyId]);
      if (DRY_RUN) {
        console.log(
          custExists.rows.length
            ? `Would update customers.user_id ${legacyId} -> ${newUserId}`
            : 'Would insert minimal customers row',
        );
      } else if (custExists.rows.length) {
        await client.query(`UPDATE public.customers SET user_id = $2 WHERE user_id = $1`, [legacyId, newUserId]);
        console.log('Updated customers.user_id');
      } else {
        const companyName = legacy.position || legacy.full_name || legacy.username;
        await client.query(
          `INSERT INTO public.customers (user_id, company_name, company_email, company_phone)
           VALUES ($1, $2, $3, $4)`,
          [newUserId, companyName, legacy.email, legacy.phone],
        );
        console.log('Inserted customers for user', newUserId);
      }
    }

    for (const { table, column, count } of refUpdates) {
      if (table === 'staff' && column === 'user_id') continue;
      if (table === 'customers' && column === 'user_id') continue;
      if (DRY_RUN) continue;
      await client.query(
        `UPDATE public."${table}" SET "${column}" = $2 WHERE "${column}" = $1`,
        [legacyId, newUserId],
      );
      console.log(`Updated ${table}.${column}: ${count}`);
    }

    if (!DRY_RUN) {
      await client.query(
        `SELECT setval(pg_get_serial_sequence('public.users', 'id'), (SELECT COALESCE(MAX(id), 1) FROM public.users))`,
      );
      await client.query('COMMIT');
    }

    const verify = await client.query(
      `SELECT u.id, u.username, u.email, u.type, s.company_name
       FROM public.users u
       LEFT JOIN public.staff s ON s.user_id = u.id
       WHERE u.id = $1`,
      [newUserId],
    );
    console.log('\nResult:', verify.rows[0]);
    console.log(DRY_RUN ? 'Dry run — no changes written.' : 'Import finished.');
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
