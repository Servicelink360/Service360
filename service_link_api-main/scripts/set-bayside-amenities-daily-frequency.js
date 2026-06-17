/* eslint-disable no-console */
/**
 * Set simple frequency "1 times per 1 day" on Bayside Public Amenities site_items
 * for job sites 214–228 (local DB only).
 */
require('./load-env');
const { Client } = require('pg');

const dryRun = process.argv.includes('--dry-run');
const allowRemote = process.argv.includes('--allow-remote');

const SITE_IDS = Array.from({ length: 15 }, (_, i) => 214 + i);
const SERVICE_NAME = 'Public Amenities Cleaning';

function assertLocalHost() {
  const host = (process.env.DATABASE_HOST || 'localhost').toLowerCase();
  if (!allowRemote && !['localhost', '127.0.0.1', '::1'].includes(host)) {
    throw new Error(`Refusing remote host "${host}"`);
  }
}

async function main() {
  assertLocalHost();
  const client = new Client({
    host: process.env.DATABASE_HOST,
    port: +process.env.DATABASE_PORT,
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DB_NAME,
  });
  await client.connect();

  const { rows } = await client.query(
    `
    SELECT si.id, si.site_id, s.name,
           si.frequency_type, si.frequency_times, si.frequency_count,
           si.frequency_period, si.frequency_mode
    FROM site_items si
    JOIN sites s ON s.id = si.site_id
    JOIN services sv ON sv.id = si.service_id
    WHERE si.site_id = ANY($1::int[])
      AND sv.name = $2
    ORDER BY si.site_id
    `,
    [SITE_IDS, SERVICE_NAME],
  );

  console.log(`Matched ${rows.length} site_item row(s)`);
  for (const r of rows) {
    console.log(
      `  site ${r.site_id} item ${r.id}: ${r.frequency_type ?? 'null'} ${r.frequency_times ?? '-'}x per ${r.frequency_count ?? '-'} ${r.frequency_period ?? '-'}`,
    );
  }

  if (!rows.length) {
    await client.end();
    return;
  }

  if (dryRun) {
    console.log('Dry run — would set simple 1 times per 1 day (interval).');
    await client.end();
    return;
  }

  const ids = rows.map((r) => r.id);
  await client.query(
    `
    UPDATE site_items
    SET frequency_type = 'simple',
        frequency_times = 1,
        frequency_count = 1,
        frequency_period = 'day',
        frequency_mode = 'interval'
    WHERE id = ANY($1::int[])
    `,
    [ids],
  );
  console.log(`Updated ${ids.length} site_item row(s) to simple: 1 times per 1 day.`);
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
