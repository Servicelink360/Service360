require('./load-env');
const { Client } = require('pg');
(async () => {
  const c = new Client({
    host: process.env.DATABASE_HOST,
    port: +process.env.DATABASE_PORT || 5432,
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DB_NAME,
  });
  await c.connect();
  const r = await c.query(
    `SELECT st.id, st.name, st.address_name,
            si.frequency_times, si.frequency_count, si.frequency_period
     FROM sites st
     JOIN site_items si ON si.site_id = st.id
     JOIN services sv ON sv.id = si.service_id
     WHERE st.name = 'Bayside Public Amenities'
       AND sv.name = 'Public Amenities Cleaning'`,
  );
  console.log(JSON.stringify(r.rows, null, 2));
  await c.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
