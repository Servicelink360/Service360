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
    SELECT u.id, u.email, u.username, u.first_name, u.last_name, u.status,
           cust.company_id, cc.name AS company
    FROM users u
    LEFT JOIN customers cust ON cust.user_id = u.id
    LEFT JOIN customer_companies cc ON cc.id = cust.company_id
    WHERE u.type = 1
      AND (u.email ILIKE '%bayside%' OR u.last_name ILIKE '%Bosevska%' OR cc.name ILIKE '%Bayside%')
    ORDER BY u.id
  `);
  console.log('Bayside-related customer users:');
  console.table(users.rows);
  for (const u of users.rows) {
    const tasks = await c.query(
      'SELECT COUNT(*)::int AS n FROM user_tasks WHERE customer_id = $1',
      [u.id],
    );
    const faults = await c.query(
      'SELECT COUNT(*)::int AS n FROM report_faults WHERE customer_id = $1',
      [u.id],
    );
    const sites = await c.query(
      `SELECT COUNT(DISTINCT si.site_id)::int AS n
       FROM site_items si
       WHERE si.customer_id = $1
          OR si.company_id = $2
          OR si.company_id = (SELECT company_id FROM customers WHERE user_id = $1 LIMIT 1)`,
      [u.id, u.company_id],
    );
    console.log(
      `  id=${u.id} ${u.email}: user_tasks=${tasks.rows[0].n}, report_faults=${faults.rows[0].n}, sites(via item)=${sites.rows[0].n}`,
    );
  }
  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
