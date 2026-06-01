require('dotenv').config({ path: require('path').join(__dirname, '../.env.prod') });
const { Client } = require('pg');

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

  const counts = await c.query(`
    SELECT
      COUNT(*)::int AS total_tasks,
      COUNT(*) FILTER (WHERE pdf_file IS NOT NULL AND pdf_file <> '')::int AS with_pdf,
      COUNT(*) FILTER (WHERE type = 'CUSTOM')::int AS custom_type,
      COUNT(*) FILTER (WHERE type = 'CUSTOM' AND pdf_file IS NOT NULL AND pdf_file <> '')::int AS custom_with_pdf,
      COUNT(*) FILTER (WHERE type = 'CUSTOM' AND status = 1)::int AS custom_completed,
      COUNT(*) FILTER (WHERE type = 'CUSTOM' AND status = 4)::int AS custom_deleted,
      COUNT(*) FILTER (WHERE type != 'CUSTOM' AND pdf_file IS NOT NULL AND pdf_file <> '')::int AS non_custom_with_pdf
    FROM user_tasks
  `);

  const byStatus = await c.query(`
    SELECT status, type, COUNT(*)::int n,
      COUNT(*) FILTER (WHERE pdf_file IS NOT NULL AND pdf_file <> '')::int with_pdf
    FROM user_tasks
    GROUP BY status, type
    ORDER BY n DESC
  `);

  const customPdf = await c.query(`
    SELECT
      COUNT(*) FILTER (WHERE pdf_file LIKE '%service360basket%')::int AS s3,
      COUNT(*) FILTER (WHERE pdf_file LIKE '%3.104.215%')::int AS old_host,
      COUNT(*) FILTER (WHERE pdf_file IS NULL OR pdf_file = '')::int AS no_pdf
    FROM user_tasks WHERE type = 'CUSTOM'
  `);

  console.log('=== Totals ===');
  console.table(counts.rows);
  console.log('\n=== By status + type ===');
  console.table(byStatus.rows);
  console.log('\n=== CUSTOM pdf breakdown ===');
  console.table(customPdf.rows);

  await c.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
