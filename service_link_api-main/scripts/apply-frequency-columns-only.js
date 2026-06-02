/**
 * Live DB: add site_items frequency columns only (no row updates).
 * Usage: node scripts/apply-frequency-columns-only.js
 */
require('dotenv').config();
const { Client } = require('pg');

// Must match entity site-item.entity.ts + migrations 034/035 on PC.
const DDL = [
  'ALTER TABLE public.site_items ADD COLUMN IF NOT EXISTS frequency_times INT NULL',
  'ALTER TABLE public.site_items ADD COLUMN IF NOT EXISTS frequency_count INT NULL',
  "ALTER TABLE public.site_items ADD COLUMN IF NOT EXISTS frequency_period VARCHAR(16) NULL",
];

(async () => {
  const c = new Client({
    host: process.env.DATABASE_HOST,
    port: +(process.env.DATABASE_PORT || 5432),
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DB_NAME,
    ssl:
      String(process.env.DATABASE_SSL || '').toLowerCase() === 'true'
        ? { rejectUnauthorized: false }
        : false,
  });
  await c.connect();
  console.log('Connected:', process.env.DATABASE_DB_NAME);

  for (const sql of DDL) {
    console.log('>', sql);
    await c.query(sql);
  }

  const { rows } = await c.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'site_items'
      AND column_name IN ('frequency_count', 'frequency_period', 'frequency_times')
    ORDER BY column_name
  `);
  console.log('Columns on site_items:');
  for (const r of rows) {
    console.log(`  ${r.column_name} (${r.data_type}, nullable=${r.is_nullable})`);
  }

  const sample = await c.query(`
    SELECT COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE frequency_count IS NOT NULL)::int AS with_count,
           COUNT(*) FILTER (WHERE frequency_period IS NOT NULL)::int AS with_period,
           COUNT(*) FILTER (WHERE frequency_times IS NOT NULL)::int AS with_times
    FROM site_items
  `);
  console.log('Row data unchanged (NULL until set in admin):', sample.rows[0]);

  await c.end();
  console.log('Done.');
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
