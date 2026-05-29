require('dotenv').config();
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
  const r = await c.query(`
    SELECT ranked.site_id
    FROM (
      SELECT uniq.site_id, uniq.staff_cnt
      FROM (
        SELECT DISTINCT ON (s.id)
          s.id AS site_id,
          (
            SELECT COUNT(DISTINCT sis.staff_id)
            FROM site_item_staffs sis
            INNER JOIN site_items si ON si.id = sis.site_item_id
            INNER JOIN users st ON st.id = sis.staff_id AND st.status <> 4
            WHERE si.site_id = s.id
          ) AS staff_cnt
        FROM sites s
        ORDER BY s.id
      ) uniq
      ORDER BY uniq.staff_cnt DESC, uniq.site_id DESC
      LIMIT 10 OFFSET 0
    ) ranked
  `);
  console.log('rows', r.rows);
  console.log('ids', r.rows.map((x) => x.site_id));
  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
