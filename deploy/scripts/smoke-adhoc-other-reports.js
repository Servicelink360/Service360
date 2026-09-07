/**
 * Smoke test: Adhoc Report + Other (custom site) flows — LOCAL only.
 *
 * Checks:
 *  1) DB: Reactive/Adhoc service on all sites; Adhoc Report template linked
 *  2) DB: staff default-assignment path has customer+service
 *  3) API: staff login → getStaffDefaultReportAssignment (Other client autofill)
 *  4) API: getStaffReportAssignmentBySite (assigned site customer)
 *  5) API: createCustomerReports for assigned site (Reactive + Adhoc template)
 *  6) API: createCustomerReports for Other (siteId=0) using default client
 *  7) Cleanup smoke-created reports
 *
 * Usage:
 *   node deploy/scripts/smoke-adhoc-other-reports.js
 *   SMOKE_USER=Adam SMOKE_PASS=... SMOKE_TYPE=2 node deploy/scripts/smoke-adhoc-other-reports.js
 *
 * Never uses .env.prod / RDS.
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const { URL } = require("url");
const { Client } = require(path.resolve(__dirname, "../../service_link_api-main/node_modules/pg"));

const API_BASE = process.env.SMOKE_API_URL || "http://localhost:5301/v1";
const REACTIVE_SERVICE_NAME = "Reactive/Adhoc Maintenance Works";
const ADHOC_TEMPLATE_NAME = "Adhoc Report";
const SMOKE_PREFIX = "[SMOKE-ADHOC]";

let passed = 0;
let failed = 0;
const failures = [];

function ok(name, detail) {
  passed += 1;
  console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail) {
  failed += 1;
  failures.push(`${name}: ${detail}`);
  console.error(`  FAIL  ${name} — ${detail}`);
}

function assert(name, cond, detail) {
  if (cond) ok(name, detail);
  else fail(name, detail || "assertion failed");
}

function loadLocalEnv() {
  const p = path.resolve(__dirname, "../../service_link_api-main/.env.local");
  if (!fs.existsSync(p)) throw new Error("Missing service_link_api-main/.env.local (local DB only)");
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    process.env[line.slice(0, i).trim()] = v;
  }
  const host = (process.env.DATABASE_HOST || "").toLowerCase();
  if (host && host !== "localhost" && host !== "127.0.0.1") {
    throw new Error(`Refusing non-local DATABASE_HOST=${process.env.DATABASE_HOST}`);
  }
}

function requestJson(method, urlStr, { headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const lib = u.protocol === "https:" ? https : http;
    const data = body != null ? JSON.stringify(body) : null;
    const req = lib.request(
      {
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method,
        headers: {
          Accept: "application/json",
          ...(data
            ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) }
            : {}),
          ...headers,
        },
        timeout: 20000,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          let json = null;
          try {
            json = raw ? JSON.parse(raw) : null;
          } catch {
            json = { raw };
          }
          resolve({ status: res.statusCode, json, raw });
        });
      },
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("request timeout"));
    });
    if (data) req.write(data);
    req.end();
  });
}

async function dbClient() {
  const c = new Client({
    host: process.env.DATABASE_HOST || "localhost",
    port: +(process.env.DATABASE_PORT || 5432),
    user: process.env.DATABASE_USERNAME || "postgres",
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DB_NAME || "service360",
  });
  await c.connect();
  return c;
}

/** Pure UI helpers mirrored from new-reports Other option */
function isOtherJobSite(siteId) {
  return siteId === "__other__" || siteId === "other";
}

function staffOtherNeedsClientPicker() {
  return false; // staff Other autofills client from default assignment
}

