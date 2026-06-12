/**
 * Seed Inner West Council sites with Roof and Gutter service + frequency (local DB only).
 *
 * Usage (from service_link_api-main):
 *   copy .env.local.example .env.local   # set LOCAL postgres password
 *   npm run db:seed-inner-west-roof-gutter
 *   npm run db:seed-inner-west-roof-gutter -- --dry-run
 *
 * Safety: refuses remote hosts unless --allow-remote (not for RDS/production).
 */
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
require('./load-env');
const { Client } = require('pg');

const dryRun = process.argv.includes('--dry-run');
const allowRemote = process.argv.includes('--allow-remote');

/** site label from spreadsheet → frequency per year */
const SITE_ROWS = [
  ['Addison Road Early Learning Centre (Leased)', 12],
  ['Dawn Fraser Baths - Southern Pavilion / Western Garage', 12],
  ['Deborah Little Early Learning Centre', 12],
  ['Deborah Little Early Learning Centre - strip drain - back of front building', 12],
  ['Enmore Child Care Centre', 12],
  ['Jimmy Little Centre', 12],
  ['KU Petersham Kindergarten', 12],
  ['Leichhardt Family Day Care', 12],
  ['Leichhardt Early Learning Centre (Long day care)', 12],
  ['Leichhardt Oval - No. 2 Amenities', 12],
  ['Leichhardt Park Aquatic Centre - All Buildings', 12],
  ['Leichhardt Park Child Care', 12],
  ['Balmain Early Childhood Centre', 12],
  ['Balmain Occasional Care', 12],
  ['Balmain Occasional Care - strip drain & pit - eastern side of building', 12],
  ['Balmain Town Hall - Glass House & external Public Toilets', 12],
  ['Balmain Town Hall', 26],
  ['Balmain Town Hall - Rainwater head - Library side courtyard', 26],
  ['Balmain Town Hall - Strip drain - Library side courtyard', 12],
  ['Birchgrove Park Amenities', 12],
  ['Elkington Park Caretakers Cottage', 12],
  ['H.J. Mahoney Park Amenities & Irrigation tank', 12],
  ['Hannaford Centre', 12],
  ['John McMahon Childcare', 12],
  ['Portuguese Ethnographic Museum', 12],
  ['Portuguese Welfare Centre - White Room', 12],
  ['Tillman Park Child Care', 12],
  ['Tillman Park Toilets', 12],
  ['Annandale Community Centre', 12],
  ['Cavendish Street Early Learning Centre', 12],
  ['Clontarf Cottage', 12],
  ['Fanny Durack Aquatic Centre/ Plant / Kiosk', 12],
  ['Jarvie Park Youth Centre', 12],
  ['Marrickville Legal Centre (Former Dulwich Hill Library)', 12],
  ['Summer Hill Depot', 12],
  ['Whites Creek Cottage and Stables', 12],
  // 4 p/a → 1 time per 3 months
  ['Callan Park - Balmain Road Sporting Ground Toilets', 4],
  ['Callan Park Rec Hall (B504) - Wharf Road, Callan Park', 4],
  ['Enmore Resource Centre', 4],
  ['KU Crusader Kindergarten', 4],
  ['KU Summer Hill Kindergarten', 4],
  ['May Murray Child Care Centre', 4],
  ['Balmain Depot - All Buildings', 4],
  ['Balmain East Craft Cottage (Little Nicholson Playgroup)', 4],
  ['Balmain East Play Room House (Little Nicholson Playgroup)', 4],
  ['Birchgrove Park Caretakers Residence', 4],
  ['Birchgrove Park Pavilion/Referees Room', 4],
  ['Birchgrove Park Shed', 4],
  ['Birchgrove Park Tennis Pavilion', 4],
  ['Birchgrove Park Toilet Block/Garden Store', 4],
  ['Cohen Park Tennis Courts Amenities & Storage', 4],
  ['Gladstone Park Toilet Block', 4],
  ['Hawthorne Canal Café Bones', 4],
  ['Jack Shanahan Toilets', 4],
  ['Mackey Park - Pump House', 4],
  ['Mackey Park (Irrigation Tanks)', 4],
  ['Mackey Park Amenities/Kiosk', 4],
  ['Mackey Park Croquet Club Shed', 4],
  ['Mackey Park, River Canoe Club', 4],
  ['Petersham Park Bandstand Rotunda', 4],
  ['Petersham Park Grandstand', 4],
  ['Petersham Park Score Board & Canteen', 4],
  ['Plumtree - Pathways', 4],
  ['Ashfield Early Learning', 4],
  ['Ashfield Park Amenities Block Rotunda', 4],
  ['Ashfield Park Begonia House Summer House', 4],
  ['Chrissie Cotter Gallery', 4],
  ['Dulwich Hill Hall (Seaview St Hall)', 4],
  ['Dulwich Hill Languages School (Former Baby Health)', 4],
  ['Easton Park Amenities', 4],
  ['Frontyard (formerly ESP Gallery)', 4],
  ['Hammond Park Amenities Block', 4],
  ['Herbert Greedy Hall', 4],
  ['Hoskins Park Toilets', 4],
  [
    'Leichhardt Depot - Amenities & Workshop buildings (All Buildings & Structures)',
    4,
  ],
  ['Marrickville Library and Pavilion', 4],
  ['Marrickville Park Croquet Club', 4],
  ['Marrickville Town Hall', 4],
  ['Mort Bay Park Toilet Block', 4],
  ['Robson Park Amenities Dressing Room', 4],
  ['Stanmore Library', 4],
  ['Tom Foster Community Centre', 4],
  ['Wicks Park Tennis Building', 4],
  ['Wicks Park Toilets', 4],
  ['Wisdom Street Community Nursery', 4],
  ['Yeo Park Amenities Block', 4],
  ['Yeo Park Café', 4],
  ['Yirran Gumal Early Learning Centre', 4],
  // 2 p/a → 1 time per 6 months
  ['Camperdown Memorial Rest', 2],
  ['Callan Park Electricians Store (B703) - South Crescent', 2],
  ['Debbie and Abbey Borgia Centre (DAB)', 2],
  ['Leichhardt Oval - all buildings', 2],
  ['Leichhardt Service Centre', 2],
  ['Leichhardt Service Centre Demountable', 2],
  ['Prospect Street Kindergarten', 2],
  ['Blackmore Oval (SES Building)', 2],
  ['Blackmore Park Amenities Block/ Clubhouse', 2],
  ['Centenary Park Groundsmans Shed', 2],
  ['Elkington Park Bandstand', 2],
  ['King George Park Amenities Block', 2],
  ['Leichhardt Park Caretakers Cottage', 2],
  ['Leichhardt Town Hall', 2],
  ['Pratten Park - All Amenites/scoreboard/grandstand Buildings', 2],
  ['Pratten Park Tennis Clubhouse', 2],
  ['Pratten Park Thirning Villa', 2],
  ['Punch Park Tennis Amenities / Clubhouse/ New Ameneties', 2],
  ['Stone Villa', 2],
  ['War Memorial Park Toilet Block', 2],
  ['Annette Kellerman Aquatic Centre Facility (AKAC)', 2],
  ['Ashfield Aquatic Centre', 2],
  ['Calvert Street Car Park -Toilet Block', 2],
  ['Camperdown Park Amenities', 2],
  ['Camperdown Park Rotunda', 2],
  ['Camperdown Park Tennis Club/Camperdown Commons', 2],
  ['Federation Plaza Amenities Block', 2],
  ['Haberfield Library', 2],
  ['Henson Park Tennis Building', 2],
  ['McNeilly Park Toilet', 2],
  ['Mervyn Fletcher Hall Community Centre', 2],
  ['Newtown Town Hall', 2],
  ['Petersham Service Centre', 2],
  ['Petersham Town Hall', 2],
  ['Pioneer Memorial Park Amenities Block/Tool Shed', 2],
  ['SHARE Childrens Activity Centre & Eora Community Garden Shed', 2],
  ['St Peters Depot - Building A', 2],
  ['St Peters Depot - Building B', 2],
  ['St Peters Depot - Building C', 2],
  ['St Peters Town Hall', 2],
  ['Steel Park Amenities', 2],
  ['Summer Hill Community Centre', 2],
  ['Tempe Reserve - Robyn Webster Building', 2],
  ['Tempe Reserve Blue Amenities', 2],
  ['Tempe Reserve Jets Sports Club', 2],
  ['Yeo Park Bandstand Rotunda', 2],
  // 1 p/a → 1 time per year
  ['Arlington Amenities Building', 1],
  ['Arlington Grandstand', 1],
  ['Arlington Kiosk', 1],
  ['Arlington Storage Room', 1],
  ['KU Croydon Kindergarten', 1],
  ['Rozelle Parklands Toilet Block', 1],
  ['Algie Park Amenities Block', 1],
  ['Bridgewater Park Amenities & Pergola', 1],
  ['Centenary Park Amenities Building', 1],
  ['Elkington Park Toilet Block', 1],
  ['Fenwick Building', 1],
  ['Gladstone Park Bowling Club', 1],
  ['Johnson Park Toilets', 1],
  ['Kendrick Park Toilets', 1],
  ['Louisa Lawson Reserve Shelter', 1],
  ['Ryan Park (entrance shelter)', 1],
  ['Sydenham Green Amenities & Canteen', 1],
  ['Victoria Road Toilet Block', 1],
  ['Ashfield Park Bowling Club', 1],
  ['Ashfield Civic Centre', 1],
  ['Ashfield Park Pavilion Dressing Sheds', 1],
  ['Brown Street Amenities Block', 1],
  ['Henson Park - Media Tower, Scoreboard Building, Main Switch Room', 1],
  ['Marrickville Park Amenities', 1],
  ['Marrickville Park Materials Store', 1],
  ['Marrickville Park Tennis Club House', 1],
  ['Marrickville SES', 1],
  ['Pioneer Memorial Park Rotunda', 1],
  ['Richard Murden Reserve Amenities & Change Rooms - North', 1],
  ['Richard Murden Reserve Amenities & Canteen - South', 1],
  ['Simpson Park Toilets', 1],
  ['Summer Hill Car Park Toilets', 1],
];

