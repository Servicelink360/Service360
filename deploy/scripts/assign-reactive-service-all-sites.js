/**
 * Assign "Reactive/Adhoc Maintenance Works" to every job site that does not already have it.
 * For each site, copies customer/company from the site's primary existing site_item,
 * and copies staff from that same item (so reports can resolve an assignment).
 *
 * Usage (from service_link_api-main or with DATABASE_* in env / .env):
 *   node deploy/scripts/assign-reactive-service-all-sites.js [--dry-run]
 */
const fs = require("fs");
const path = require("path");
const pgPath = path.resolve(__dirname, "../../service_link_api-main/node_modules/pg");
const { Client } = require(pgPath);

const dryRun = process.argv.includes("--dry-run");

function loadEnv() {
  // Local DB only — never use .env.prod / RDS.
  const candidates = [
    path.resolve(__dirname, "../../service_link_api-main/.env.local"),
    path.resolve(process.cwd(), ".env.local"),
  ];
  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
      if (!line || line.startsWith("#") || !line.includes("=")) continue;
      const i = line.indexOf("=");
      const k = line.slice(0, i).trim();
      let v = line.slice(i + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      process.env[k] = v;
    }
    console.log("Loaded env from", p);
    break;
  }
  const host = (process.env.DATABASE_HOST || "").toLowerCase();
  if (!host || host === "localhost" || host === "127.0.0.1") return;
  throw new Error(
    `Refusing to run against non-local DATABASE_HOST=${process.env.DATABASE_HOST}. Use .env.local only.`,
  );
}

async function main() {
  loadEnv();
  const client = new Client({
    host: process.env.DATABASE_HOST || "localhost",
    port: +(process.env.DATABASE_PORT || 5432),
    user: process.env.DATABASE_USERNAME || "postgres",
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DB_NAME || "service360",
  });
  await client.connect();

  const svcRes = await client.query(
    `SELECT id, name FROM services
     WHERE name ILIKE $1 OR name ILIKE $2
     ORDER BY id`,
    ["%Reactive/Adhoc%", "%Reactive%Adhoc%"],
  );
  if (!svcRes.rows.length) {
    const all = await client.query(
      `SELECT id, name FROM services WHERE name ILIKE '%Reactive%' OR name ILIKE '%Adhoc%' ORDER BY id`,
    );
    console.error("Service not found. Candidates:", all.rows);
    process.exit(1);
  }
  const service = svcRes.rows[0];
  console.log("Service:", service);

  const sites = await client.query(`SELECT id, name FROM sites ORDER BY id`);
  console.log("Total sites:", sites.rows.length);

  const existing = await client.query(
    `SELECT site_id FROM site_items WHERE service_id = $1`,
    [service.id],
  );
  const already = new Set(existing.rows.map((r) => +r.site_id));
  console.log("Already have this service:", already.size);

  const missing = sites.rows.filter((s) => !already.has(+s.id));
  console.log("Sites to assign:", missing.length, dryRun ? "(dry-run)" : "");

  if (!missing.length) {
    await client.end();
    return;
  }

  let inserted = 0;
  let skippedNoCustomer = 0;
  let staffCopied = 0;

  await client.query("BEGIN");
  try {
    for (const site of missing) {
      const base = await client.query(
        `SELECT si.id, si.customer_id, si.company_id
         FROM site_items si
         INNER JOIN users u ON u.id = si.customer_id AND u.status <> 4
         WHERE si.site_id = $1
         ORDER BY si.id ASC
         LIMIT 1`,
        [site.id],
      );
      if (!base.rows.length) {
        skippedNoCustomer += 1;
        console.warn(`  skip site ${site.id} (${site.name}): no existing customer assignment`);
        continue;
      }
      const { customer_id: customerId, company_id: companyId, id: baseItemId } = base.rows[0];

      if (dryRun) {
        console.log(
          `  would insert site=${site.id} customer=${customerId} company=${companyId ?? "null"} from item=${baseItemId}`,
        );
        inserted += 1;
        continue;
      }

      const ins = await client.query(
        `INSERT INTO site_items (site_id, service_id, customer_id, company_id, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT ON CONSTRAINT uq_site_items_site_svc_customer DO NOTHING
         RETURNING id`,
        [site.id, service.id, customerId, companyId],
      );

      let newItemId = ins.rows[0]?.id;
      if (!newItemId) {
        const again = await client.query(
          `SELECT id FROM site_items
           WHERE site_id = $1 AND service_id = $2 AND customer_id = $3`,
          [site.id, service.id, customerId],
        );
        newItemId = again.rows[0]?.id;
        if (!newItemId) {
          throw new Error(`Insert failed for site ${site.id}`);
        }
        continue;
      }

      const staff = await client.query(
        `SELECT staff_id FROM site_item_staffs WHERE site_item_id = $1`,
        [baseItemId],
      );
      for (const st of staff.rows) {
        await client.query(
          `INSERT INTO site_item_staffs (site_item_id, staff_id)
           VALUES ($1, $2)
           ON CONFLICT ON CONSTRAINT uq_site_item_staffs_item_staff DO NOTHING`,
          [newItemId, st.staff_id],
        );
        staffCopied += 1;
      }
      inserted += 1;
      if (inserted % 25 === 0 || inserted === missing.length) {
        console.log(`  … ${inserted}/${missing.length}`);
      }
    }

    if (dryRun) {
      await client.query("ROLLBACK");
      console.log("Dry-run complete (rolled back). Would insert:", inserted, "skipped:", skippedNoCustomer);
    } else {
      await client.query("COMMIT");
      console.log("Done. Inserted:", inserted, "skipped (no customer):", skippedNoCustomer, "staff links:", staffCopied);
    }
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
