/**
 * Import users, sites, site_items, staff assignments from MySQL dump (25_05_2026.sql)
 * into local Postgres (service360). Maps legacy Service codes → numeric SERVICES.id.
 *
 * Usage:
 *   node scripts/import-from-mysql-dump.js "C:\\app_pc\\25_05_2026.sql"
 *   node scripts/import-from-mysql-dump.js "C:\\app_pc\\25_05_2026.sql" --staff-email=a1arborist@outlook.com
 */
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Client } = require('pg');

for (const p of [path.join(process.cwd(), '.env'), path.join(__dirname, '..', '.env')]) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

const LEGACY_DEPT_MAP = {
  ADHOCCLEANING: 'Adhoc Cleaning',
  ENDOFYEARCLEANING: 'End of Year Cleaning',
  GARDENINGMAINTENANCE: 'Ground Maintenance',
  GENERALCLEANING: 'General Cleaning',
  PUBLICAMENITIESCLEANING: 'Public Amenities Cleaning',
  ROOFANDGUTTERCLEANING: 'Roof and Gutter Cleaning',
};

function parseArgs() {
  const dumpPath = process.argv[2];
  if (!dumpPath) {
    console.error('Usage: node scripts/import-from-mysql-dump.js <path-to.sql> [--staff-email=...]');
    process.exit(1);
  }
  const staffEmail = (process.argv.find((a) => a.startsWith('--staff-email=')) || '')
    .split('=')[1] || 'a1arborist@outlook.com';
  return { dumpPath: path.resolve(dumpPath), staffEmail };
}