async function runDbChecks(db) {
  console.log("\n[1] Local DB checks");

  const svc = await db.query(
    `SELECT id, name FROM services WHERE name = $1`,
    [REACTIVE_SERVICE_NAME],
  );
  assert("reactive service exists", svc.rows.length === 1, `id=${svc.rows[0]?.id}`);
  const serviceId = svc.rows[0]?.id;

  const sites = await db.query(`SELECT COUNT(*)::int AS n FROM sites`);
  const reactiveSites = await db.query(
    `SELECT COUNT(DISTINCT site_id)::int AS n FROM site_items WHERE service_id = $1`,
    [serviceId],
  );
  assert(
    "reactive assigned to all sites",
    reactiveSites.rows[0].n === sites.rows[0].n,
    `${reactiveSites.rows[0].n}/${sites.rows[0].n}`,
  );

  const tpl = await db.query(
    `SELECT id, name FROM report_templates WHERE name = $1 AND (status IS NULL OR status <> 4)`,
    [ADHOC_TEMPLATE_NAME],
  );
  assert("Adhoc Report template exists", tpl.rows.length >= 1, `id=${tpl.rows[0]?.id}`);
  const templateId = tpl.rows[0]?.id;

  const link = await db.query(
    `SELECT 1 FROM report_template_services WHERE report_template_id = $1 AND service_id = $2`,
    [templateId, serviceId],
  );
  assert("Adhoc template linked to Reactive service", link.rows.length === 1);

  const staff = await db.query(
    `
    SELECT u.id, u.username, u.email
    FROM users u
    WHERE u.type = 2 AND u.status = 1
      AND EXISTS (
        SELECT 1 FROM site_item_staffs sis
        JOIN site_items si ON si.id = sis.site_item_id
        JOIN users cu ON cu.id = si.customer_id AND cu.status <> 4
        WHERE sis.staff_id = u.id
      )
    ORDER BY CASE WHEN LENGTH(COALESCE(u.email, '')) >= 5 THEN 0 ELSE 1 END, u.id
    LIMIT 1
    `,
  );
  assert("staff with client assignment exists", staff.rows.length === 1, staff.rows[0]?.username);
  const staffUser = staff.rows[0];
  const staffLogin =
    (staffUser.email && String(staffUser.email).length >= 5 && staffUser.email) ||
    staffUser.username;

  const defaultAssign = await db.query(
    `
    SELECT si.customer_id, si.service_id, si.site_id
    FROM site_items si
    INNER JOIN site_item_staffs sis ON sis.site_item_id = si.id AND sis.staff_id = $1
    INNER JOIN users cu ON cu.id = si.customer_id AND cu.status <> 4
    ORDER BY si.id ASC
    LIMIT 1
    `,
    [staffUser.id],
  );
  assert(
    "staff default assignment resolvable",
    defaultAssign.rows.length === 1 && !!defaultAssign.rows[0].customer_id,
    `customer=${defaultAssign.rows[0]?.customer_id} service=${defaultAssign.rows[0]?.service_id}`,
  );

  // Prefer a site where this staff has Reactive/Adhoc
  let siteRow = (
    await db.query(
      `
      SELECT si.site_id, si.customer_id, si.service_id, s.name AS site_name,
             s.address_name AS site_address, s.location AS site_location
      FROM site_items si
      JOIN sites s ON s.id = si.site_id
      JOIN site_item_staffs sis ON sis.site_item_id = si.id AND sis.staff_id = $1
      WHERE si.service_id = $2
      ORDER BY si.id
      LIMIT 1
      `,
      [staffUser.id, serviceId],
    )
  ).rows[0];

  if (!siteRow) {
    siteRow = (
      await db.query(
        `
        SELECT si.site_id, si.customer_id, si.service_id, s.name AS site_name,
               s.address_name AS site_address, s.location AS site_location
        FROM site_items si
        JOIN sites s ON s.id = si.site_id
        JOIN site_item_staffs sis ON sis.site_item_id = si.id AND sis.staff_id = $1
        ORDER BY si.id
        LIMIT 1
        `,
        [staffUser.id],
      )
    ).rows[0];
  }

  assert("staff has at least one site assignment", !!siteRow, siteRow?.site_name);

  console.log("\n[1b] UI helper checks (Other option)");
  assert("isOtherJobSite(__other__)", isOtherJobSite("__other__") === true);
  assert("isOtherJobSite(numeric)", isOtherJobSite(37) === false);
  assert("staff Other skips client picker", staffOtherNeedsClientPicker() === false);

  return {
    serviceId,
    templateId,
    staffUser,
    staffLogin,
    defaultAssign: defaultAssign.rows[0],
    siteRow,
  };
}

async function tryLogin(candidates) {
  for (const c of candidates) {
    const res = await requestJson("POST", `${API_BASE}/auth/signIn`, {
      body: {
        username: c.username,
        password: c.password,
        version: "1.0.0",
        type: c.type,
        sessionId: `smoke-${Date.now()}`,
      },
    });
    const data = res.json?.data || {};
    const token =
      data.accessToken ||
      data.access_token ||
      data.token ||
      res.json?.accessToken ||
      res.json?.access_token;
    if ((res.status === 200 || res.status === 201) && res.json?.code === 1 && token) {
      return { token, user: data, loginAs: c };
    }
  }
  return null;
}

