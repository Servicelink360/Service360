/**
 * Seed Inner West Ground Maintenance activity schedules from TSV (local DB only).
 * Writes per-site rows (activity_name on site_item_activity_schedules) — does not
 * create or update global service_activities.
 *
 *   npm run db:apply-ground-maintenance-schema
 *   npm run db:seed-inner-west-ground-maintenance
 *   npm run db:seed-inner-west-ground-maintenance -- --dry-run
 */
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
require('./load-env');
const { Client } = require('pg');

const dryRun = process.argv.includes('--dry-run');
const allowRemote = process.argv.includes('--allow-remote');

const TSV_PATH = path.join(__dirname, 'data/inner-west-ground-maintenance.tsv');
const MONTH_KEYS = [
  'month_01',
  'month_02',
  'month_03',
  'month_04',
  'month_05',
  'month_06',
  'month_07',
  'month_08',
  'month_09',
  'month_10',
  'month_11',
  'month_12',
];

/** Spreadsheet site name (before ":") → DB sites.name */
const SITE_ALIASES = {
  'addison road elc': 'Addison Road Early Learning Centre',
  'annadale neighbourhood centre': '  Annandale Community (Neighbourhood) CentreCenter',
  'annette kellerman aquatic centre': 'Annette Kellerman Aquatic Centre Facility (AKAC)',
  'ashfield aquatic centre': 'Ashfield Aquatic Centre',
  'balmain occasional care': 'Balmain Occasional Care',
  'balmain town hall library': 'Balmain Town Hall',
  'cavandish elc': 'Cavendish Street Early Learning Centre',
  'clontarf cottage': 'Clontarf Cottage',
  'deborah little elc': 'Deborah Little Early Learning Centre',
  'elkington park cottage': 'Elkington Park Caretakers Cottage',
  'enmore elc': 'Enmore Child Care Centre',
  'fanny durack aquatic centre': 'Fanny Durack Aquatic Centre/ Plant / Kiosk',
  'globe wilkins elc': 'Globe Wilkins ELC',
  'haberfield library': 'Haberfield Library',
  'herb greedy hall': 'Herb Greedy Hall',
  'jimmy little community centre': 'Jimmy Little Community Center',
  'john mcmahon elc': 'John McMahon Early Learning Centre',
  'leichhardt elc': 'Leichhardt Early Learning Centre',
  'leichhardt family day care': 'Leichhardt Family Day Care',
  'leichhardt park aquatic centre': 'Leichhardt Park Aquatic Centre - All Buildings',
  'leichhardt park elc': 'Leichhardt Park Early Learning Centre',
  'marrickville library': 'Marrickville Library and Pavilion',
  'may murray elc': 'May Murray Child Care Centre',
  'merv fletcher hall': 'Mervyn Fletcher Hall Community Centre',
  'petersham town hall': 'Petersham Town Hall',
  'seaview street hall': 'Dulwich Hill Hall (Seaview St Hall)',
  'st peters town hall library': 'St Peters Town Hall',
  'stanmore library': 'Stanmore Library',
  'tempe leachate plant': 'Tempe Leachate Plant',
  'tillman park elc': 'Tillman Park Early Learning Centre',
  'tom foster community centre': 'Tom Foster Community Centre',
  'whites creek cottage': 'Whites Creek Cottage and Stables',
  'yirran gumal elc': 'Yirran Gumal Early Learning Centre',
};

function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseSiteLabel(label) {
  const raw = String(label || '').trim();
  const accessMatch = raw.match(/\s-\s([^:]+)$/);
  const accessWindow = accessMatch ? accessMatch[1].trim() : null;
  let namePart = raw;
  if (accessMatch) {
    namePart = raw.slice(0, raw.length - accessMatch[0].length).trim();
  }
  const colonIdx = namePart.indexOf(':');
  const siteName = colonIdx >= 0 ? namePart.slice(0, colonIdx).trim() : namePart.trim();
  return { siteName, accessWindow };
}

function isTick(v) {
  const s = String(v || '').trim();
  return s === '✔' || s === '✓' || s.toLowerCase() === 'y' || s === '1';
}

function parseMonthCells(monthRaw) {
  const ticks = monthRaw.filter((c) => isTick(c)).length;
  return monthRaw.map((raw) => {
    const v = String(raw || '').trim();
    if (!v) return null;
    if (v === 'F') return 'fortnight';
    if (v === 'M') return 'monthly';
    if (isTick(v)) {
      return ticks === 12 ? 'monthly' : 'weekly';
    }
    return null;
  });
}

function sslOption() {
  const raw = String(process.env.DATABASE_SSL ?? '').trim().toLowerCase();
  if (raw === '1' || raw === 'true' || raw === 'yes') {
    return { rejectUnauthorized: false };
  }
  return undefined;
}

