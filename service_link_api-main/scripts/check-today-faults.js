require('dotenv').config({ path: require('path').join(__dirname, '../.env.prod') });
const { Client } = require('pg');

const STATUS = { 0: 'NEW', 1: 'COMPLETED', 2: 'PENDING', 3: 'INPROGRESS', 4: 'DELETED' };

(async () => {
  const c = new Client({
    host: process.env.DATABASE_HOST,
    port: 5432,
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DB_NAME,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  const todayFaults = await c.query(`
    SELECT id, status, subject, customer_id, staff_id, sender, message, created_at, updated_at
    FROM report_faults
    WHERE created_at >= CURRENT_DATE
    ORDER BY id DESC
  `);

  const last3Days = await c.query(`
    SELECT id, status, subject, created_at,
      CASE WHEN status IN (3, 4) THEN false ELSE true END AS in_default_list
    FROM report_faults
    WHERE created_at >= CURRENT_DATE - INTERVAL '3 days'
    ORDER BY created_at DESC
  `);

  console.log(
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        todayCount: todayFaults.rows.length,
        todayFaults: todayFaults.rows.map((r) => ({
          ...r,
          statusLabel: STATUS[r.status],
          inDefaultList: r.status !== 3 && r.status !== 4,
        })),
        last3Days: last3Days.rows.map((r) => ({
          ...r,
          statusLabel: STATUS[r.status],
        })),
      },
      null,
      2,
    ),
  );

  await c.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
