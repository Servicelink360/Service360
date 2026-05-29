/**
 * Quick check: sites list ORDER BY staff count
 * Run: node scripts/test-sites-staff-sort.js
 */
const { Client } = require('pg');

async function main() {
  const c = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: +(process.env.DATABASE_PORT || 5432),
    user: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || '123456',
    database: process.env.DATABASE_DB_NAME || 'service360',
  });
  await c.connect();
  const sql = `
    SELECT s.id, s.name,
      (SELECT COUNT(DISTINCT sis.staff_id)
       FROM site_item_staffs sis
       INNER JOIN site_items si ON si.id = sis.site_item_id
       INNER JOIN users st ON st.id = sis.staff_id AND st.status <> 4
       WHERE si.site_id = s.id) AS staff_count
    FROM sites s
    ORDER BY staff_count DESC, s.id DESC
    LIMIT 5
  `;
  const r = await c.query(sql);
  console.log(r.rows);
  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
