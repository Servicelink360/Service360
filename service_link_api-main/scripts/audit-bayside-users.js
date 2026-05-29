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

  console.log('\n=== users (Bayside) ===');
  const users = await c.query(`
    SELECT u.id, u.email, u.username, u.type, u.status, u.first_name, u.last_name
    FROM users u
    LEFT JOIN customers cust ON cust.user_id = u.id
    LEFT JOIN customer_companies cc ON cc.id = cust.company_id
    WHERE u.email ILIKE '%bayside%' OR cc.name ILIKE '%Bayside%'
    ORDER BY u.id
  `);
  console.table(users.rows);

  console.log('\n=== customers + company ===');
  const cust = await c.query(`
    SELECT cust.user_id, cust.company_id, cc.name AS company, cust.company_name
    FROM customers cust
    LEFT JOIN customer_companies cc ON cc.id = cust.company_id
    WHERE cust.user_id IN (SELECT id FROM users WHERE email ILIKE '%bayside%')
       OR cust.company_id IN (SELECT company_id FROM customers WHERE user_id IN (139,145,146))
  `);
  console.table(cust.rows);

  console.log('\n=== staff rows (should be empty for customers) ===');
  const staff = await c.query(`
    SELECT user_id, company_name FROM staff WHERE user_id IN (139, 145, 146)
  `);
  console.table(staff.rows);

  console.log('\n=== user_roles ===');
  const roles = await c.query(`
    SELECT ur.user_id, u.email, ur.role_id
    FROM user_roles ur
    JOIN users u ON u.id = ur.user_id
    WHERE ur.user_id IN (139, 145, 146)
  `);
  console.table(roles.rows);

  console.log('\n=== site_items (customer_id on assignments) ===');
  const items = await c.query(`
    SELECT si.id, si.site_id, s.name AS site_name, si.service_id, si.customer_id,
           si.company_id, u.email AS assigned_customer_email
    FROM site_items si
    JOIN sites s ON s.id = si.site_id
    LEFT JOIN users u ON u.id = si.customer_id
    WHERE si.company_id = 1
       OR si.customer_id IN (139, 145, 146)
    ORDER BY si.site_id, si.service_id
  `);
  console.table(items.rows);

  console.log('\n=== tasks report_template_id per site_item ===');
  const tasks = await c.query(`
    SELECT t.id, t.site_item_id, t.report_template_id, rt.name AS template_name,
           si.customer_id, si.site_id
    FROM tasks t
    JOIN site_items si ON si.id = t.site_item_id
    LEFT JOIN report_templates rt ON rt.id = t.report_template_id
    WHERE si.company_id = 1 OR si.customer_id IN (139, 145, 146)
    ORDER BY si.site_id
    LIMIT 20
  `);
  console.table(tasks.rows);

  console.log('\n=== user_tasks by customer_id ===');
  const ut = await c.query(`
    SELECT customer_id, COUNT(*)::int AS n,
           MIN(report_template_id) AS min_tpl, MAX(report_template_id) AS max_tpl
    FROM user_tasks WHERE type = 'CUSTOM' AND customer_id IN (139, 145, 146)
    GROUP BY customer_id
  `);
  console.table(ut.rows);

  console.log('\n=== sample templates per site (Jessica reports) ===');
  const samples = await c.query(`
    SELECT DISTINCT site_id, service_id, report_template_id
    FROM user_tasks WHERE customer_id = 139 AND type = 'CUSTOM'
    ORDER BY site_id LIMIT 10
  `);
  console.table(samples.rows);

  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
