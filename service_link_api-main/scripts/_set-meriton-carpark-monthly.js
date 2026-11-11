/* eslint-disable no-console */
/** Set Meriton Carpark / Car park cleaning to simple frequency: 1 times per 1 month. */
require('./load-env');
const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: process.env.DATABASE_HOST,
    port: +process.env.DATABASE_PORT || 5432,
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DB_NAME,
  });
  await client.connect();

  const before = await client.query(
    `SELECT si.id, st.name AS site, sv.name AS service,
            si.frequency_type, si.frequency_times, si.frequency_count,
            si.frequency_period, si.frequency_mode
     FROM site_items si
     JOIN sites st ON st.id = si.site_id
     JOIN services sv ON sv.id = si.service_id
     WHERE sv.name ILIKE '%car park%'
       AND st.name ILIKE '%meriton%'`,
  );
  console.log('before', before.rows);

  if (!before.rows.length) {
    console.log('No matching site_items');
    await client.end();
    return;
  }

  const updated = await client.query(
    `UPDATE site_items si
     SET frequency_type = 'simple',
         frequency_times = 1,
         frequency_count = 1,
         frequency_period = 'month',
         frequency_mode = 'interval'
     FROM services sv, sites st
     WHERE si.service_id = sv.id
       AND si.site_id = st.id
       AND sv.name ILIKE '%car park%'
       AND st.name ILIKE '%meriton%'
     RETURNING si.id, st.name AS site, sv.name AS service,
               si.frequency_times, si.frequency_count, si.frequency_period`,
  );
  console.log('updated', updated.rows);
  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
