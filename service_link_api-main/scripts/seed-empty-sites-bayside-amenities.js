/* eslint-disable no-console */
/**
 * For job sites with 0 staff, 0 service, and 0 customer — add:
 *   Service: Public Amenities Cleaning
 *   Staff: Adam Kay
 *   Customer: Bayside Council
 *
 * Local DB only (refuses non-localhost unless --allow-remote).
 *
 * Usage:
 *   node scripts/seed-empty-sites-bayside-amenities.js --dry-run
 *   node scripts/seed-empty-sites-bayside-amenities.js
 */
const path = require('path');
require('./load-env');
const { Client } = require('pg');

const dryRun = process.argv.includes('--dry-run');
const allowRemote = process.argv.includes('--allow-remote');

const SERVICE_NAME = 'Public Amenities Cleaning';
const STAFF_NAME = 'Adam Kay';
const CUSTOMER_COMPANY = 'Bayside Council';

function assertLocalHost() {
  const host = (process.env.DATABASE_HOST || 'localhost').toLowerCase();
  if (
    !allowRemote &&
    host !== 'localhost' &&
    host !== '127.0.0.1' &&
    host !== '::1'
  ) {
    throw new Error(
      `Refusing to run on remote host "${host}". Use --allow-remote only if you mean it.`,
    );
  }
}

async function main() {
  assertLocalHost();

  const client = new Client({
    host: process.env.DATABASE_HOST,
    port: +process.env.DATABASE_PORT,
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DB_NAME,
  });
  await client.connect();

  const { rows: refRows } = await client.query(
    `
    SELECT
      (SELECT id FROM services WHERE name = $1 LIMIT 1) AS service_id,
      (SELECT id FROM users WHERE full_name ILIKE $2 AND type = 2 AND status <> 4 LIMIT 1) AS staff_id,
      (SELECT u.id FROM users u
         JOIN customers cust ON cust.user_id = u.id
         JOIN customer_companies cc ON cc.id = cust.company_id
        WHERE cc.name ILIKE $3 AND u.type = 1 AND u.status <> 4
        ORDER BY u.id LIMIT 1) AS customer_id,
      (SELECT id FROM customer_companies WHERE name ILIKE $3 LIMIT 1) AS company_id
    `,
    [SERVICE_NAME, `%${STAFF_NAME}%`, CUSTOMER_COMPANY],
  );
  const ref = refRows[0];
  if (!ref.service_id || !ref.staff_id || !ref.customer_id || !ref.company_id) {
    throw new Error(`Missing reference IDs: ${JSON.stringify(ref)}`);
  }
  console.log('Using IDs:', ref);

  const { rows: sites } = await client.query(
    `
    SELECT s.id, s.name,
      (SELECT COUNT(*)::int FROM site_items si
         INNER JOIN services dep ON dep.id = si.service_id
         INNER JOIN users cu ON cu.id = si.customer_id AND cu.status <> 4
        WHERE si.site_id = s.id) AS service_count,
      (SELECT COUNT(DISTINCT sis.staff_id)::int FROM site_item_staffs sis
         INNER JOIN site_items si ON si.id = sis.site_item_id
         INNER JOIN users st ON st.id = sis.staff_id AND st.status <> 4
        WHERE si.site_id = s.id) AS staff_count,
      (SELECT COUNT(DISTINCT si.customer_id)::int FROM site_items si
         INNER JOIN services dep ON dep.id = si.service_id
         INNER JOIN users cu ON cu.id = si.customer_id AND cu.status <> 4
        WHERE si.site_id = s.id) AS customer_count
    FROM sites s
    ORDER BY s.id
    `,
  );

  const empty = sites.filter(
    (r) =>
      r.service_count === 0 && r.staff_count === 0 && r.customer_count === 0,
  );
  console.log(`Found ${empty.length} site(s) with 0 staff / 0 service / 0 customer`);
  if (!empty.length) {
    await client.end();
    return;
  }

  for (const site of empty) {
    console.log(`  ${site.id}\t${site.name}`);
  }

  if (dryRun) {
    console.log('Dry run — no changes written.');
    await client.end();
    return;
  }

  await client.query('BEGIN');
  try {
    let created = 0;
    for (const site of empty) {
      const existing = await client.query(
        `SELECT id FROM site_items
         WHERE site_id = $1 AND service_id = $2 AND customer_id = $3
         LIMIT 1`,
        [site.id, ref.service_id, ref.customer_id],
      );
      let siteItemId;
      if (existing.rows.length) {
        siteItemId = existing.rows[0].id;
        await client.query(
          `UPDATE site_items SET company_id = $1 WHERE id = $2`,
          [ref.company_id, siteItemId],
        );
        console.log(`Site ${site.id}: reusing site_item ${siteItemId}`);
      } else {
        const ins = await client.query(
          `INSERT INTO site_items (created_at, customer_id, site_id, company_id, service_id, frequency_type)
           VALUES (NOW(), $1, $2, $3, $4, 'simple')
           RETURNING id`,
          [ref.customer_id, site.id, ref.company_id, ref.service_id],
        );
        siteItemId = ins.rows[0].id;
        console.log(`Site ${site.id}: created site_item ${siteItemId}`);
        created += 1;
      }

      const staffExists = await client.query(
        `SELECT id FROM site_item_staffs
         WHERE site_item_id = $1 AND staff_id = $2 LIMIT 1`,
        [siteItemId, ref.staff_id],
      );
      if (!staffExists.rows.length) {
        await client.query(
          `INSERT INTO site_item_staffs (site_item_id, staff_id, created_at)
           VALUES ($1, $2, NOW())`,
          [siteItemId, ref.staff_id],
        );
        console.log(`  assigned staff ${ref.staff_id}`);
      }
    }
    await client.query('COMMIT');
    console.log(`Done. ${created} new site_item row(s), ${empty.length} site(s) updated.`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
