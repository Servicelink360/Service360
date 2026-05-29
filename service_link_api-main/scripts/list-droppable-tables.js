/**
 * List PostgreSQL tables that are safe to drop (not used by the NestJS app).
 *
 * Usage:
 *   node scripts/list-droppable-tables.js
 *   node scripts/list-droppable-tables.js --sql   # print DROP statements (review before running)
 */
/* eslint-disable no-console */
require('dotenv').config();
const { Client } = require('pg');
const { isLegacySuffix2Table } = require('./db-legacy-tables');

/** Tables mapped by TypeORM @Entity in src/ — keep these. */
const APP_TABLES = new Set([
  'customer_admin_message_deletions',
  'customer_admin_messages',
  'customer_admin_threads',
  'customers',
  'SERVICES',
  'groups',
  'items',
  'logs',
  'positions',
  'report_fault_answers',
  'report_faults',
  'report_template_categories',
  'report_template_items',
  'report_templates',
  'roles',
  'schema_patches_applied',
  'settings',
  'site_item_staff_shifts',
  'site_item_staffs',
  'site_items',
  'sites',
  'staff',
  'task_shift_logs',
  'task_shifts',
  'tasks',
  'ticket_answers',
  'tickets',
  'user_daily_job_items',
  'user_daily_jobs',
  'user_groups',
  'user_roles',
  'user_task_reports',
  'user_tasks',
  'user_tokens',
  'users',
]);

/** pg_dump accidents — drop if still present. */
function isShadowSuffix1Table(name) {
  return /1$/.test(name) && !APP_TABLES.has(name);
}

function isDroppable(name) {
  if (APP_TABLES.has(name)) return false;
  if (isLegacySuffix2Table(name)) return true;
  if (isShadowSuffix1Table(name)) return true;
  return false;
}

(async () => {
  const sqlOnly = process.argv.includes('--sql');
  const c = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DB_NAME || 'service360',
  });
  await c.connect();

  const r = await c.query(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);

  const droppable = [];
  const unknown = [];

  for (const { tablename } of r.rows) {
    if (isDroppable(tablename)) droppable.push(tablename);
    else if (!APP_TABLES.has(tablename)) unknown.push(tablename);
  }

  if (!sqlOnly) {
    console.log('=== Safe to drop (legacy *1 / *2 dump tables) ===\n');
    if (!droppable.length) console.log('(none found)\n');
    else droppable.forEach((t) => console.log(`  ${t}`));

    console.log('\n=== In DB but not in app entity list (review manually) ===\n');
    if (!unknown.length) console.log('(none)\n');
    else unknown.forEach((t) => console.log(`  ${t}`));

    console.log(`\nApp uses ${APP_TABLES.size} tables. ${r.rows.length} tables in public schema.`);
    console.log('\nAfter drop: remove import-user-from-users2.js usage if you delete users2.');
    console.log('Generate SQL: node scripts/list-droppable-tables.js --sql\n');
  } else {
    console.log('BEGIN;');
    for (const t of droppable) {
      console.log(`DROP TABLE IF EXISTS public."${t}" CASCADE;`);
    }
    console.log('COMMIT;');
  }

  await c.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