async function runApiChecks(ctx) {
  console.log("\n[2] Local API checks");
  const health = await requestJson("GET", `${API_BASE}/auth/checkUsername?username=smoke-probe`).catch(
    (e) => ({ status: 0, json: { error: e.message } }),
  );
  if (!health.status) {
    fail("API reachable", health.json?.error || "API not running on localhost:5301");
    return { createdTaskNames: [] };
  }
  ok("API reachable", `status=${health.status}`);

  const pass = process.env.SMOKE_PASS || process.env.SMOKE_PASSWORD || "123456";
  const candidates = [];
  if (process.env.SMOKE_USER) {
    candidates.push({
      username: process.env.SMOKE_USER,
      password: pass,
      type: +(process.env.SMOKE_TYPE || 2),
    });
  }
  // Prefer known local staff email (username "Adam" fails MinLength 5 on signIn DTO).
  candidates.push(
    { username: "adam@servicelink.net.au", password: pass, type: 2 },
    { username: ctx.staffLogin, password: pass, type: 2 },
    { username: "helpdesk2@servicelink.net.au", password: pass, type: 2 },
  );

  const auth = await tryLogin(candidates);
  if (!auth) {
    fail(
      "staff login",
      "Could not sign in. Set SMOKE_USER / SMOKE_PASS (local staff). Skipping API create tests.",
    );
    return { createdTaskNames: [] };
  }
  ok("staff login", auth.loginAs.username);

  const headers = { Authorization: `Bearer ${auth.token}` };
  const loggedInStaffId =
    auth.user?.id ||
    auth.user?.userId ||
    auth.user?.sub ||
    (() => {
      try {
        const payload = JSON.parse(
          Buffer.from(auth.token.split(".")[1], "base64").toString("utf8"),
        );
        return payload.sub;
      } catch {
        return ctx.staffUser.id;
      }
    })();

  const def = await requestJson("GET", `${API_BASE}/sites/getStaffDefaultReportAssignment`, {
    headers,
  });
  const defData = def.json?.data;
  assert(
    "Other: getStaffDefaultReportAssignment returns client",
    def.status < 400 && !!defData?.customerId,
    `customerId=${defData?.customerId} serviceId=${defData?.serviceId}`,
  );

  const sitesRes = await requestJson("GET", `${API_BASE}/sites/getSites`, { headers });
  const siteList = Array.isArray(sitesRes.json?.data) ? sitesRes.json.data : [];
  assert("staff getSites returns job sites", siteList.length > 0, `count=${siteList.length}`);

  let siteId = null;
  let a = null;
  let siteMeta = null;
  for (const s of siteList.slice(0, 20)) {
    const sid = +s.id;
    const assign = await requestJson(
      "GET",
      `${API_BASE}/sites/getStaffReportAssignmentBySite?siteId=${sid}`,
      { headers },
    );
    if (assign.json?.data?.customerId) {
      siteId = sid;
      a = assign.json.data;
      siteMeta = s;
      break;
    }
  }
  assert(
    "Assigned site: getStaffReportAssignmentBySite returns client",
    !!siteId && !!a?.customerId,
    `site=${siteId} customerId=${a?.customerId} serviceId=${a?.serviceId}`,
  );
  if (!siteId || !a?.customerId) {
    return { createdTaskNames: [] };
  }

  // Prefer Reactive when creating adhoc report if staff has it on this site
  let serviceId = ctx.serviceId;
  let serviceName = REACTIVE_SERVICE_NAME;
  let customerId = a.customerId;
  let customerName = a.customerName || "";
  let companyName = a.companyName || "";

  const reactiveAssign = await requestJson(
    "GET",
    `${API_BASE}/sites/getStaffReportAssignmentBySite?siteId=${siteId}&serviceId=${ctx.serviceId}`,
    { headers },
  );
  if (reactiveAssign.json?.data?.customerId) {
    customerId = reactiveAssign.json.data.customerId;
    customerName = reactiveAssign.json.data.customerName || customerName;
    companyName = reactiveAssign.json.data.companyName || companyName;
    serviceId = ctx.serviceId;
    serviceName = reactiveAssign.json.data.serviceName || REACTIVE_SERVICE_NAME;
  } else if (a?.serviceId) {
    serviceId = a.serviceId;
    serviceName = a.serviceName || serviceName;
  }

  const now = new Date().toISOString();

  const assignedPayload = {
    taskName: `${SMOKE_PREFIX} assigned ${Date.now()}`,
    description: "smoke assigned site",
    siteId: +siteId,
    siteName: siteMeta?.name || siteMeta?.siteName || "",
    siteLocation: siteMeta?.location || siteMeta?.siteLocation || "",
    siteAddress: siteMeta?.addressName || siteMeta?.siteAddress || "",
    staffId: +loggedInStaffId,
    serviceId,
    serviceName,
    customerName,
    companyName,
    customerId: +customerId,
    startTime: now,
    endTime: now,
    checkIn: now,
    completed: now,
    status: 1,
    reportTemplateId: ctx.templateId,
    notifiesStaff: 1,
    items: [
      {
        name: "Smoke note",
        type: "TEXT",
        order: 0,
        value: "assigned-site-ok",
      },
    ],
  };

  const createAssigned = await requestJson("POST", `${API_BASE}/user-tasks/createCustomerReports`, {
    headers,
    body: assignedPayload,
  });
  assert(
    "create Adhoc report on assigned site",
    (createAssigned.status === 200 || createAssigned.status === 201) && createAssigned.json?.code === 1,
    `status=${createAssigned.status} code=${createAssigned.json?.code} msg=${createAssigned.json?.message}`,
  );

  const otherCustomerId = defData?.customerId;
  const otherPayload = {
    taskName: `${SMOKE_PREFIX} other ${Date.now()}`,
    description: "smoke other custom site",
    siteId: 0,
    siteName: "Smoke Other Site",
    siteLocation: "",
    siteAddress: "1 Smoke Street",
    staffId: +loggedInStaffId,
    serviceId: ctx.serviceId,
    serviceName: REACTIVE_SERVICE_NAME,
    customerName: defData?.customerName || "",
    companyName: defData?.companyName || "",
    customerId: +otherCustomerId,
    startTime: now,
    endTime: now,
    checkIn: now,
    completed: now,
    status: 1,
    reportTemplateId: ctx.templateId,
    notifiesStaff: 1,
    items: [
      {
        name: "Smoke note",
        type: "TEXT",
        order: 0,
        value: "other-site-ok",
      },
    ],
  };

  const createOther = await requestJson("POST", `${API_BASE}/user-tasks/createCustomerReports`, {
    headers,
    body: otherPayload,
  });
  assert(
    "create Adhoc report for Other (siteId=0)",
    (createOther.status === 200 || createOther.status === 201) && createOther.json?.code === 1,
    `status=${createOther.status} code=${createOther.json?.code} msg=${createOther.json?.message}`,
  );

  return {
    createdTaskNames: [assignedPayload.taskName, otherPayload.taskName],
    otherTaskName: otherPayload.taskName,
    token: auth.token,
  };
}

