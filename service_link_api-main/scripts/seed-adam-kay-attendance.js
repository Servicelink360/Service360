/**
 * Seed sample site attendance (user_daily_jobs + items) for Adam Kay.
 * Usage: node scripts/seed-adam-kay-attendance.js
 */
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Client } = require('pg');

const envPaths = [
  path.join(process.cwd(), '.env'),
  path.join(__dirname, '..', '.env'),
];
for (const p of envPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

async function main() {
  const client = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: +(process.env.DATABASE_PORT || 5432),
    user: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DB_NAME || 'service360',
  });
  await client.connect();

  const staffRes = await client.query(
    `SELECT id, full_name, username FROM users
     WHERE (full_name ILIKE '%adam%' AND full_name ILIKE '%kay%')
        OR full_name ILIKE '%adam kay%'
     ORDER BY id LIMIT 5`,
  );
  if (!staffRes.rows.length) {
    console.error('No user found matching Adam Kay.');
    await client.end();
    process.exit(1);
  }
  const staff = staffRes.rows[0];
  console.log('Staff:', staff.id, staff.full_name || staff.username);

  const siteRes = await client.query(
    `SELECT DISTINCT s.id, s.name, s.location
     FROM sites s
     INNER JOIN site_items si ON si.site_id = s.id
     INNER JOIN site_item_staffs sis ON sis.site_item_id = si.id
     WHERE sis.staff_id = $1
     ORDER BY s.id
     LIMIT 1`,
    [staff.id],
  );
  let site = siteRes.rows[0];
  if (!site) {
    const anySite = await client.query(
      `SELECT id, name, location FROM sites ORDER BY id LIMIT 1`,
    );
    site = anySite.rows[0];
    console.warn('Adam not on a site; using first site:', site?.name);
  } else {
    console.log('Site:', site.id, site.name);
  }
  if (!site) {
    console.error('No sites in database.');
    await client.end();
    process.exit(1);
  }

  const existing = await client.query(
    `SELECT COUNT(*)::int AS c FROM user_daily_jobs WHERE staff_id = $1`,
    [staff.id],
  );
  console.log('Existing user_daily_jobs for staff:', existing.rows[0].c);

  const days = [
    { dayOffset: 5, inH: 8, inM: 0, outH: 16, outM: 30 },
    { dayOffset: 4, inH: 7, inM: 45, outH: 15, outM: 15 },
    { dayOffset: 3, inH: 9, inM: 10, outH: 17, outM: 0 },
    { dayOffset: 2, inH: 8, inM: 30, outH: 16, outM: 45 },
    { dayOffset: 1, inH: 8, inM: 0, outH: 12, outM: 0 },
    { dayOffset: 0, inH: 7, inM: 30, outH: 15, outM: 45 },
  ];

  let inserted = 0;
  for (const d of days) {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    base.setDate(base.getDate() - d.dayOffset);

    const checkIn = new Date(base);
    checkIn.setHours(d.inH, d.inM, 0, 0);
    const checkOut = new Date(base);
    checkOut.setHours(d.outH, d.outM, 0, 0);

    const jobRes = await client.query(
      `INSERT INTO user_daily_jobs (
        site_id, site_location, staff_id, date,
        created_at, updated_at, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $5, $6, $6)
      RETURNING id`,
      [
        site.id,
        site.location || '',
        staff.id,
        base,
        checkIn,
        staff.id,
      ],
    );
    const jobId = jobRes.rows[0].id;

    await client.query(
      `INSERT INTO user_daily_job_items (
        user_daily_job_id, type, check_in, check_out, created_at
      ) VALUES ($1, 1, $2, $3, $2)`,
      [jobId, checkIn, checkOut],
    );
    inserted += 1;
    console.log(
      `  + ${base.toISOString().slice(0, 10)} ${d.inH}:${String(d.inM).padStart(2, '0')} – ${d.outH}:${String(d.outM).padStart(2, '0')} (job ${jobId})`,
    );
  }

  const verify = await client.query(
    `SELECT i.id, i.check_in, i.check_out, s.name AS site_name
     FROM user_daily_job_items i
     INNER JOIN user_daily_jobs j ON j.id = i.user_daily_job_id
     LEFT JOIN sites s ON s.id = j.site_id
     WHERE j.staff_id = $1 AND i.type = 1
     ORDER BY i.check_in DESC
     LIMIT 10`,
    [staff.id],
  );
  console.log('\nLatest attendance rows for', staff.full_name, ':', verify.rows.length, 'shown');
  verify.rows.forEach((r) => {
    console.log(
      `  item ${r.id} | ${r.site_name} | in ${r.check_in} | out ${r.check_out}`,
    );
  });

  await client.end();
  console.log(`\nDone. Inserted ${inserted} attendance sessions.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
