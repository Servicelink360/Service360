const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function loadEnv(file, override) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (override || process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}

loadEnv(path.join(__dirname, '..', '.env'), false);
loadEnv(path.join(__dirname, '..', '.env.local'), true);

(async () => {
  const client = new Client({
    host: process.env.DATABASE_HOST || '127.0.0.1',
    port: Number(process.env.DATABASE_PORT || 5432),
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DB_NAME,
  });
  await client.connect();
  const rows = await client.query(
    `SELECT t.id, t.sort_order, t.title
     FROM training_topics t
     JOIN training_modules m ON m.id = t.module_id
     WHERE m.code = 'M3'
     ORDER BY t.sort_order`,
  );
  for (const r of rows.rows) console.log(r.sort_order, r.id, JSON.stringify(r.title));
  const cont = await client.query(
    `SELECT m.code, t.title FROM training_topics t
     JOIN training_modules m ON m.id = t.module_id
     WHERE t.title ILIKE '%cont%'
     ORDER BY m.code, t.sort_order`,
  );
  console.log('---continued---');
  for (const r of cont.rows) console.log(r.code, JSON.stringify(r.title));
  await client.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
