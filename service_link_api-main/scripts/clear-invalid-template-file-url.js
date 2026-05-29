const { Client } = require('pg');

async function main() {
  const id = +(process.argv[2] || 38);
  const c = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '123456',
    database: 'service360',
  });
  await c.connect();
  const before = await c.query('SELECT id, name, file_url FROM report_templates WHERE id = $1', [id]);
  if (!before.rows[0]) {
    throw new Error(`Template ${id} not found`);
  }
  const url = String(before.rows[0].file_url ?? '').trim();
  if (url && !/^https?:\/\//i.test(url) && !url.startsWith('/')) {
    await c.query(`UPDATE report_templates SET file_url = '' WHERE id = $1`, [id]);
    console.log(`Cleared invalid file_url "${url}" on template ${id}`);
  } else {
    console.log(`No change needed (file_url="${url}")`);
  }
  await c.end();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
