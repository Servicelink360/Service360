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
  const { rows } = await c.query(`
    SELECT u.id, u.email, u.full_name, u.username, u.type, u.status,
           u.created_at, u.last_login,
           s.company_name,
           COALESCE(json_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL), '[]') AS roles
    FROM users u
    LEFT JOIN staff s ON s.user_id = u.id
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    LEFT JOIN roles r ON r.id = ur.role_id
    WHERE u.type = 3 AND u.status = 1
    GROUP BY u.id, s.company_name
    ORDER BY u.id
  `);
  console.log(JSON.stringify(rows, null, 2));
  await c.end();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