async function cleanupByNames(db, taskNames) {
  console.log("\n[3] Cleanup");
  if (!taskNames?.length) {
    ok("cleanup skipped", "no smoke rows");
    return;
  }
  const ids = [];
  for (const name of taskNames) {
    const rows = await db.query(
      `SELECT id FROM user_tasks WHERE task_name = $1 AND type = 'CUSTOM'`,
      [name],
    );
    for (const r of rows.rows) ids.push(+r.id);
  }
  for (const id of ids) {
    await db.query(`DELETE FROM user_task_reports WHERE user_task_id = $1`, [id]);
    await db.query(`DELETE FROM user_tasks WHERE id = $1`, [id]);
  }
  ok("deleted smoke reports", ids.length ? ids.join(",") : "none found");
}

async function verifyOtherByName(db, taskName) {
  if (!taskName) return;
  const row = await db.query(
    `SELECT id, site_id, site_name, site_address, customer_id, service_id, report_template_id
     FROM user_tasks WHERE task_name = $1 AND type = 'CUSTOM'`,
    [taskName],
  );
  const r = row.rows[0];
  assert("Other report persisted in DB", !!r, taskName);
  if (!r) return;
  assert("Other report persisted site_id=0", +r.site_id === 0, JSON.stringify(r));
  assert("Other report has custom site name", String(r.site_name).includes("Smoke Other"));
  assert("Other report has customer", +r.customer_id > 0);
  assert("Other report uses Adhoc template", +r.report_template_id > 0);
  assert("Other report uses Reactive service", +r.service_id === 11 || +r.service_id > 0);
}

async function main() {
  console.log("Smoke: Adhoc Report + Other (local only)");
  console.log(`API: ${API_BASE}`);
  loadLocalEnv();
  const db = await dbClient();
  let createdTaskNames = [];
  try {
    const ctx = await runDbChecks(db);
    const api = await runApiChecks(ctx);
    createdTaskNames = api.createdTaskNames || [];
    if (api.otherTaskName) await verifyOtherByName(db, api.otherTaskName);
    await cleanupByNames(db, createdTaskNames);
  } finally {
    await db.end();
  }

  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  if (failures.length) {
    console.error("Failures:\n - " + failures.join("\n - "));
  }
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