/** Spreadsheet label → existing DB site name (when different). */
const SITE_ALIASES = {
  'addison road early learning centre leased': 'Addison Road Early Learning Centre',
  'jimmy little centre': 'Jimmy Little Community Center',
  'hannaford centre': 'Hannaford Community Centre',
  'john mcmahon childcare': 'John McMahon Early Learning Centre',
  'leichhardt park child care': 'Leichhardt Park Early Learning Centre',
  'tillman park child care': 'Tillman Park Early Learning Centre',
  'leichhardt early learning centre long day care': 'Leichhardt Early Learning Centre',
  'leichhardt oval no 2 amenities': 'Leichhardt Oval No.2 Amenities',
  'annandale community centre': 'Annandale Community (Neighbourhood) CentreCenter',
  'balmain occasional care strip drain pit eastern side of building':
    'Balmain Occasional Care - Strip drain & pit - Eastern side of building',
  'ashfield early learning': 'Ashfield Early Learning Centre',
  'ashfield park begonia house summer house': 'Ashfield Park Begonia Summer House',
  'herbert greedy hall': 'Herb Greedy Hall',
  'mackey park irrigation tanks': 'Mackey Park (Irrigation Tanks)',
  'pratten park all amenites scoreboard grandstand buildings':
    'Pratten Park - All Amenites/scoreboard/grandstand Building',
  'share childrens activity centre eora community garden shed':
    ' Eora Community Garden Shed SHARE Childrens Activity Centre ',
  'blackmore park amenities block clubhouse':
    'Blackmore Park Amenities Block/ Clubhouse  ',
};

