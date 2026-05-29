/**
 * Create report_template_services (migration 026).
 * Uses DATABASE_* from .env — same as the API.
 *
 * Usage (from service_link_api-main):
 *   npm run db:report-template-services
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
    console.error('Missing DATABASE_HOST or DATABASE_USERNAME in .env');
    process.exit(1);
  }

  const sqlPath = path.join(
    __dirname,
    '..',
    'database',
    'migrations',
    '026_report_template_services.sql',
  );
  if (!fs.existsSync(sqlPath)) {
    console.error('Migration file not found:', sqlPath);
    process.exit(1);
  }

  const client = new Client({
    host,
    port,
    user,
    password,
    database,
    ssl: sslOption(),
  });

  try {
    await client.connect();
    console.log(`Connected to ${database}@${host}:${port}`);
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await client.query(sql);
    console.log('Applied: 026_report_template_services.sql');

    const check = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'report_template_services'
      ) AS ok;
    `);
    if (check.rows[0]?.ok) {
      console.log('OK: public.report_template_services exists');
    } else {
      console.error('Table was not created — check errors above');
      process.exit(1);
    }
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
