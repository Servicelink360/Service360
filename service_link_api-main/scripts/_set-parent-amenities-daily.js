/* eslint-disable no-console */
/**
 * Parent amenity sites (Mascot / Bayside Public Amenities) receive the daily
 * New Reports uploads, but had no frequency — monthly pack showed 0 scheduled.
 * Set Public Amenities Cleaning to simple: 1 times per 1 day.
 */
require('./load-env');
const { Client } = require('pg');

const NAMES = ['Mascot Public Amenities', 'Bayside Public Amenities'];

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
            si.frequency_times, si.frequency_count, si.frequency_period,
            st.address_name
     FROM site_items si
     JOIN sites st ON st.id = si.site_id
     JOIN services sv ON sv.id = si.service_id
     WHERE st.name = ANY($1::text[])
       AND sv.name = 'Public Amenities Cleaning'
     ORDER BY st.name`,
    [NAMES],
  );
  console.log('before', before.rows);

  const updated = await client.query(
    `UPDATE site_items si
     SET frequency_type = 'simple',
         frequency_times = 1,
         frequency_count = 1,
         frequency_period = 'day',
         frequency_mode = 'interval'
     FROM sites st, services sv
     WHERE si.site_id = st.id
       AND si.service_id = sv.id
       AND st.name = ANY($1::text[])
       AND sv.name = 'Public Amenities Cleaning'
     RETURNING si.id, st.name AS site,
               si.frequency_times, si.frequency_count, si.frequency_period`,
    [NAMES],
  );
  console.log('updated', updated.rows);
  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
