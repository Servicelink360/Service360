const { Client } = require('pg');
const moment = require('moment');

(async () => {
  const c = new Client({
    host: process.env.DATABASE_HOST,
    port: +(process.env.DATABASE_PORT || 5432),
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DB_NAME,
    ssl: String(process.env.DATABASE_SSL || '').toLowerCase() === 'true'
      ? { rejectUnauthorized: false }
      : false,
  });
  await c.connect();

  const rows = await c.query(`
    SELECT id, check_in, created_at
    FROM user_tasks
    WHERE type = 'CUSTOM' AND check_in IS NOT NULL AND created_at IS NOT NULL
    ORDER BY id
  `);

  let skewed = 0;
  for (const r of rows.rows) {
    const diff = moment(r.check_in).diff(moment(r.created_at), 'minutes');
    if (diff >= 540 && diff <= 660) {
      skewed++;
      if (skewed <= 10) {
        console.log(
          `#${r.id} skew=${diff}min check_in=${r.check_in.toISOString()} created=${r.created_at.toISOString()}`,
        );
      }
    }
  }
  console.log('Total +10h skew rows:', skewed, '/', rows.rows.length);

  await c.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
