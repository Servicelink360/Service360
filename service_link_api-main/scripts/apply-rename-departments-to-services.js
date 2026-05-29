/**
 * Rename departments → services (migration 027).
 * Uses DATABASE_* from .env — same as the API.
 *
 * Usage (from service_link_api-main):
 *   npm run db:rename-departments-to-services
 */
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Client } = require('pg');

const envPaths = [
  path.join(process.cwd(), '.env'),
  path.join(__dirname, '..', '.env'),
];
for (const p of envPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

function sslOption() {
  const raw = String(process.env.DATABASE_SSL ?? '').trim().toLowerCase();
  if (raw === '1' || raw === 'true' || raw === 'yes') {
    return { rejectUnauthorized: false };
  }
  return undefined;
}

async function main() {
  const host = process.env.DATABASE_HOST;
  const user = process.env.DATABASE_USERNAME;
  const password = process.env.DATABASE_PASSWORD;
  const database = process.env.DATABASE_DB_NAME || 'service360';
  const port = parseInt(process.env.DATABASE_PORT || '5432', 10);

  if (!host || !user) {
    console.error('Set DATABASE_HOST and DATABASE_USERNAME in .env');
    process.exit(1);
  }

  const sqlPath = path.join(
    __dirname,
    '..',
    'database',
    'migrations',
    '027_rename_departments_to_services.sql',
  );
  if (!fs.existsSync(sqlPath)) {
    console.error('Migration file not found:', sqlPath);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8').replace(/^\uFEFF/, '');
  const client = new Client({
    host,
    port,
    user,
    password,
    database,
    ssl: sslOption(),
  });

  await client.connect();
  try {
    await client.query(sql);
    const check = await client.query(`
      SELECT
        EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'services') AS has_services,
        EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'departments') AS has_departments;
    `);
    const row = check.rows[0] || {};
    console.log('Migration 027 applied.');
    console.log('  services table:', row.has_services ? 'yes' : 'no');
    console.log('  departments table (should be no):', row.has_departments ? 'yes' : 'no');
    if (!row.has_services) {
      console.error('ERROR: services table still missing. Check DB logs.');
      process.exit(1);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
