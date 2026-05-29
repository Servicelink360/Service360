require('dotenv').config();
const { Client } = require('pg');

(async () => {
  const c = new Client({
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT,
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DB_NAME,
  });
  await c.connect();
  const r = await c.query(`
    SELECT u.id, u.username, u.email, u.type, u.status, c.company_name
    FROM users u
    LEFT JOIN customers c ON c.user_id = u.id
    WHERE u.id >= 136
    ORDER BY u.id
  `);
  console.table(r.rows);
  const n = await c.query(`
    SELECT COUNT(*)::int AS total
    FROM users u
    WHERE u.type = 1 AND u.status <> 4
  `);
  console.log('Eligible customers (type=1, status!=4):', n.rows[0].total);
  await c.end();
})();
