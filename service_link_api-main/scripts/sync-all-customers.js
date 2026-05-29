const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function main() {
  const c = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '123456',
    database: 'service360',
  });
  await c.connect();
  const sql = fs.readFileSync(
    path.join(__dirname, '../database/migrations/012_customer_companies_shared_id.sql'),
    'utf8',
  );
  await c.query(sql);
  const r = await c.query(`
    SELECT u.id AS user_id, u.email, c.company_id, cc.name AS company_name
    FROM users u
    JOIN customers c ON c.user_id = u.id
    LEFT JOIN customer_companies cc ON cc.id = c.company_id
    WHERE u.type = 1 AND u.status != 4
    ORDER BY cc.id, u.id
  `);
  console.log('Customers:', r.rows.length);
  console.log(JSON.stringify(r.rows, null, 2));
  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