function dbConfig() {
  const host = process.env.DATABASE_HOST || 'localhost';
  if (!allowRemote && !/^localhost$|^127\.0\.0\.1$/i.test(host)) {
    throw new Error(
      `Refusing non-local host "${host}". Set DATABASE_HOST=localhost in .env.local, or pass --allow-remote.`,
    );
  }
  return {
    host,
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    user: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || process.env.LOCAL_DATABASE_PASSWORD,
    database: process.env.DATABASE_DB_NAME || 'service360',
    ssl: sslOption(),
  };
}

function loadTsvRows() {
  if (!fs.existsSync(TSV_PATH)) {
    throw new Error(`Missing ${TSV_PATH}`);
  }
  const lines = fs.readFileSync(TSV_PATH, 'utf8').trim().split(/\r?\n/);
  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const parts = lines[i].split('\t');
    if (parts.length < 14) continue;
    const monthRaw = parts.slice(2, 14);
    rows.push({
      siteLabel: parts[0].trim(),
      activity: parts[1].trim(),
      months: parseMonthCells(monthRaw),
      accessWindow: parseSiteLabel(parts[0]).accessWindow,
      siteName: parseSiteLabel(parts[0]).siteName,
    });
  }
  return rows;
}

async function resolveInnerWestCustomer(client) {
  const res = await client.query(`
    SELECT u.id AS customer_id, COALESCE(cc.id, c.company_id) AS company_id
    FROM users u
    INNER JOIN customers c ON c.user_id = u.id
    LEFT JOIN customer_companies cc ON cc.id = c.company_id
    WHERE (
      LOWER(COALESCE(cc.name, '')) LIKE '%inner west%'
      OR LOWER(COALESCE(c.company_name, '')) LIKE '%inner west%'
      OR LOWER(COALESCE(u.full_name, '')) LIKE '%inner west%'
    )
    AND u.status <> 4
    ORDER BY u.id
    LIMIT 1
  `);
  if (!res.rows.length) {
    throw new Error('Inner West Council customer not found');
  }
  return res.rows[0];
}

async function resolveGroundMaintenanceServiceId(client) {
  const res = await client.query(`
    SELECT id FROM services
    WHERE LOWER(TRIM(name)) = 'ground maintenance'
    LIMIT 1
  `);
  if (!res.rows.length) {
    throw new Error('Ground Maintenance service not found');
  }
  return +res.rows[0].id;
}

async function findSiteByName(client, siteName) {
  const norm = normalizeName(siteName);
  const alias = SITE_ALIASES[norm];
  const candidates = [siteName.trim(), alias].filter(Boolean);

  for (const name of candidates) {
    const exact = await client.query(
      `SELECT id, name FROM sites WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1`,
      [name],
    );
    if (exact.rows.length) return exact.rows[0];
  }

  const fuzzy = await client.query(
    `
    SELECT id, name
    FROM sites
    WHERE LOWER(TRIM(name)) LIKE '%' || LOWER(TRIM($1)) || '%'
       OR LOWER(TRIM($1)) LIKE '%' || LOWER(TRIM(name)) || '%'
    ORDER BY LENGTH(name)
    LIMIT 1
    `,
    [alias || siteName.trim()],
  );
  if (fuzzy.rows.length) return fuzzy.rows[0];

  return null;
}

async function ensureSiteItem(client, { siteId, serviceId, customerId, companyId }) {
  const existing = await client.query(
    `
    SELECT id FROM site_items
    WHERE site_id = $1 AND service_id = $2 AND customer_id = $3
    LIMIT 1
    `,
    [siteId, serviceId, customerId],
  );
  if (existing.rows.length) return +existing.rows[0].id;

  if (dryRun) {
    console.log(`  [dry-run] would create site_item site=${siteId} svc=${serviceId}`);
    return null;
  }

  const ins = await client.query(
    `
    INSERT INTO site_items (site_id, service_id, customer_id, company_id, created_at)
    VALUES ($1, $2, $3, $4, NOW())
    RETURNING id
    `,
    [siteId, serviceId, customerId, companyId],
  );
  return +ins.rows[0].id;
}

async function upsertSchedule(client, { siteItemId, activityName, accessWindow, months }) {
  const name = String(activityName ?? '').trim();
  const existing = await client.query(
    `
    SELECT id FROM site_item_activity_schedules
    WHERE site_item_id = $1
      AND activity_name IS NOT NULL
      AND LOWER(TRIM(activity_name)) = LOWER(TRIM($2))
    LIMIT 1
    `,
    [siteItemId, name],
  );

  if (dryRun) {
    const active = months.filter(Boolean).length;
    console.log(
      `  [dry-run] schedule site_item=${siteItemId} activity="${name}" active_months=${active} access="${accessWindow || ''}"`,
    );
    return existing.rows.length ? 'updated' : 'inserted';
  }

  if (existing.rows.length) {
    await client.query(
      `
      UPDATE site_item_activity_schedules
      SET access_window = $1,
          activity_id = NULL,
          activity_name = $2,
          month_01 = $3, month_02 = $4, month_03 = $5, month_04 = $6,
          month_05 = $7, month_06 = $8, month_07 = $9, month_08 = $10,
          month_09 = $11, month_10 = $12, month_11 = $13, month_12 = $14,
          updated_at = NOW()
      WHERE id = $15
      `,
      [accessWindow, name, ...months, existing.rows[0].id],
    );
    return 'updated';
  }

  await client.query(
    `
    INSERT INTO site_item_activity_schedules (
      site_item_id, activity_id, activity_name, access_window,
      month_01, month_02, month_03, month_04, month_05, month_06,
      month_07, month_08, month_09, month_10, month_11, month_12
    )
    VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `,
    [siteItemId, name, accessWindow, ...months],
  );
  return 'inserted';
}

