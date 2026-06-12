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

  for (const id of [163, 162, 207]) {
    const ut = await c.query(`SELECT id, check_in, created_at FROM user_tasks WHERE id=$1`, [id]);
    const r = ut.rows[0];
    console.log('\n#' + id, 'check_in', r.check_in?.toISOString?.(), 'created_at', r.created_at?.toISOString?.());

    const reps = await c.query(
      `SELECT name, type, value FROM user_task_reports WHERE user_task_id=$1 ORDER BY "order"`,
      [id],
    );
    let maxTs = 0;
    for (const row of reps.rows) {
      const val = String(row.value || '');
      const re = /\/(\d{13})(?:-|\.)/g;
      let m;
      while ((m = re.exec(val)) !== null) {
        const ts = Number(m[1]);
        if (ts > maxTs) maxTs = ts;
      }
      if (/photo|image|media|time|date|report/i.test(row.name + row.type)) {
        console.log(`  ${row.type} | ${row.name}: ${val.slice(0, 100)}`);
      }
    }
    if (maxTs) {
      console.log('  max media epoch:', maxTs, '->', moment(maxTs).toISOString(), 'AU+10:', moment(maxTs).utcOffset('+10:00').format('DD/MM/YYYY HH:mm:ss'));
    }

    const checkIn = moment(r.check_in);
    const created = moment(r.created_at);
    const media = maxTs ? moment(maxTs) : null;
    console.log('  checkIn AU+10:', checkIn.utcOffset('+10:00').format('DD/MM/YYYY HH:mm:ss'));
    console.log('  created AU+10:', created.utcOffset('+10:00').format('DD/MM/YYYY HH:mm:ss'));
    if (media) console.log('  media diff checkIn min:', media.diff(checkIn, 'minutes'), 'media diff created min:', media.diff(created, 'minutes'));
  }

  await c.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
