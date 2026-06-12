require('dotenv').config();
const { Client } = require('pg');

const COUNT_SQL = `
  SELECT COUNT(*)::int
  FROM site_items si
  INNER JOIN services dep ON dep.id = si.service_id
  INNER JOIN users cu ON cu.id = si.customer_id AND cu.status <> 4
  WHERE si.site_id = s.id
`;

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

  const dist = await c.query(`
    SELECT svc_cnt, COUNT(*)::int AS sites
    FROM (
      SELECT s.id, (${COUNT_SQL}) AS svc_cnt
      FROM sites s
    ) x
    GROUP BY svc_cnt
    ORDER BY svc_cnt DESC
  `);
  console.log('Sites by service count (same rule as admin column):');
  for (const r of dist.rows) {
    console.log(`  ${r.svc_cnt} service(s): ${r.sites} site(s)`);
  }

  const two = await c.query(`
    SELECT s.id, s.name
    FROM sites s
    WHERE (${COUNT_SQL}) = 2
    ORDER BY s.name
  `);
  console.log(`\nSites with exactly 2 services: ${two.rowCount}`);

  const sampleNames = [
    'Globe Wilkins%',
    'Balmain Town%',
    'Tempe Reserve%',
    'St Peters Town%',
    'St Peters Depot%',
  ];
  const sample = await c.query(
    `
    SELECT s.name,
      (SELECT COUNT(*)::int FROM site_items si WHERE si.site_id = s.id) AS raw_items,
      (${COUNT_SQL}) AS counted
    FROM sites s
    WHERE s.name ILIKE ANY($1::text[])
    ORDER BY s.name
  `,
    [sampleNames],
  );
  console.log('\nSample sites from your list:');
  for (const r of sample.rows) {
    console.log(`  ${r.name}: raw=${r.raw_items}, column=${r.counted}`);
  }

  await c.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
