/**
 * Apply 034_ground_maintenance_schedules.sql (local DB only by default).
 *
 *   node scripts/apply-ground-maintenance-schema.js
 *   node scripts/apply-ground-maintenance-schema.js --allow-remote
 */
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
require('./load-env');
const { Client } = require('pg');

const allowRemote = process.argv.includes('--allow-remote');

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
      `Refusing non-local host "${host}". Use .env.local with DATABASE_HOST=localhost or pass --allow-remote.`,
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

async function main() {
  const cfg = dbConfig();
  if (!cfg.password) {
    console.error('Missing DATABASE_PASSWORD (.env.local)');
    process.exit(1);
  }
  const sqlPath = path.join(__dirname, '../database/migrations/034_ground_maintenance_schedules.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const client = new Client(cfg);
  await client.connect();
  console.log('Connected:', { host: cfg.host, database: cfg.database });
  await client.query(sql);
  const tables = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('service_activities', 'site_item_activity_schedules')
    ORDER BY table_name
  `);
  console.log('Tables:', tables.rows.map((r) => r.table_name).join(', '));
  await client.end();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
