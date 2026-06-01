const { Client } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.prod') });

async function main() {
  const c = new Client({
    host: process.env.DATABASE_HOST,
    port: +process.env.DATABASE_PORT || 5432,
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DB_NAME,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });
  await c.connect();

  const recent = await c.query(`
    SELECT id, created_at, updated_at, staff_id, type, pdf_file
    FROM user_tasks
    WHERE pdf_file IS NOT NULL AND pdf_file <> ''
    ORDER BY COALESCE(updated_at, created_at) DESC
    LIMIT 20
  `);

  const counts = await c.query(`
    SELECT
      CASE
        WHEN pdf_file LIKE '%service360basket.s3%' THEN 's3'
        WHEN pdf_file LIKE '%3.104.215.45%' THEN 'old-ec2-8001'
        WHEN pdf_file LIKE '%13.55.122.55%' THEN 'ec2-5301'
        WHEN pdf_file LIKE '%public/pdf%' THEN 'local-path'
        ELSE 'other'
      END AS bucket,
      COUNT(*)::int AS n
    FROM user_tasks
    WHERE pdf_file IS NOT NULL AND pdf_file <> ''
    GROUP BY 1
    ORDER BY n DESC
  `);

  console.log('=== Recent PDF URLs ===');
  for (const row of recent.rows) {
    console.log(`${row.id}\t${row.updated_at || row.created_at}\tstaff=${row.staff_id}\t${row.type}\t${row.pdf_file}`);
  }
  console.log('\n=== Counts by URL type ===');
  console.table(counts.rows);

  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
