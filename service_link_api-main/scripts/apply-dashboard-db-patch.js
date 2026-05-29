/**
 * Apply dashboard unread SQL migrations (admin + customer columns, baselines, indexes).
 * Uses DATABASE_* from .env — same as the API.
 *
 * Usage (from service_link_api-main):
 *   node scripts/apply-dashboard-db-patch.js
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

const migrationFiles = [
  '001_dashboard_unread_reports.sql',
  '002_customer_unread_reports.sql',
];

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

    for (const file of migrationFiles) {
      const sqlPath = path.join(__dirname, '..', 'database', 'migrations', file);
      if (!fs.existsSync(sqlPath)) {
        console.error('Migration file not found:', sqlPath);
        process.exit(1);
      }
      const sql = fs.readFileSync(sqlPath, 'utf8');
      await client.query(sql);
      console.log('Applied:', file);
    }

    const checks = await client.query(`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_name IN ('admin_opened_at', 'customer_opened_at')
        AND table_name IN ('user_tasks', 'report_faults')
      ORDER BY table_name, column_name;
    `);
    console.log('Columns present:', checks.rows);

    const baseline = await client.query(`
      SELECT name, applied_at FROM public.schema_patches_applied
      WHERE name IN ('dashboard_unread_baseline_v1', 'dashboard_customer_unread_baseline_v1')
      ORDER BY name;
    `);
    console.log('Baseline patches:', baseline.rows);

    const unreadAdmin = await client.query(`
      SELECT
        (SELECT count(*)::int FROM user_tasks
          WHERE type = 'CUSTOM' AND staff_id > 0 AND status = 1
            AND admin_opened_at IS NULL) AS new_reports_unread,
        (SELECT count(*)::int FROM report_faults
          WHERE staff_id > 0 AND status != 4
            AND admin_opened_at IS NULL) AS faults_unread;
    `);
    console.log('Admin unread counts (should be 0 after baseline):', unreadAdmin.rows[0]);

    const unreadCustomer = await client.query(`
      SELECT
        (SELECT count(*)::int FROM user_tasks
          WHERE type = 'CUSTOM' AND staff_id > 0 AND status = 1
            AND customer_opened_at IS NULL) AS new_reports_unread,
        (SELECT count(*)::int FROM report_faults
          WHERE staff_id > 0 AND status != 4
            AND customer_opened_at IS NULL) AS faults_unread;
    `);
    console.log('Customer unread counts (should be 0 after baseline):', unreadCustomer.rows[0]);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
