require('dotenv').config({ path: require('path').join(__dirname, '../.env.prod') });
const { Client } = require('pg');
const moment = require('moment');

const AU = '+10:00';

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

  // Admin list: all CUSTOM completed (status=1), no staff self-filter
  const admin = await c.query(`
    SELECT id, site_name, staff_id, created_by, check_in, created_at, updated_at,
           pdf_file IS NOT NULL AND pdf_file <> '' AS has_pdf
    FROM user_tasks
    WHERE type = 'CUSTOM' AND status = 1
    ORDER BY COALESCE(check_in, created_at) DESC
    LIMIT 25
  `);

  // Staff list (Adam 140): same + created_by = staff_id
  const staff = await c.query(`
    SELECT id, site_name, staff_id, created_by, check_in, created_at, updated_at,
           pdf_file IS NOT NULL AND pdf_file <> '' AS has_pdf
    FROM user_tasks
    WHERE type = 'CUSTOM' AND status = 1 AND staff_id = 140 AND created_by = 140
    ORDER BY COALESCE(check_in, created_at) DESC
    LIMIT 25
  `);

  const fmt = (row) => {
    const t = row.check_in || row.created_at;
    const au = moment(t).utcOffset(AU).format('DD/MM/YYYY HH:mm');
    const plain = moment(t).format('DD/MM/YYYY HH:mm');
    return { id: row.id, site: row.site_name, check_in: row.check_in, au, plain, has_pdf: row.has_pdf };
  };

  console.log('=== ADMIN top 25 (all CUSTOM completed) ===');
  console.log('count:', admin.rows.length, '(total query)');
  admin.rows.slice(0, 5).forEach((r) => console.log(fmt(r)));

  console.log('\n=== STAFF Adam top 25 (created_by=staff_id) ===');
  console.log('count:', staff.rows.length);
  staff.rows.slice(0, 5).forEach((r) => console.log(fmt(r)));

  const totals = await c.query(`
    SELECT
      COUNT(*) FILTER (WHERE type='CUSTOM' AND status=1)::int AS admin_visible,
      COUNT(*) FILTER (WHERE type='CUSTOM' AND status=1 AND staff_id=140 AND created_by=140)::int AS staff_adam_visible,
      COUNT(*) FILTER (WHERE type='CUSTOM' AND status=1 AND staff_id=140 AND created_by<>140)::int AS admin_created_for_adam_hidden_from_staff
    FROM user_tasks
  `);
  console.log('\n=== TOTALS ===', totals.rows[0]);

  await c.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
