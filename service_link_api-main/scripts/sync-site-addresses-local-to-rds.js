/**
 * Copy site location + address_name from local DB to RDS where RDS fields are empty.
 *
 *   node scripts/sync-site-addresses-local-to-rds.js --dry-run
 *   node scripts/sync-site-addresses-local-to-rds.js
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

function isBlank(value) {
  return value == null || String(value).trim() === '';
}

function normalizeSiteName(name) {
  return String(name ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

async function fetchRemoteEmptyAddressSites(client) {
  const res = await client.query(`
    SELECT id, name, location, address_name
    FROM sites
    WHERE (address_name IS NULL OR TRIM(address_name) = '')
       OR (location IS NULL OR TRIM(location) = '')
    ORDER BY name
  `);
  return res.rows;
}

async function resolveLocalSite(client, remoteName) {
  const exact = await client.query(
    `SELECT id, name, location, address_name FROM sites WHERE name = $1 LIMIT 1`,
    [remoteName],
  );
  if (exact.rows.length) return exact.rows[0];

  const norm = normalizeSiteName(remoteName);
  const all = await client.query(`SELECT id, name, location, address_name FROM sites ORDER BY id`);
  for (const row of all.rows) {
    if (normalizeSiteName(row.name) === norm) return row;
  }
  return null;
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
    console.error('Missing local/RDS credentials');
    process.exit(1);
  }
  if (/localhost|127\.0\.0\.1/i.test(remoteCfg.host)) {
    console.error('Refusing remote host localhost');
    process.exit(1);
  }

  const local = new Client(localCfg);
  const remote = new Client(remoteCfg);
  await local.connect();
  await remote.connect();
  console.log('Local:', localCfg.host, localCfg.database);
  console.log('Remote:', remoteCfg.host, remoteCfg.database, dryRun ? '(dry-run)' : '');

  const targets = await fetchRemoteEmptyAddressSites(remote);
  console.log(`RDS sites with empty address/location: ${targets.length}`);

  let updated = 0;
  let skipped = 0;

  for (const remoteSite of targets) {
    const localSite = await resolveLocalSite(local, remoteSite.name);
    if (!localSite) {
      console.log(`SKIP (no local match): #${remoteSite.id} ${remoteSite.name}`);
      skipped += 1;
      continue;
    }

    const patch = {};
    if (isBlank(remoteSite.address_name) && !isBlank(localSite.address_name)) {
      patch.address_name = String(localSite.address_name).trim();
    }
    if (isBlank(remoteSite.location) && !isBlank(localSite.location)) {
      patch.location = String(localSite.location).trim();
    }

    if (!Object.keys(patch).length) {
      console.log(`SKIP (local also empty): #${remoteSite.id} ${remoteSite.name}`);
      skipped += 1;
      continue;
    }

    const parts = [];
    if (patch.address_name) parts.push(`address="${patch.address_name}"`);
    if (patch.location) parts.push(`location="${patch.location}"`);
    console.log(`UPDATE #${remoteSite.id} ${remoteSite.name} <- local #${localSite.id}: ${parts.join(', ')}`);

    if (!dryRun) {
      const sets = [];
      const vals = [];
      let i = 1;
      if (patch.address_name) {
        sets.push(`address_name = $${i++}`);
        vals.push(patch.address_name);
      }
      if (patch.location) {
        sets.push(`location = $${i++}`);
        vals.push(patch.location);
      }
      vals.push(remoteSite.id);
      await remote.query(
        `UPDATE sites SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${i}`,
        vals,
      );
    }
    updated += 1;
  }

  await local.end();
  await remote.end();
  console.log(`\nDone. updated=${updated} skipped=${skipped}${dryRun ? ' (dry-run)' : ''}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
