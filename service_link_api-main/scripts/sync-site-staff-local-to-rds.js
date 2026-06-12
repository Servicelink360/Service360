/**
 * Copy site_item_staffs + shifts from local DB to RDS for sites that have
 * **zero staff on RDS** (matched by site name). Skips sites that already have staff.
 *
 *   node scripts/sync-site-staff-local-to-rds.js --dry-run
 *   node scripts/sync-site-staff-local-to-rds.js
 */
/* eslint-disable no-console */
const path = require('path');
const fs = require('fs');
const { Client } = require('pg');

const dryRun = process.argv.includes('--dry-run');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m) process.env[m[1]] = m[2].trim();
  }
}

function normalizeSiteName(name) {
  return String(name ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** RDS sites with no staff on any site_item. */
async function fetchRemoteZeroStaffSites(client) {
  const res = await client.query(`
    SELECT st.id, st.name
    FROM sites st
    WHERE NOT EXISTS (
      SELECT 1
      FROM site_items si
      INNER JOIN site_item_staffs sis ON sis.site_item_id = si.id
      WHERE si.site_id = st.id
    )
    ORDER BY st.name
  `);
  return res.rows;
}

async function resolveLocalSiteName(client, remoteName) {
  const exact = await client.query(
    `SELECT name FROM sites WHERE name = $1 LIMIT 1`,
    [remoteName],
  );
  if (exact.rows.length) return exact.rows[0].name;

  const norm = normalizeSiteName(remoteName);
  const all = await client.query(`SELECT name FROM sites ORDER BY id`);
  for (const row of all.rows) {
    if (normalizeSiteName(row.name) === norm) return row.name;
  }
  const fuzzy = await client.query(
    `SELECT name FROM sites WHERE LOWER(TRIM(name)) LIKE $1 ORDER BY LENGTH(name) LIMIT 1`,
    [`%${norm.slice(0, Math.min(24, norm.length))}%`],
  );
  return fuzzy.rows[0]?.name ?? null;
}

async function fetchLocalStaffForSite(client, siteName) {
  const res = await client.query(
    `
    SELECT
      st.name AS site_name,
      svc.name AS service_name,
      sis.staff_id,
      u.full_name,
      siss.start_time,
      siss.end_time,
      siss.type AS shift_type,
      siss.type_value AS shift_type_value
    FROM sites st
    INNER JOIN site_items si ON si.site_id = st.id
    INNER JOIN services svc ON svc.id = si.service_id
    INNER JOIN site_item_staffs sis ON sis.site_item_id = si.id
    INNER JOIN users u ON u.id = sis.staff_id AND u.status <> 4
    LEFT JOIN site_item_staff_shifts siss ON siss.site_item_staff_id = sis.id
    WHERE st.name = $1
    ORDER BY svc.name, sis.staff_id, siss.id
    `,
    [siteName],
  );
  return res.rows;
}

async function remoteSiteStaffCount(client, siteId) {
  const res = await client.query(
    `
    SELECT COUNT(DISTINCT sis.staff_id)::int AS n
    FROM site_items si
    INNER JOIN site_item_staffs sis ON sis.site_item_id = si.id
    WHERE si.site_id = $1
    `,
    [siteId],
  );
  return res.rows[0]?.n ?? 0;
}

async function resolveRemoteSiteItem(client, siteId, serviceName) {
  const res = await client.query(
    `
    SELECT si.id AS site_item_id
    FROM site_items si
    INNER JOIN services svc ON svc.id = si.service_id
    WHERE si.site_id = $1 AND svc.name = $2
    ORDER BY si.id DESC
    LIMIT 1
    `,
    [siteId, serviceName],
  );
  return res.rows[0]?.site_item_id ?? null;
}

async function staffExistsOnRemote(client, siteItemId, staffId) {
  const res = await client.query(
    `SELECT id FROM site_item_staffs WHERE site_item_id = $1 AND staff_id = $2 LIMIT 1`,
    [siteItemId, staffId],
  );
  return res.rows[0]?.id ?? null;
}

async function main() {
  const root = path.join(__dirname, '..');
  loadEnvFile(path.join(root, '.env'));
  loadEnvFile(path.join(root, '.env.local'));

  const prodPath = path.join(root, '.env.prod');
  const prodEnv = {};
  if (fs.existsSync(prodPath)) {
    for (const line of fs.readFileSync(prodPath, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (m) prodEnv[m[1]] = m[2].trim();
    }
  }

  const localCfg = {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: process.env.LOCAL_DATABASE_PASSWORD || '123456',
    database: 'service360',
    ssl: false,
  };
  const remoteCfg = {
    host: prodEnv.DATABASE_HOST || process.env.RDS_HOST,
    port: parseInt(prodEnv.DATABASE_PORT || '5432', 10),
    user: prodEnv.DATABASE_USERNAME || 'postgres',
    password: prodEnv.DATABASE_PASSWORD || process.env.RDS_PASSWORD,
    database: prodEnv.DATABASE_DB_NAME || 'service360',
    ssl: { rejectUnauthorized: false },
  };

  if (!localCfg.password || !remoteCfg.password || !remoteCfg.host) {
    console.error('Missing local/RDS credentials (.env.local + .env.prod)');
    process.exit(1);
  }
  if (/localhost|127\.0\.0\.1/i.test(remoteCfg.host)) {
    console.error('Refusing remote host localhost — set RDS host in .env.prod');
    process.exit(1);
  }

  const local = new Client(localCfg);
  const remote = new Client(remoteCfg);
  await local.connect();
  await remote.connect();
  console.log('Local:', localCfg.host, localCfg.database);
  console.log('Remote:', remoteCfg.host, remoteCfg.database, dryRun ? '(dry-run)' : '');

  const zeroStaffSites = await fetchRemoteZeroStaffSites(remote);
  console.log(`RDS sites with 0 staff: ${zeroStaffSites.length}`);

  let linked = 0;
  let shiftsAdded = 0;
  let skipped = 0;

  for (const remoteSite of zeroStaffSites) {
    const staffCnt = await remoteSiteStaffCount(remote, remoteSite.id);
    if (staffCnt > 0) {
      console.log(`SKIP (staff now assigned): ${remoteSite.name} #${remoteSite.id}`);
      skipped += 1;
      continue;
    }

    const localSiteName = await resolveLocalSiteName(local, remoteSite.name);
    if (!localSiteName) {
      console.log(`SKIP (no local match): ${remoteSite.name} #${remoteSite.id}`);
      skipped += 1;
      continue;
    }

    const rows = await fetchLocalStaffForSite(local, localSiteName);
    if (!rows.length) {
      console.log(`SKIP (no local staff): ${remoteSite.name} (local: ${localSiteName})`);
      skipped += 1;
      continue;
    }

    const grouped = new Map();
    for (const row of rows) {
      const key = `${row.service_name}\0${row.staff_id}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          serviceName: row.service_name,
          staffId: row.staff_id,
          staffName: row.full_name,
          shifts: [],
        });
      }
      if (row.start_time != null) {
        grouped.get(key).shifts.push({
          startTime: row.start_time,
          endTime: row.end_time,
          type: row.shift_type,
          typeValue: row.shift_type_value,
        });
      }
    }

    console.log(`\n${remoteSite.name} #${remoteSite.id} <- local "${localSiteName}"`);

    for (const entry of grouped.values()) {
      const siteItemId = await resolveRemoteSiteItem(
        remote,
        remoteSite.id,
        entry.serviceName,
      );
      if (!siteItemId) {
        console.log(`  SKIP (no remote site_item): ${entry.serviceName}`);
        skipped += 1;
        continue;
      }

      const staffOnRemote = await remote.query(
        `SELECT id FROM users WHERE id = $1 AND status <> 4`,
        [entry.staffId],
      );
      if (!staffOnRemote.rows.length) {
        console.log(`  SKIP (staff ${entry.staffId} not on RDS): ${entry.staffName}`);
        skipped += 1;
        continue;
      }

      let sisId = await staffExistsOnRemote(remote, siteItemId, entry.staffId);
      if (!sisId) {
        console.log(
          `  LINK ${entry.serviceName} -> ${entry.staffName} (${entry.staffId}) site_item #${siteItemId}`,
        );
        if (!dryRun) {
          const ins = await remote.query(
            `INSERT INTO site_item_staffs (site_item_id, staff_id) VALUES ($1, $2) RETURNING id`,
            [siteItemId, entry.staffId],
          );
          sisId = ins.rows[0].id;
        }
        linked += 1;
      }

      if (!sisId || !entry.shifts.length) continue;

      for (const sh of entry.shifts) {
        const dup = await remote.query(
          `
          SELECT id FROM site_item_staff_shifts
          WHERE site_item_staff_id = $1
            AND start_time = $2 AND end_time = $3
            AND type = $4 AND COALESCE(type_value, '') = COALESCE($5, '')
          LIMIT 1
          `,
          [sisId, sh.startTime, sh.endTime, sh.type, sh.typeValue],
        );
        if (dup.rows.length) continue;
        console.log(`    SHIFT ${sh.startTime}-${sh.endTime}`);
        if (!dryRun) {
          await remote.query(
            `
            INSERT INTO site_item_staff_shifts (site_item_staff_id, start_time, end_time, type, type_value)
            VALUES ($1, $2, $3, $4, $5)
            `,
            [sisId, sh.startTime, sh.endTime, sh.type, sh.typeValue ?? ''],
          );
        }
        shiftsAdded += 1;
      }
    }
  }

  await local.end();
  await remote.end();
  console.log(
    `\nDone. linked=${linked} shifts_added=${shiftsAdded} skipped=${skipped}${dryRun ? ' (dry-run)' : ''}`,
  );
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
