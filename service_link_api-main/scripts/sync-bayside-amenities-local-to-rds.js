/**
 * Sync 15 Bayside Public Amenities job sites from local service360 to RDS:
 *   - creates missing sites (local ids 214–228)
 *   - site_items (service, customer, frequency)
 *   - site_item_staffs (Adam Kay)
 *
 *   node scripts/sync-bayside-amenities-local-to-rds.js --dry-run
 *   node scripts/sync-bayside-amenities-local-to-rds.js
 */
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const dryRun = process.argv.includes('--dry-run');

const LOCAL_SITE_IDS = Array.from({ length: 15 }, (_, i) => 214 + i);
const SERVICE_NAME = 'Public Amenities Cleaning';
const STAFF_NAME = 'Adam Kay';
const CUSTOMER_COMPANY = 'Bayside Council';

function loadEnvFile(filePath, target = process.env) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m) target[m[1]] = m[2].trim();
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

function dbConfigs() {
  const root = path.join(__dirname, '..');
  loadEnvFile(path.join(root, '.env'));
  loadEnvFile(path.join(root, '.env.local'));

  const prodEnv = {};
  loadEnvFile(path.join(root, '.env.prod'), prodEnv);

  const localCfg = {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    user: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || process.env.LOCAL_DATABASE_PASSWORD,
    database: process.env.DATABASE_DB_NAME || 'service360',
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
    throw new Error('Missing local or RDS credentials (.env + .env.prod)');
  }
  if (/localhost|127\.0\.0\.1/i.test(remoteCfg.host)) {
    throw new Error('Refusing remote host localhost — check .env.prod DATABASE_HOST');
  }
  if (!/localhost|127\.0\.0\.1/i.test(localCfg.host)) {
    throw new Error('Refusing local host that is not localhost');
  }

  return { localCfg, remoteCfg };
}

async function resolveRemoteSiteByName(remote, localName) {
  const exact = await remote.query(
    `SELECT id, name FROM sites WHERE name = $1 LIMIT 1`,
    [localName],
  );
  if (exact.rows.length) return exact.rows[0];

  const norm = normalizeSiteName(localName);
  const all = await remote.query(`SELECT id, name FROM sites ORDER BY id`);
  for (const row of all.rows) {
    if (normalizeSiteName(row.name) === norm) return row;
  }
  return null;
}

async function resolveRemoteRefs(remote) {
  const res = await remote.query(
    `
    SELECT
      (SELECT id FROM services WHERE name = $1 LIMIT 1) AS service_id,
      (SELECT id FROM users WHERE full_name ILIKE $2 AND type = 2 AND status <> 4 LIMIT 1) AS staff_id,
      (SELECT u.id FROM users u
         JOIN customers cust ON cust.user_id = u.id
         JOIN customer_companies cc ON cc.id = cust.company_id
        WHERE cc.name ILIKE $3 AND u.type = 1 AND u.status <> 4
        ORDER BY u.id LIMIT 1) AS customer_id,
      (SELECT id FROM customer_companies WHERE name ILIKE $3 LIMIT 1) AS company_id
    `,
    [SERVICE_NAME, `%${STAFF_NAME}%`, CUSTOMER_COMPANY],
  );
  const ref = res.rows[0];
  if (!ref.service_id || !ref.staff_id || !ref.customer_id || !ref.company_id) {
    throw new Error(`RDS missing reference IDs: ${JSON.stringify(ref)}`);
  }
  return ref;
}

async function fetchLocalSites(local) {
  const res = await local.query(
    `
    SELECT id, name, location, address_name, description, check_in_distance, created_by, updated_by
    FROM sites
    WHERE id = ANY($1::int[])
    ORDER BY id
    `,
    [LOCAL_SITE_IDS],
  );
  return res.rows;
}

async function fetchLocalSiteItems(local) {
  const res = await local.query(
    `
    SELECT
      s.id AS local_site_id,
      s.name AS site_name,
      si.frequency_type,
      si.frequency_times,
      si.frequency_count,
      si.frequency_period,
      si.frequency_mode
    FROM sites s
    INNER JOIN site_items si ON si.site_id = s.id
    INNER JOIN services sv ON sv.id = si.service_id
    WHERE s.id = ANY($1::int[])
      AND sv.name = $2
    ORDER BY s.id
    `,
    [LOCAL_SITE_IDS, SERVICE_NAME],
  );
  return res.rows;
}

async function resolveRemoteAdminId(remote, preferredId) {
  const preferred = await remote.query(
    `SELECT id FROM users WHERE id = $1 AND status <> 4 LIMIT 1`,
    [preferredId],
  );
  if (preferred.rows.length) return preferred.rows[0].id;

  const admin = await remote.query(
    `SELECT id FROM users WHERE type = 1 AND status <> 4 ORDER BY id LIMIT 1`,
  );
  return admin.rows[0]?.id ?? 1;
}

