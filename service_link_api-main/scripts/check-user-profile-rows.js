/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Client } = require('pg');

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

async function main() {
  const c = new Client({
    host: process.env.DATABASE_HOST,
    port: +process.env.DATABASE_PORT,
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DB_NAME,
  });
  await c.connect();
  const users = await c.query(`
    SELECT u.id, u.email, u.type, s.id AS staff_row, cust.user_id AS customer_row
    FROM users u
    LEFT JOIN staff s ON s.user_id = u.id
    LEFT JOIN customers cust ON cust.user_id = u.id
    WHERE u.id IN (139, 145, 146)
  `);
  console.table(users.rows);
  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
