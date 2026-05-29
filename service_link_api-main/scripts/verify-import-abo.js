require('dotenv').config();
const { Client } = require('pg');

(async () => {
  const c = new Client({
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT,
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DB_NAME,
  });
  await c.connect();
  const u = await c.query(
    `SELECT id, full_name, email, type FROM users WHERE email = 'a1arborist@outlook.com'`,
  );
  const sites = await c.query(`SELECT COUNT(*)::int AS n FROM sites`);
  const linked = await c.query(`
    SELECT COUNT(DISTINCT si.site_id)::int AS n
    FROM site_item_staffs sis
    JOIN site_items si ON si.id = sis.site_item_id
    JOIN users u ON u.id = sis.staff_id
    WHERE u.email = 'a1arborist@outlook.com'
  `);
  const sample = await c.query(`
    SELECT s.id, s.name, d.name AS dept, u.full_name AS customer
    FROM sites s
    JOIN site_items si ON si.site_id = s.id
    JOIN SERVICES d ON d.id = si.service_id
    JOIN users u ON u.id = si.customer_id
    JOIN site_item_staffs sis ON sis.site_item_id = si.id
    JOIN users st ON st.id = sis.staff_id
    WHERE st.email = 'a1arborist@outlook.com'
    ORDER BY s.id LIMIT 5
  `);
  console.log('User:', u.rows[0]);
  console.log('Total sites:', sites.rows[0].n);
  console.log('Abo linked sites:', linked.rows[0].n);
  console.log('Sample rows:');
  console.table(sample.rows);
  await c.end();
})();