/** Parse MySQL INSERT INTO `table` (...) VALUES (...),(...); (multi-line; descriptions may contain ';') */
function parseInsertBlock(sql, tableName) {
  const marker = `INSERT INTO \`${tableName}\``;
  const insStart = sql.indexOf(marker);
  if (insStart < 0) return [];

  const colStart = sql.indexOf('(', insStart);
  const colEnd = sql.indexOf(')', colStart);
  const columns = sql
    .slice(colStart + 1, colEnd)
    .split(',')
    .map((c) => c.trim().replace(/`/g, ''));

  const valuesIdx = sql.indexOf('VALUES', colEnd);
  if (valuesIdx < 0) return [];
  let bodyStart = valuesIdx + 6;
  let bodyEnd = -1;
  let searchFrom = bodyStart;
  while (searchFrom < sql.length) {
    const idx = sql.indexOf(');', searchFrom);
    if (idx < 0) break;
    const tail = sql.slice(idx + 2, idx + 40);
    if (/^\s*(\r?\n\s*(\r?\n|--|CREATE)|$)/.test(tail)) {
      bodyEnd = idx;
      break;
    }
    searchFrom = idx + 2;
  }
  if (bodyEnd < 0) return [];
  const valuesBlob = sql.slice(bodyStart, bodyEnd).trim();
  const rows = [];
  let depth = 0;
  let tupleStart = -1;
  for (let i = 0; i < valuesBlob.length; i++) {
    const ch = valuesBlob[i];
    if (ch === '(') {
      if (depth === 0) tupleStart = i + 1;
      depth++;
    } else if (ch === ')') {
      depth--;
      if (depth === 0 && tupleStart >= 0) {
        rows.push(parseTuple(valuesBlob.slice(tupleStart, i), columns));
        tupleStart = -1;
      }
    }
  }
  return rows;
}

function parseTuple(inner, columns) {
  const values = [];
  let cur = '';
  let inStr = false;
  let esc = false;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (esc) {
      cur += ch;
      esc = false;
      continue;
    }
    if (ch === '\\') {
      esc = true;
      cur += ch;
      continue;
    }
    if (ch === "'") {
      inStr = !inStr;
      cur += ch;
      continue;
    }
    if (!inStr && ch === ',') {
      values.push(parseValue(cur.trim()));
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.length) values.push(parseValue(cur.trim()));
  const row = {};
  columns.forEach((col, idx) => {
    row[col] = values[idx];
  });
  return row;
}

function parseValue(raw) {
  if (raw === 'NULL') return null;
  if (raw.startsWith("'") && raw.endsWith("'")) {
    return raw.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, '\\');
  }
  const n = Number(raw);
  return Number.isNaN(n) ? raw : n;
}

async function ensureSERVICES(client) {
  const idByLegacy = {};
  for (const [legacy, name] of Object.entries(LEGACY_DEPT_MAP)) {
    let r = await client.query(`SELECT id, name FROM SERVICES WHERE name = $1 LIMIT 1`, [name]);
    if (!r.rows.length) {
      r = await client.query(
        `INSERT INTO SERVICES (name, description, created_by, updated_by, created_at, updated_at)
         VALUES ($1, $1, 1, 1, NOW(), NOW()) RETURNING id, name`,
        [name],
      );
      console.log(`  + Service: ${name} (id ${r.rows[0].id})`);
    }
    idByLegacy[legacy] = r.rows[0].id;
  }
  return idByLegacy;
}

async function upsertUser(client, row) {
  const existing = await client.query(
    `SELECT id FROM users WHERE email = $1 OR username = $2 LIMIT 1`,
    [row.email, row.username],
  );
  const fields = {
    username: row.username,
    email: row.email,
    password: row.password,
    full_name: row.full_name,
    status: row.status,
    last_login: row.last_login,
    last_version: row.last_version,
    type: row.type,
    created_at: row.created_at,
    updated_at: row.updated_at,
    created_by: row.created_by ?? 1,
    updated_by: row.updated_by ?? 1,
    avatar: row.avatar,
    phone: row.phone,
    gender: row.gender,
    dob: row.dob,
    address: row.address,
    first_name: row.first_name,
    last_name: row.last_name,
    position: row.position,
    allow_delete: row.allow_delete ?? 2,
  };
  if (existing.rows.length) {
    const id = existing.rows[0].id;
    await client.query(
      `UPDATE users SET
        username=$2, email=$3, password=$4, full_name=$5, status=$6,
        last_login=$7, last_version=$8, type=$9, updated_at=$10,
        phone=$11, gender=$12, first_name=$13, last_name=$14, position=$15, allow_delete=$16
       WHERE id=$1`,
      [
        id,
        fields.username,
        fields.email,
        fields.password,
        fields.full_name,
        fields.status,
        fields.last_login,
        fields.last_version,
        fields.type,
        fields.updated_at,
        fields.phone,
        fields.gender,
        fields.first_name,
        fields.last_name,
        fields.position,
        fields.allow_delete,
      ],
    );
    return id;
  }
  const ins = await client.query(
    `INSERT INTO users (
      username, email, password, full_name, status, last_login, last_version, type,
      created_at, updated_at, created_by, updated_by, avatar, phone, gender, dob, address,
      first_name, last_name, position, allow_delete
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
    RETURNING id`,
    [
      fields.username,
      fields.email,
      fields.password,
      fields.full_name,
      fields.status,
      fields.last_login,
      fields.last_version,
      fields.type,
      fields.created_at,
      fields.updated_at,
      fields.created_by,
      fields.updated_by,
      fields.avatar,
      fields.phone,
      fields.gender,
      fields.dob,
      fields.address,
      fields.first_name,
      fields.last_name,
      fields.position,
      fields.allow_delete,
    ],
  );
  return ins.rows[0].id;
}

async function upsertSite(client, row) {
  const existing = await client.query(`SELECT id FROM sites WHERE id = $1`, [row.id]);
  if (existing.rows.length) {
    await client.query(
      `UPDATE sites SET name=$2, location=$3, address_name=$4, description=$5,
        check_in_distance=$6, updated_at=$7, updated_by=$8 WHERE id=$1`,
      [
        row.id,
        row.name,
        row.location,
        row.address_name,
        row.description,
        row.check_in_distance ?? 500,
        row.updated_at,
        row.updated_by ?? 1,
      ],
    );
    return row.id;
  }
  await client.query(
    `INSERT INTO sites (id, name, location, address_name, description, check_in_distance,
      created_by, updated_by, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      row.id,
      row.name,
      row.location,
      row.address_name,
      row.description,
      row.check_in_distance ?? 500,
      row.created_by ?? 1,
      row.updated_by ?? 1,
      row.created_at,
      row.updated_at,
    ],
  );
  return row.id;
}

async function upsertSiteItem(client, row, deptIdByLegacy) {
  const serviceId = deptIdByLegacy[row.service_id] ?? null;
  if (!serviceId) {
    console.warn(`  skip site_item ${row.id}: unknown Service ${row.service_id}`);
    return null;
  }
  const existing = await client.query(`SELECT id FROM site_items WHERE id = $1`, [row.id]);
  const companyId = null;
  if (existing.rows.length) {
    await client.query(
      `UPDATE site_items SET site_id=$2, service_id=$3, customer_id=$4, created_at=$5
       WHERE id=$1`,
      [row.id, row.site_id, serviceId, row.customer_id, row.created_at],
    );
    return row.id;
  }
  await client.query(
    `INSERT INTO site_items (id, site_id, service_id, customer_id, company_id, created_at)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [row.id, row.site_id, serviceId, row.customer_id, companyId, row.created_at],
  );
  return row.id;
}

async function syncSequences(client, table) {
  await client.query(`
    SELECT setval(pg_get_serial_sequence('public.${table}', 'id'),
      GREATEST((SELECT COALESCE(MAX(id), 1) FROM public.${table}), 1), true)
  `);
}

async function main() {
  const { dumpPath, staffEmail } = parseArgs();
  const sql = fs.readFileSync(dumpPath, 'utf8');

  const users = parseInsertBlock(sql, 'users');
  const sites = parseInsertBlock(sql, 'sites');
  const siteItems = parseInsertBlock(sql, 'site_items');
  const siteItemStaffs = parseInsertBlock(sql, 'site_item_staffs');
  const shifts = parseInsertBlock(sql, 'site_item_staff_shifts');
  const customers = parseInsertBlock(sql, 'customers');
  const staffRows = parseInsertBlock(sql, 'staff');

  const aboDump = users.find(
    (u) => u.email === staffEmail || u.full_name === 'Abo Taleb',
  );
  if (!aboDump) {
    console.error(`Staff not found in dump: ${staffEmail}`);
    process.exit(1);
  }

  const staffSiteItemIds = new Set(
    siteItemStaffs.filter((s) => s.staff_id === aboDump.id).map((s) => s.site_item_id),
  );
  const siteIdsForAbo = new Set(
    siteItems.filter((si) => staffSiteItemIds.has(si.id)).map((si) => si.site_id),
  );

  console.log(`Dump: ${users.length} users, ${sites.length} sites, ${siteItems.length} site_items`);
  console.log(`Abo Taleb (dump id ${aboDump.id}): ${staffSiteItemIds.size} assignments, ${siteIdsForAbo.size} sites`);

  const client = new Client({
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DB_NAME || 'service360',
  });
  await client.connect();
  await client.query('BEGIN');

  try {
    console.log('\n1) SERVICES (incl. Ground Maintenance)...');
    const deptIdByLegacy = await ensureSERVICES(client);

    console.log('\n2) Users from dump...');
    const userIdMap = {};
    for (const u of users) {
      const newId = await upsertUser(client, u);
      userIdMap[u.id] = newId;
    }
    const aboPgId = userIdMap[aboDump.id];
    console.log(`  Abo Taleb → users.id ${aboPgId} (${aboDump.email})`);

    console.log('\n2b) Customer profiles...');
    for (const cu of customers) {
      await client.query(
        `INSERT INTO customers (user_id, city, state, post_code, country, website, description,
          send_login_info, show_qr_code, company_name, company_phone, company_email)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (user_id) DO UPDATE SET
           company_name = EXCLUDED.company_name,
           company_phone = EXCLUDED.company_phone,
           company_email = EXCLUDED.company_email,
           description = EXCLUDED.description`,
        [
          cu.user_id,
          cu.city,
          cu.state,
          cu.post_code,
          cu.country,
          cu.website,
          cu.description,
          cu.send_login_info,
          cu.show_qr_code,
          cu.company_name,
          cu.company_phone,
          cu.company_email,
        ],
      );
    }
    console.log(`  ${customers.length} customers`);

    console.log('\n2c) Staff profiles...');
    let staffOk = 0;
    for (const st of staffRows) {
      const uid = userIdMap[st.user_id] ?? st.user_id;
      const exists = await client.query(`SELECT 1 FROM users WHERE id = $1 AND type = 2`, [uid]);
      if (!exists.rows.length) continue;
      await client.query(
        `INSERT INTO staff (user_id, start_date, ratings, company_name)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (user_id) DO UPDATE SET
           start_date = EXCLUDED.start_date,
           ratings = EXCLUDED.ratings,
           company_name = EXCLUDED.company_name`,
        [uid, st.start_date, st.ratings, st.company_name],
      );
      staffOk++;
    }
    console.log(`  ${staffOk} staff rows`);

    console.log('\n3) Sites (all from dump)...');
    let siteCount = 0;
    for (const s of sites) {
      await upsertSite(client, s);
      siteCount++;
    }
    console.log(`  upserted ${siteCount} sites`);

    console.log('\n4) Site items...');
    let itemCount = 0;
    for (const si of siteItems) {
      const id = await upsertSiteItem(client, si, deptIdByLegacy);
      if (id) itemCount++;
    }
    console.log(`  upserted ${itemCount} site_items`);

    console.log('\n5) Staff assignments for Abo + related site_item_staff rows...');
    const aboAssignments = siteItemStaffs.filter((s) => s.staff_id === aboDump.id);
    const sisIdMap = {};
    for (const a of aboAssignments) {
      const pgStaffId = userIdMap[aboDump.id] ?? aboPgId;
      let existing = await client.query(
        `SELECT id FROM site_item_staffs WHERE site_item_id = $1 AND staff_id = $2`,
        [a.site_item_id, pgStaffId],
      );
      let sisId;
      if (existing.rows.length) {
        sisId = existing.rows[0].id;
      } else {
        const ins = await client.query(
          `INSERT INTO site_item_staffs (site_item_id, staff_id, created_at)
           VALUES ($1,$2,$3) RETURNING id`,
          [a.site_item_id, pgStaffId, a.created_at],
        );
        sisId = ins.rows[0].id;
      }
      sisIdMap[a.id] = sisId;
    }
    console.log(`  ${aboAssignments.length} site_item_staffs for Abo`);

    console.log('\n6) Shifts for Abo assignments...');
    let shiftCount = 0;
    for (const sh of shifts) {
      const pgSisId = sisIdMap[sh.site_item_staff_id];
      if (!pgSisId) continue;
      const ex = await client.query(
        `SELECT id FROM site_item_staff_shifts
         WHERE site_item_staff_id = $1 AND start_time = $2 AND end_time = $3 LIMIT 1`,
        [pgSisId, sh.start_time, sh.end_time],
      );
      if (ex.rows.length) continue;
      await client.query(
        `INSERT INTO site_item_staff_shifts (site_item_staff_id, start_time, end_time, type, type_value)
         VALUES ($1,$2,$3,$4,$5)`,
        [pgSisId, sh.start_time, sh.end_time, sh.type, sh.type_value ?? ''],
      );
      shiftCount++;
    }
    console.log(`  inserted ${shiftCount} shifts`);

    for (const table of ['SERVICES', 'users', 'sites', 'site_items', 'site_item_staffs', 'site_item_staff_shifts']) {
      await syncSequences(client, table);
    }

    await client.query('COMMIT');

    const verify = await client.query(
      `SELECT COUNT(DISTINCT si.site_id)::int AS sites
       FROM site_item_staffs sis
       JOIN site_items si ON si.id = sis.site_item_id
       JOIN users u ON u.id = sis.staff_id
       WHERE u.email = $1`,
      [staffEmail],
    );
    console.log(`\nDone. Abo Taleb linked to ${verify.rows[0].sites} sites in Postgres.`);
    console.log('Restart API + admin, then check Job Sites.');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
