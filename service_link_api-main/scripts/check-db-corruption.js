/**
 * Database integrity / corruption checks for service360.
 * Usage: node scripts/check-db-corruption.js
 */
require('dotenv').config();
const { Client } = require('pg');
const { isLegacySuffix2Table } = require('./db-legacy-tables');

async function q(client, sql, params = []) {
  const r = await client.query(sql, params);
  return r.rows;
}

async function main() {
  const client = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: +(process.env.DATABASE_PORT || 5432),
    user: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DB_NAME || 'service360',
  });
  await client.connect();
  console.log(`Connected: ${client.database}@${client.host}\n`);

  const issues = [];

  // --- sites (known problem area) ---
  const sitesCounts = await q(
    client,
    `SELECT COUNT(*)::int AS total, COUNT(DISTINCT id)::int AS distinct_ids FROM sites`,
  );
  const sitesDup = await q(
    client,
    `SELECT id, COUNT(*)::int AS copies FROM sites GROUP BY id HAVING COUNT(*) > 1 ORDER BY copies DESC LIMIT 10`,
  );
  const sitesPk = await q(
    client,
    `SELECT 1 FROM pg_constraint WHERE conrelid = 'public.sites'::regclass AND contype = 'p'`,
  );
  console.log('=== sites ===');
  console.log(sitesCounts[0]);
  console.log('PRIMARY KEY:', sitesPk.length ? 'yes' : 'MISSING');
  if (sitesCounts[0].total !== sitesCounts[0].distinct_ids) {
    issues.push({
      severity: 'HIGH',
      area: 'sites',
      msg: `${sitesCounts[0].total - sitesCounts[0].distinct_ids} duplicate site row(s) (${sitesCounts[0].total} rows, ${sitesCounts[0].distinct_ids} ids)`,
    });
  }
  if (!sitesPk.length) {
    issues.push({ severity: 'HIGH', area: 'sites', msg: 'No PRIMARY KEY on sites.id' });
  }
  if (sitesDup.length) {
    console.log('Duplicate id samples:', sitesDup);
  }

  // --- tables missing primary key (public schema, user tables) ---
  const noPk = await q(
    client,
    `
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
      AND NOT EXISTS (
        SELECT 1 FROM pg_constraint con
        WHERE con.conrelid = c.oid AND con.contype = 'p'
      )
    ORDER BY 1
    `,
  );
  const noPkApp = noPk.filter((r) => !isLegacySuffix2Table(r.table_name));
  const noPkLegacy = noPk.filter((r) => isLegacySuffix2Table(r.table_name));
  console.log('\n=== Tables without PRIMARY KEY (app tables) ===');
  console.log(noPkApp.length ? noPkApp.map((r) => r.table_name).join(', ') : '(none)');
  if (noPkLegacy.length) {
    console.log('(ignored legacy *2 tables:', noPkLegacy.map((r) => r.table_name).join(', ') + ')');
  }

  // --- orphan FKs: child rows pointing to missing parents ---
  const orphanChecks = [
    {
      name: 'site_items → sites',
      sql: `SELECT COUNT(*)::int AS n FROM site_items si
            LEFT JOIN sites s ON s.id = si.site_id WHERE s.id IS NULL`,
    },
    {
      name: 'site_item_staffs → site_items',
      sql: `SELECT COUNT(*)::int AS n FROM site_item_staffs sis
            LEFT JOIN site_items si ON si.id = sis.site_item_id WHERE si.id IS NULL`,
    },
    {
      name: 'site_item_staffs → users (staff)',
      sql: `SELECT COUNT(*)::int AS n FROM site_item_staffs sis
            LEFT JOIN users u ON u.id = sis.staff_id WHERE u.id IS NULL`,
    },
    {
      name: 'tasks → site_items',
      sql: `SELECT COUNT(*)::int AS n FROM tasks t
            LEFT JOIN site_items si ON si.id = t.site_item_id WHERE si.id IS NULL`,
    },
    {
      name: 'user_tasks → users (staff)',
      sql: `SELECT COUNT(*)::int AS n FROM user_tasks ut
            LEFT JOIN users u ON u.id = ut.staff_id WHERE ut.staff_id IS NOT NULL AND ut.staff_id > 0 AND u.id IS NULL`,
    },
    {
      name: 'report_faults → sites',
      sql: `SELECT COUNT(*)::int AS n FROM report_faults rf
            LEFT JOIN sites s ON s.id = rf.site_id WHERE rf.site_id IS NOT NULL AND s.id IS NULL`,
    },
  ];

  console.log('\n=== Orphan references (should be 0) ===');
  for (const check of orphanChecks) {
    const row = await q(client, check.sql);
    const n = row[0]?.n ?? 0;
    console.log(`${check.name}: ${n}`);
    if (n > 0) {
      issues.push({ severity: 'HIGH', area: check.name, msg: `${n} orphan row(s)` });
    }
  }

  // --- duplicate site_items per (site_id, service_id, customer_id)? ---
  const dupSiteItems = await q(
    client,
    `
    SELECT site_id, service_id, customer_id, COUNT(*)::int AS copies
    FROM site_items
    GROUP BY site_id, service_id, customer_id
    HAVING COUNT(*) > 1
    ORDER BY copies DESC
    LIMIT 10
    `,
  );
  console.log('\n=== Duplicate site_items (same site+dept+customer) ===');
  console.log(dupSiteItems.length ? dupSiteItems : '(none in top 10)');

  // --- staff count: SQL vs assignments with deleted users ---
  const staffMismatch = await q(
    client,
    `
    SELECT s.id AS site_id, s.name,
      (SELECT COUNT(DISTINCT sis.staff_id)
       FROM site_item_staffs sis
       INNER JOIN site_items si ON si.id = sis.site_item_id
       INNER JOIN users st ON st.id = sis.staff_id AND st.status <> 4
       WHERE si.site_id = s.id) AS sql_active_staff,
      (SELECT COUNT(DISTINCT sis.staff_id)
       FROM site_item_staffs sis
       INNER JOIN site_items si ON si.id = sis.site_item_id
       WHERE si.site_id = s.id) AS sql_all_staff_ids,
      (SELECT COUNT(DISTINCT sis.staff_id)
       FROM site_item_staffs sis
       INNER JOIN site_items si ON si.id = sis.site_item_id
       LEFT JOIN users st ON st.id = sis.staff_id
       WHERE si.site_id = s.id AND (st.id IS NULL OR st.status = 4)) AS deleted_or_missing_staff
    FROM sites s
    WHERE EXISTS (
      SELECT 1 FROM site_items si2
      INNER JOIN site_item_staffs sis2 ON sis2.site_item_id = si2.id
      WHERE si2.site_id = s.id
    )
    AND (
      (SELECT COUNT(DISTINCT sis.staff_id)
       FROM site_item_staffs sis
       INNER JOIN site_items si ON si.id = sis.site_item_id
       INNER JOIN users st ON st.id = sis.staff_id AND st.status <> 4
       WHERE si.site_id = s.id)
      <>
      (SELECT COUNT(DISTINCT sis.staff_id)
       FROM site_item_staffs sis
       INNER JOIN site_items si ON si.id = sis.site_item_id
       WHERE si.site_id = s.id)
    )
    ORDER BY deleted_or_missing_staff DESC
    LIMIT 15
    `,
  );
  console.log('\n=== Sites where active staff count != raw assignment count ===');
  if (staffMismatch.length) {
    console.table(staffMismatch);
    issues.push({
      severity: 'MEDIUM',
      area: 'staff assignments',
      msg: `${staffMismatch.length}+ site(s) have staff_id rows pointing to deleted/missing users (UI may show fewer staff than sort SQL)`,
    });
  } else {
    console.log('(none — counts align)');
  }

  // --- NULL / invalid critical fields ---
  const nullSites = await q(
    client,
    `SELECT COUNT(*)::int AS n FROM sites WHERE name IS NULL OR TRIM(name) = ''`,
  );
  console.log('\n=== sites with empty name ===', nullSites[0].n);

  // --- sequence vs max(id) for serial tables ---
  const seqCheck = await q(
    client,
    `
    SELECT 'sites' AS tbl, pg_get_serial_sequence('sites','id') AS seq,
      (SELECT MAX(id) FROM sites) AS max_id
    UNION ALL
    SELECT 'site_items', pg_get_serial_sequence('site_items','id'), (SELECT MAX(id) FROM site_items)
    UNION ALL
    SELECT 'users', pg_get_serial_sequence('users','id'), (SELECT MAX(id) FROM users)
    `,
  );
  console.log('\n=== ID sequences (seq should be >= max_id) ===');
  for (const row of seqCheck) {
    if (!row.seq) {
      console.log(`${row.tbl}: no serial sequence, max_id=${row.max_id}`);
      continue;
    }
    const lastVal = await q(client, `SELECT last_value, is_called FROM ${row.seq.replace('public.', '')}`);
    const lv = lastVal[0];
    const behind = row.max_id && lv && BigInt(lv.last_value) < BigInt(row.max_id);
    console.log(
      `${row.tbl}: max_id=${row.max_id}, sequence last_value=${lv?.last_value}, is_called=${lv?.is_called}${behind ? ' ** BEHIND max_id **' : ''}`,
    );
    if (behind) {
      issues.push({
        severity: 'MEDIUM',
        area: row.tbl,
        msg: `Sequence ${row.seq} behind MAX(id) — new inserts may collide`,
      });
    }
  }

  // --- duplicate users email/username if unique expected ---
  const dupUsers = await q(
    client,
    `
    SELECT username, COUNT(*)::int AS n FROM users
    WHERE username IS NOT NULL AND username <> ''
    GROUP BY username HAVING COUNT(*) > 1
    LIMIT 5
    `,
  );
  console.log('\n=== Duplicate usernames ===');
  console.log(dupUsers.length ? dupUsers : '(none in sample)');

  // --- report_templates category (historical enum issue) ---
  const catCol = await q(
    client,
    `
    SELECT data_type, udt_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'report_templates' AND column_name = 'category'
    `,
  );
  console.log('\n=== report_templates.category ===', catCol[0] || 'column missing');

  const requiredUniques = [
    'uq_site_items_site_svc_customer',
    'uq_site_item_staffs_item_staff',
    'uq_user_roles_user_role',
    'uq_user_task_reports_task_name',
  ];
  const missingUnique = await q(
    client,
    `
    SELECT c.conname
    FROM (VALUES ${requiredUniques.map((n) => `('${n}')`).join(',')}) AS expected(name)
    LEFT JOIN pg_constraint c ON c.conname = expected.name
    WHERE c.oid IS NULL
    `,
  );
  console.log('\n=== Required UNIQUE constraints ===');
  if (missingUnique.length) {
    console.log('MISSING:', missingUnique.map((r) => r.conname ?? r.name).join(', '));
    issues.push({
      severity: 'HIGH',
      area: 'unique_constraints',
      msg: `Missing UNIQUE: ${missingUnique.map((r) => r.conname || r.name).join(', ')} — run npm run db:unique-keys:apply`,
    });
  } else {
    console.log(requiredUniques.join(', '));
  }

  // --- summary ---
  console.log('\n========== SUMMARY ==========');
  if (!issues.length) {
    console.log('No high/medium integrity issues detected by these checks.');
  } else {
    for (const i of issues) {
      console.log(`[${i.severity}] ${i.area}: ${i.msg}`);
    }
  }

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