function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function frequencyFromPa(pa) {
  const n = Math.max(1, Math.floor(+pa));
  if (n === 12) {
    return { frequencyTimes: 1, frequencyCount: 1, frequencyPeriod: 'month' };
  }
  if (n === 4) {
    return { frequencyTimes: 1, frequencyCount: 3, frequencyPeriod: 'month' };
  }
  if (n === 2) {
    return { frequencyTimes: 1, frequencyCount: 6, frequencyPeriod: 'month' };
  }
  if (n === 1) {
    return { frequencyTimes: 1, frequencyCount: 12, frequencyPeriod: 'month' };
  }
  if (n === 26) {
    return { frequencyTimes: 1, frequencyCount: 2, frequencyPeriod: 'week' };
  }
  throw new Error(`Unsupported visits per year: ${n} (expected 1, 2, 4, 12, or 26)`);
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
      `Refusing non-local host "${host}". Set DATABASE_HOST=localhost in .env / .env.local, or pass --allow-remote.`,
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
    throw new Error('Inner West Council customer not found in local database');
  }
  return res.rows[0];
}

async function resolveRoofGutterServiceId(client) {
  const res = await client.query(`
    SELECT id, name FROM services
    WHERE LOWER(TRIM(name)) IN ('roof and gutter', 'roof and gutter cleaning')
    ORDER BY id
    LIMIT 1
  `);
  if (!res.rows.length) {
    throw new Error('Roof and Gutter service not found — create it in services first');
  }
  return +res.rows[0].id;
}

async function findSiteByName(client, label) {
  const norm = normalizeName(label);
  const alias = SITE_ALIASES[norm];
  const candidates = [label.trim(), alias].filter(Boolean);

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
    [alias || label.trim()],
  );
  if (fuzzy.rows.length) return fuzzy.rows[0];

  return null;
}

async function ensureSite(client, label, adminUserId) {
  const found = await findSiteByName(client, label);
  if (found) return found;

  const name = SITE_ALIASES[normalizeName(label)] || label.trim();
  if (dryRun) {
    console.log(`  [dry-run] would create site: ${name}`);
    return { id: null, name };
  }

  const ins = await client.query(
    `
    INSERT INTO sites (name, location, address_name, description, check_in_distance, created_by, updated_by, created_at, updated_at)
    VALUES ($1, '', '', $2, 500, $3, $3, NOW(), NOW())
    RETURNING id, name
    `,
    [name, `Roof and Gutter-${SITE_ROWS.find(([rowLabel]) => rowLabel === label)?.[1] ?? 12}`, adminUserId],
  );
  console.log(`  created site #${ins.rows[0].id}: ${ins.rows[0].name}`);
  return ins.rows[0];
}

