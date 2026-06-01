const { Client } = require('pg');

(async () => {
  const c = new Client({
    host: process.env.DATABASE_HOST,
    port: +(process.env.DATABASE_PORT || 5432),
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DB_NAME,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });
  await c.connect();

  const sample = await c.query(`
    SELECT utr.id, utr.name, utr.type, LEFT(utr.value, 200) AS value_preview, ut.created_at, rt.name AS template_name
    FROM user_task_reports utr
    JOIN user_tasks ut ON ut.id = utr.user_task_id
    LEFT JOIN report_templates rt ON rt.id = ut.report_template_id
    WHERE utr.type = 'IMAGES' AND utr.value IS NOT NULL AND utr.value != '[]'
    ORDER BY ut.created_at DESC
    LIMIT 5
  `);

  const old = await c.query(`
    SELECT utr.id, LEFT(utr.value, 300) AS value_preview, ut.created_at
    FROM user_task_reports utr
    JOIN user_tasks ut ON ut.id = utr.user_task_id
    WHERE utr.type = 'IMAGES' AND utr.value LIKE '%api.service360.com.au%'
    ORDER BY ut.created_at ASC
    LIMIT 3
  `);

  const hosts = await c.query(`
    SELECT
      CASE
        WHEN value LIKE '%service360basket.s3%' THEN 's3'
        WHEN value LIKE '%13.55.122.55%' THEN 'new-ec2'
        WHEN value LIKE '%3.104.215.45%' THEN 'old-ec2'
        WHEN value LIKE '%api.service360.com.au%' THEN 'api-domain-local'
        ELSE 'other'
      END AS host_kind,
      COUNT(*)::int AS cnt
    FROM user_task_reports
    WHERE type = 'IMAGES' AND value IS NOT NULL AND value != '[]'
    GROUP BY 1
    ORDER BY cnt DESC
  `);

  console.log('=== recent ===');
  console.log(JSON.stringify(sample.rows, null, 2));
  console.log('=== oldest api.service360.com.au ===');
  console.log(JSON.stringify(old.rows, null, 2));
  console.log('=== host breakdown ===');
  console.log(JSON.stringify(hosts.rows, null, 2));

  await c.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