async function ensureSite(client, siteName, adminUserId) {
  const found = await findSiteByName(client, siteName);
  if (found) return found;

  const name = SITE_ALIASES[normalizeName(siteName)] || siteName.trim();
  if (dryRun) {
    console.log(`  [dry-run] would create site: ${name}`);
    return { id: null, name };
  }

  const ins = await client.query(
    `
    INSERT INTO sites (name, location, address_name, description, check_in_distance, created_by, updated_by, created_at, updated_at)
    VALUES ($1, '', '', 'Ground Maintenance schedule import', 500, $2, $2, NOW(), NOW())
    RETURNING id, name
    `,
    [name, adminUserId],
  );
  console.log(`  created site #${ins.rows[0].id}: ${ins.rows[0].name}`);
  return ins.rows[0];
}

async function main() {
  const cfg = dbConfig();
  if (!cfg.password) {
    console.error('Missing DATABASE_PASSWORD (.env.local)');
    process.exit(1);
  }

  const rows = loadTsvRows();
  console.log(`Loaded ${rows.length} schedule rows from TSV`);

  const client = new Client(cfg);
  await client.connect();
  console.log('Connected:', { host: cfg.host, database: cfg.database, dryRun });

  const { customer_id: customerId, company_id: companyId } = await resolveInnerWestCustomer(client);
  const serviceId = await resolveGroundMaintenanceServiceId(client);
  console.log('Customer:', customerId, 'Company:', companyId, 'Ground Maintenance service:', serviceId);
  console.log('Per-site schedules only (no global service_activities).');

  const admin = await client.query(
    `SELECT id FROM users WHERE type = 1 AND status <> 4 ORDER BY id LIMIT 1`,
  );
  const adminUserId = admin.rows[0]?.id ?? 1;

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const siteCache = new Map();
  const siteItemCache = new Map();

  for (const row of rows) {
    const cacheKey = normalizeName(row.siteName);
    let site = siteCache.get(cacheKey);
    if (!site) {
      site = await ensureSite(client, row.siteName, adminUserId);
      if (!site?.id) {
        skipped += 1;
        continue;
      }
      siteCache.set(cacheKey, site);
    }

    const siteItemKey = `${site.id}:${serviceId}`;
    let siteItemId = siteItemCache.get(siteItemKey);
    if (!siteItemId) {
      siteItemId = await ensureSiteItem(client, {
        siteId: site.id,
        serviceId,
        customerId,
        companyId,
      });
      if (!siteItemId) {
        skipped += 1;
        continue;
      }
      siteItemCache.set(siteItemKey, siteItemId);
    }

    const result = await upsertSchedule(client, {
      siteItemId,
      activityName: row.activity,
      accessWindow: row.accessWindow,
      months: row.months,
    });
    if (result === 'inserted') inserted += 1;
    else if (result === 'updated') updated += 1;
  }

  if (!dryRun) {
    await client.query(`
      ALTER TABLE site_items ADD COLUMN IF NOT EXISTS frequency_mode VARCHAR(16) NULL;
      ALTER TABLE site_items ADD COLUMN IF NOT EXISTS frequency_type VARCHAR(16) NULL;
      UPDATE services SET frequency_type = 'detailed'
      WHERE LOWER(TRIM(name)) = 'ground maintenance'
        AND (frequency_type IS NULL OR TRIM(frequency_type) = '' OR frequency_type = 'simple');
    `);
    const modeRes = await client.query(`
      UPDATE site_items si
      SET frequency_mode = CASE
        WHEN si.frequency_period IS NOT NULL
          AND TRIM(si.frequency_period) <> ''
          AND LOWER(TRIM(si.frequency_period)) <> 'na'
          THEN 'both'
        ELSE 'annual'
      END,
      frequency_type = 'detailed'
      FROM services svc
      WHERE si.service_id = svc.id
        AND LOWER(TRIM(svc.name)) = 'ground maintenance'
      RETURNING si.id
    `);
    console.log(`Synced unified frequency_mode on ${modeRes.rowCount} Ground Maintenance site item(s)`);
  } else {
    console.log('[dry-run] would sync frequency_mode on Ground Maintenance site items (no data deleted)');
  }

  await client.end();
  console.log(`\nDone. inserted=${inserted} updated=${updated} skipped=${skipped}${dryRun ? ' (dry-run)' : ''}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
