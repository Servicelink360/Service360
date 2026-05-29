/**
 * Deeper duplicate-row scan (sites-style triplication pattern).
 */
require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const c = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: +(process.env.DATABASE_PORT || 5432),
    user: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DB_NAME || 'service360',
  });
  await c.connect();

  const tables = [
    { table: 'site_items', key: 'id' },
    { table: 'site_item_staffs', key: 'id' },
    { table: 'site_item_staff_shifts', key: 'id' },
    { table: 'tasks', key: 'id' },
    { table: 'task_shifts', key: 'id' },
    { table: 'user_tasks', key: 'id' },
    { table: 'report_faults', key: 'id' },
  ];

  console.log('Table                    | Total | Distinct id | Dup groups | Extra rows');
  console.log('-------------------------|-------|-------------|------------|------------');

  const problems = [];

  for (const { table, key } of tables) {
    const exists = await c.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`,
      [table],
    );
    if (!exists.rowCount) continue;

    const stats = await c.query(`
      SELECT COUNT(*)::int AS total, COUNT(DISTINCT ${key})::int AS distinct_ids
      FROM ${table}
    `);
    const dups = await c.query(`
      SELECT COUNT(*)::int AS groups FROM (
        SELECT ${key} FROM ${table} GROUP BY ${key} HAVING COUNT(*) > 1
      ) x
    `);
    const t = stats.rows[0];
    const extra = t.total - t.distinct_ids;
    console.log(
      `${table.padEnd(24)} | ${String(t.total).padStart(5)} | ${String(t.distinct_ids).padStart(11)} | ${String(dups.rows[0].groups).padStart(10)} | ${String(extra).padStart(10)}`,
    );
    if (extra > 0) {
      problems.push({ table, extra, total: t.total, distinct: t.distinct_ids });
    }
  }

  // site 207 staff display issue
  const s207 = await c.query(`
    SELECT si.id AS site_item_id, sis.id AS sis_id, sis.staff_id, u.status, u.full_name
    FROM site_items si
    LEFT JOIN site_item_staffs sis ON sis.site_item_id = si.id
    LEFT JOIN users u ON u.id = sis.staff_id
    WHERE si.site_id = 207
    ORDER BY si.id, sis.id
    LIMIT 30
  `);
  console.log('\n=== Site 207: items + staff (first 30 rows) ===');
  console.table(s207.rows);

  console.log('\n=== Recommended fixes ===');
  if (problems.length) {
    for (const p of problems) {
      console.log(`- ${p.table}: remove ${p.extra} duplicate row(s) (${p.total} → ${p.distinct} distinct ids), then ADD PRIMARY KEY`);
    }
  } else {
    console.log('- No duplicate-id rows in scanned child tables.');
  }

  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