async function ensureRemoteSite(remote, localSite, adminId) {
  const existing = await resolveRemoteSiteByName(remote, localSite.name);
  if (existing) return { site: existing, action: 'exists' };

  if (dryRun) {
    return { site: { id: null, name: localSite.name }, action: 'would-create' };
  }

  const createdBy = await resolveRemoteAdminId(remote, localSite.created_by || adminId);
  const ins = await remote.query(
    `
    INSERT INTO sites (
      name, location, address_name, description, check_in_distance,
      created_by, updated_by, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $6, NOW(), NOW())
    RETURNING id, name
    `,
    [
      localSite.name,
      localSite.location || '',
      localSite.address_name || '',
      localSite.description || null,
      localSite.check_in_distance ?? 500,
      createdBy,
    ],
  );
  return { site: ins.rows[0], action: 'created' };
}

async function upsertRemoteSiteItem(remote, remoteSiteId, row, ref) {
  const existing = await remote.query(
    `
    SELECT id FROM site_items
    WHERE site_id = $1 AND service_id = $2 AND customer_id = $3
    LIMIT 1
    `,
    [remoteSiteId, ref.service_id, ref.customer_id],
  );

  const freq = {
    frequency_type: row.frequency_type || 'simple',
    frequency_times: row.frequency_times ?? 1,
    frequency_count: row.frequency_count ?? 1,
    frequency_period: row.frequency_period || 'day',
    frequency_mode: row.frequency_mode || 'interval',
  };

  if (existing.rows.length) {
    const siteItemId = existing.rows[0].id;
    if (!dryRun) {
      await remote.query(
        `
        UPDATE site_items
        SET company_id = $1,
            frequency_type = $2,
            frequency_times = $3,
            frequency_count = $4,
            frequency_period = $5,
            frequency_mode = $6
        WHERE id = $7
        `,
        [
          ref.company_id,
          freq.frequency_type,
          freq.frequency_times,
          freq.frequency_count,
          freq.frequency_period,
          freq.frequency_mode,
          siteItemId,
        ],
      );
    }
    return { siteItemId, action: 'updated' };
  }

  if (dryRun) {
    return { siteItemId: null, action: 'would-insert' };
  }

  const ins = await remote.query(
    `
    INSERT INTO site_items (
      created_at, customer_id, site_id, company_id, service_id,
      frequency_type, frequency_times, frequency_count, frequency_period, frequency_mode
    )
    VALUES (NOW(), $1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id
    `,
    [
      ref.customer_id,
      remoteSiteId,
      ref.company_id,
      ref.service_id,
      freq.frequency_type,
      freq.frequency_times,
      freq.frequency_count,
      freq.frequency_period,
      freq.frequency_mode,
    ],
  );
  return { siteItemId: ins.rows[0].id, action: 'inserted' };
}

async function ensureRemoteStaff(remote, siteItemId, staffId) {
  if (!siteItemId) return 'dry-run';
  const exists = await remote.query(
    `SELECT id FROM site_item_staffs WHERE site_item_id = $1 AND staff_id = $2 LIMIT 1`,
    [siteItemId, staffId],
  );
  if (exists.rows.length) return 'exists';
  if (!dryRun) {
    await remote.query(
      `INSERT INTO site_item_staffs (site_item_id, staff_id, created_at) VALUES ($1, $2, NOW())`,
      [siteItemId, staffId],
    );
  }
  return 'linked';
}

async function main() {
  const { localCfg, remoteCfg } = dbConfigs();
  const local = new Client(localCfg);
  const remote = new Client(remoteCfg);
  await local.connect();
  await remote.connect();

  console.log('Local:', localCfg.host, localCfg.database);
  console.log('Remote:', remoteCfg.host, remoteCfg.database, dryRun ? '(dry-run)' : '');

  const ref = await resolveRemoteRefs(remote);
  console.log('RDS reference IDs:', ref);

  const localSites = await fetchLocalSites(local);
  const localItems = await fetchLocalSiteItems(local);
  const itemBySiteId = new Map(localItems.map((r) => [r.local_site_id, r]));

  console.log(`Local sites: ${localSites.length}, site_items: ${localItems.length}`);
  if (localSites.length !== 15 || localItems.length !== 15) {
    throw new Error('Expected 15 local sites and 15 site_items');
  }

  let ok = 0;

  for (const localSite of localSites) {
    const row = itemBySiteId.get(localSite.id);
    if (!row) {
      throw new Error(`Missing local site_item for site ${localSite.id}`);
    }

    const { site: remoteSite, action: siteAction } = await ensureRemoteSite(
      remote,
      localSite,
      ref.staff_id,
    );

    const { siteItemId, action: itemAction } = await upsertRemoteSiteItem(
      remote,
      remoteSite.id,
      row,
      ref,
    );
    const staffAction = await ensureRemoteStaff(remote, siteItemId, ref.staff_id);

    console.log(
      `${dryRun ? '[dry-run] ' : ''}${localSite.name}`,
      `local#${localSite.id} -> RDS#${remoteSite.id ?? '?'}`,
      `site ${siteAction}`,
      `item ${itemAction}`,
      `staff ${staffAction}`,
      `freq ${row.frequency_times}x per ${row.frequency_count} ${row.frequency_period}`,
    );
    ok += 1;
  }

  await local.end();
  await remote.end();
  console.log(`\nDone. synced=${ok}${dryRun ? ' (dry-run)' : ''}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
