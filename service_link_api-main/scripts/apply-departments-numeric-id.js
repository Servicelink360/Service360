/**
 * Apply SERVICES.id VARCHAR → INTEGER migration.
 * Usage: node scripts/apply-SERVICES-numeric-id.js
 */
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Client } = require('pg');

for (const p of [path.join(process.cwd(), '.env'), path.join(__dirname, '..', '.env')]) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

async function main() {
  const c = new Client({
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DB_NAME || 'service360',
  });
  await c.connect();

  const typeRes = await c.query(`
    SELECT data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'id'
  `);
  const dt = typeRes.rows[0]?.data_type;
  console.log('SERVICES.id column type:', dt || '(missing)');

  if (['integer', 'bigint', 'smallint'].includes(dt)) {
    console.log('Already numeric — no migration needed.');
  } else {
    const sqlPath = path.join(__dirname, '..', 'database', 'migrations', '014_departments_numeric_id.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await c.query(sql);
    console.log('Migration 014 applied.');
    await c.query(`
      INSERT INTO public.schema_patches_applied (name)
      VALUES ('services_numeric_id_v1')
      ON CONFLICT (name) DO NOTHING
    `).catch(() => {});
  }

  const rows = await c.query('SELECT id, name, description FROM public.services ORDER BY id');
  console.log('\nCurrent SERVICES:');
  console.table(rows.rows);

  const colType = await c.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'site_items' AND column_name = 'service_id'
  `);
  console.log('site_items.service_id type:', colType.rows[0]?.data_type);

  const fkCheck = await c.query(`
    SELECT COUNT(*)::int AS cnt FROM public.site_items si
    LEFT JOIN public.services d ON d.id = si.service_id
    WHERE si.service_id IS NOT NULL AND d.id IS NULL
  `);
  if (fkCheck.rows[0]?.cnt > 0) {
    console.warn('Warning: site_items with orphan service_id:', fkCheck.rows[0].cnt);
  } else {
    console.log('site_items: all service_id values match SERVICES.id');
  }

  await c.end();
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
