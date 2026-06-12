#!/usr/bin/env node
require('dotenv').config({ path: '/usr/src/app/.env' });
const { Client } = require('pg');

async function main() {
  const c = new Client({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DB_NAME,
    port: Number(process.env.DATABASE_PORT || 5432),
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });
  await c.connect();

  const customers = await c.query(`
    SELECT u.id, u.full_name, u.email, u.position, u.type,
           c.company_name, c.company_id, c.company_email, c.company_phone,
           cc.name AS linked_company_name
    FROM users u
    JOIN customers c ON c.user_id = u.id
    LEFT JOIN customer_companies cc ON cc.id = c.company_id
    WHERE u.type = 1 AND u.status = 1
    ORDER BY u.full_name
  `);

  const companies = await c.query(`
    SELECT id, name FROM customer_companies ORDER BY name
  `);

  console.log('=== CUSTOMER USERS (type=1) ===');
  console.log(JSON.stringify(customers.rows, null, 2));
  console.log('=== COMPANIES (customer_companies) ===');
  console.log(JSON.stringify(companies.rows, null, 2));
  await c.end();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