async function upsertSiteItem(client, { siteId, serviceId, customerId, companyId, freq }) {
  const existing = await client.query(
    `
    SELECT id FROM site_items
    WHERE site_id = $1 AND service_id = $2 AND customer_id = $3
    LIMIT 1
    `,
    [siteId, serviceId, customerId],
  );

  if (dryRun) {
    const action = existing.rows.length ? 'update' : 'insert';
    console.log(
      `  [dry-run] would ${action} site_item site=${siteId} svc=${serviceId} freq=${freq.frequencyTimes}x per ${freq.frequencyCount} ${freq.frequencyPeriod}`,
    );
    return;
  }

  if (existing.rows.length) {
    await client.query(
      `
      UPDATE site_items
      SET frequency_times = $1,
          frequency_count = $2,
          frequency_period = $3,
          frequency_mode = 'interval',
          frequency_type = 'simple',
          company_id = COALESCE(company_id, $4)
      WHERE id = $5
      `,
      [
        freq.frequencyTimes,
        freq.frequencyCount,
        freq.frequencyPeriod,
        companyId,
        existing.rows[0].id,
      ],
    );
    return 'updated';
  }

  await client.query(
    `
    INSERT INTO site_items (
      site_id, service_id, customer_id, company_id, created_at,
      frequency_times, frequency_count, frequency_period, frequency_mode, frequency_type
    )
    VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, 'interval', 'simple')
    `,
    [
      siteId,
      serviceId,
      customerId,
      companyId,
      freq.frequencyTimes,
      freq.frequencyCount,
      freq.frequencyPeriod,
    ],
  );
  return 'inserted';
}

async function ensureFrequencyColumns(client) {
  await client.query(`
    ALTER TABLE site_items ADD COLUMN IF NOT EXISTS frequency_times INT NULL;
    ALTER TABLE site_items ADD COLUMN IF NOT EXISTS frequency_count INT NULL;
    ALTER TABLE site_items ADD COLUMN IF NOT EXISTS frequency_period VARCHAR(16) NULL;
    ALTER TABLE site_items ADD COLUMN IF NOT EXISTS frequency_mode VARCHAR(16) NULL;
    ALTER TABLE site_items ADD COLUMN IF NOT EXISTS frequency_type VARCHAR(16) NULL;
  `);
}

async function main() {
  const cfg = dbConfig();
  if (!cfg.password) {
    console.error(
      'Missing DATABASE_PASSWORD. Copy .env.local.example to .env.local and set your local postgres password.',
    );
    process.exit(1);
  }

  const client = new Client(cfg);
  await client.connect();
  console.log('Connected:', {
    host: cfg.host,
    port: cfg.port,
    database: cfg.database,
    user: cfg.user,
    dryRun,
  });

  await ensureFrequencyColumns(client);

  const admin = await client.query(
    `SELECT id FROM users WHERE type = 1 AND status <> 4 ORDER BY id LIMIT 1`,
  );
  const adminUserId = admin.rows[0]?.id ?? 1;

  const { customer_id: customerId, company_id: companyId } = await resolveInnerWestCustomer(client);
  const serviceId = await resolveRoofGutterServiceId(client);
  await client.query(`
    UPDATE services SET frequency_type = 'simple'
    WHERE id = $1
      AND (frequency_type IS NULL OR TRIM(frequency_type) = '' OR frequency_type <> 'simple')
  `, [serviceId]);
  console.log('Customer:', customerId, 'Company:', companyId, 'Roof/Gutter service:', serviceId);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const [label, pa] of SITE_ROWS) {
    const freq = frequencyFromPa(pa);
    console.log(`\n${label} (${pa}/yr → ${freq.frequencyTimes} per ${freq.frequencyCount} ${freq.frequencyPeriod})`);
    const site = await ensureSite(client, label, adminUserId);
    if (!site.id) {
      skipped += 1;
      continue;
    }
    const result = await upsertSiteItem(client, {
      siteId: site.id,
      serviceId,
      customerId,
      companyId,
      freq,
    });
    if (result === 'inserted') inserted += 1;
    else if (result === 'updated') updated += 1;
    else skipped += 1;
    console.log(`  site #${site.id} (${site.name}) — ${result || 'dry-run ok'}`);
  }

  await client.end();
  console.log(`\nDone. inserted=${inserted} updated=${updated} skipped=${skipped}${dryRun ? ' (dry-run)' : ''}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
