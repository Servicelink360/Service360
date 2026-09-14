const { Client } = require('pg');

const SAMPLE_IMAGE =
  'https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-09-10/1789003792770-hero-1783906000684.webp';

async function main() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '123456',
    database: 'service360',
  });
  await client.connect();

  const value = JSON.stringify([SAMPLE_IMAGE]);
  const r = await client.query(
    `UPDATE user_task_reports
     SET value = $1
     WHERE user_task_id = 666
       AND name = 'Incident photos / evidence'
     RETURNING id, name, value`,
    [value],
  );
  console.log('updated', r.rows[0]);
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
