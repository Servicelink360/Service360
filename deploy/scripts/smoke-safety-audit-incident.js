/**
 * Smoke test: Safety Audit + Incident own-page flows — LOCAL only.
 *
 * Covers latest changes:
 *  1) DB: SAFETY_AUDIT + INCIDENT templates exist
 *  2) DB: Adam sample Safety Audit has fields + pdf_file
 *  3) DB: own-page exclude SQL keeps INCIDENT/SAFETY_AUDIT out of general CUSTOM
 *  4) API: login ? list SAFETY_AUDIT / INCIDENT via templateCategory
 *  5) API: general CUSTOM list excludes own-page categories
 *  6) API: sample detail has Yes/No answers + pdf
 *  7) Code: PDF template + util audit layout hooks present
 *  8) FE: own-page categories + /safety-audits route wiring
 *
 * Usage:
 *   node deploy/scripts/smoke-safety-audit-incident.js
 *   SMOKE_USER=adam@servicelink.net.au SMOKE_PASS=123456 node deploy/scripts/smoke-safety-audit-incident.js
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
const ADMIN_BASE = process.env.SMOKE_ADMIN_URL || "http://localhost:3001";
const ADAM_ID = 140;
const SAFETY_TEMPLATE_ID = 80;
const INCIDENT_TEMPLATE_ID = 82;

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

function requestText(urlStr) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const lib = u.protocol === "https:" ? https : http;
    const req = lib.request(
      {
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method: "GET",
        timeout: 15000,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString("utf8") }),
        );
      },
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("request timeout"));
    });
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

async function tryLogin(candidates) {
  for (const c of candidates) {
    const res = await requestJson("POST", `${API_BASE}/auth/signIn`, {
      body: {
        username: c.username,
        password: c.password,
        version: "1.0.0",
        type: c.type,
        sessionId: `smoke-sa-${Date.now()}`,
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

async function runDbChecks(client) {
  console.log("\n[1] DB checks");

  const safetyTpl = await client.query(
    `SELECT id, name, category FROM report_templates WHERE id = $1`,
    [SAFETY_TEMPLATE_ID],
  );
  assert(
    "SAFETY_AUDIT template exists",
    safetyTpl.rows[0]?.category === "SAFETY_AUDIT",
    `id=${safetyTpl.rows[0]?.id} name=${safetyTpl.rows[0]?.name}`,
  );

  const yesNo = await client.query(
    `SELECT COUNT(*)::int AS n FROM report_template_items
     WHERE report_template_id = $1 AND UPPER(TRIM(type)) = 'YES_NO'`,
    [SAFETY_TEMPLATE_ID],
  );
  assert("Safety Audit has YES_NO checklist fields", yesNo.rows[0].n >= 8, `count=${yesNo.rows[0].n}`);

  const incidentTpl = await client.query(
    `SELECT id, name, category FROM report_templates WHERE id = $1`,
    [INCIDENT_TEMPLATE_ID],
  );
  assert(
    "INCIDENT template exists",
    String(incidentTpl.rows[0]?.category || "").toUpperCase() === "INCIDENT",
    `id=${incidentTpl.rows[0]?.id} cat=${incidentTpl.rows[0]?.category}`,
  );

  const sample = await client.query(
    `SELECT id, task_name, staff_id, pdf_file, report_template_id, status
     FROM user_tasks
     WHERE type = 'CUSTOM'
       AND report_template_id = $1
       AND staff_id = $2
       AND task_name ILIKE 'Safety Audit - sample (Adam)%'
     ORDER BY id DESC LIMIT 1`,
    [SAFETY_TEMPLATE_ID, ADAM_ID],
  );
  assert("Adam sample Safety Audit exists", !!sample.rows[0], sample.rows[0] ? `id=${sample.rows[0].id}` : "none");
  if (!sample.rows[0]) return null;

  const sampleId = sample.rows[0].id;
  assert(
    "Adam sample has pdf_file",
    !!(sample.rows[0].pdf_file && String(sample.rows[0].pdf_file).includes("http")),
    sample.rows[0].pdf_file || "empty",
  );

  const answers = await client.query(
    `SELECT
       COUNT(*) FILTER (WHERE UPPER(TRIM(type)) = 'YES_NO')::int AS yn,
       COUNT(*) FILTER (WHERE UPPER(TRIM(type)) = 'YES_NO' AND UPPER(TRIM(value)) = 'YES')::int AS yes_n,
       COUNT(*) FILTER (WHERE UPPER(TRIM(type)) = 'YES_NO' AND UPPER(TRIM(value)) = 'NO')::int AS no_n
     FROM user_task_reports WHERE user_task_id = $1`,
    [sampleId],
  );
  assert(
    "Adam sample has Yes/No answers",
    answers.rows[0].yn >= 8 && answers.rows[0].yes_n > 0,
    `yes_no=${answers.rows[0].yn} yes=${answers.rows[0].yes_n} no=${answers.rows[0].no_n}`,
  );

  const leaked = await client.query(
    `SELECT COUNT(*)::int AS n FROM user_tasks usertasks
     WHERE usertasks.type = 'CUSTOM'
       AND usertasks.status = 1
       AND usertasks.id = $1
       AND NOT EXISTS (
         SELECT 1 FROM report_templates rt_own
         WHERE rt_own.id = usertasks.report_template_id
           AND UPPER(TRIM(COALESCE(rt_own.category, ''))) IN ('INCIDENT', 'SAFETY_AUDIT')
       )`,
    [sampleId],
  );
  assert(
    "Own-page exclude SQL hides Safety Audit from general CUSTOM",
    leaked.rows[0].n === 0,
    `visible_in_general=${leaked.rows[0].n}`,
  );

  const included = await client.query(
    `SELECT COUNT(*)::int AS n FROM user_tasks usertasks
     WHERE usertasks.type = 'CUSTOM'
       AND usertasks.id = $1
       AND EXISTS (
         SELECT 1 FROM report_templates rt_cat
         WHERE rt_cat.id = usertasks.report_template_id
           AND UPPER(TRIM(COALESCE(rt_cat.category, ''))) = 'SAFETY_AUDIT'
       )`,
    [sampleId],
  );
  assert("templateCategory=SAFETY_AUDIT includes sample", included.rows[0].n === 1, `n=${included.rows[0].n}`);

  return { sampleId, pdfFile: sample.rows[0].pdf_file };
}

async function runApiChecks(ctx) {
  console.log("\n[2] API checks");
  const health = await requestJson("GET", `${API_BASE}/auth/checkUsername?username=smoke-probe`).catch(
    (e) => ({ status: 0, json: { error: e.message } }),
  );
  if (!health.status) {
    fail("API reachable", health.json?.error || "API not running on localhost:5301");
    return;
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
  candidates.push(
    { username: "adam@servicelink.net.au", password: pass, type: 2 },
    { username: "helpdesk1@servicelink.net.au", password: pass, type: 1 },
    { username: "helpdesk2@servicelink.net.au", password: pass, type: 2 },
  );

  const auth = await tryLogin(candidates);
  if (!auth) {
    fail("login", "Could not sign in. Set SMOKE_USER / SMOKE_PASS.");
    return;
  }
  ok("login", `${auth.loginAs.username} type=${auth.loginAs.type}`);
  const headers = { Authorization: `Bearer ${auth.token}` };

  const safetyList = await requestJson(
    "GET",
    `${API_BASE}/user-tasks/getAllUserTasksByUserId?type=CUSTOM&status=s&page=1&limit=50&templateCategory=SAFETY_AUDIT`,
    { headers },
  );
  const safetyRows = safetyList.json?.data?.rows || [];
  assert(
    "API SAFETY_AUDIT list returns rows",
    (safetyList.status === 200 || safetyList.status === 201) &&
      safetyList.json?.code === 1 &&
      safetyRows.length > 0,
    `status=${safetyList.status} code=${safetyList.json?.code} count=${safetyRows.length}`,
  );
  if (ctx?.sampleId) {
    const found = safetyRows.some((r) => +r.id === +ctx.sampleId);
    assert("API SAFETY_AUDIT list includes Adam sample", found, `sampleId=${ctx.sampleId}`);
  }

  const incidentList = await requestJson(
    "GET",
    `${API_BASE}/user-tasks/getAllUserTasksByUserId?type=CUSTOM&status=s&page=1&limit=50&templateCategory=INCIDENT`,
    { headers },
  );
  assert(
    "API INCIDENT list OK",
    (incidentList.status === 200 || incidentList.status === 201) && incidentList.json?.code === 1,
    `status=${incidentList.status} count=${(incidentList.json?.data?.rows || []).length}`,
  );

  const general = await requestJson(
    "GET",
    `${API_BASE}/user-tasks/getAllUserTasksByUserId?type=CUSTOM&status=s&page=1&limit=100`,
    { headers },
  );
  const generalRows = general.json?.data?.rows || [];
  assert(
    "API general CUSTOM list OK",
    (general.status === 200 || general.status === 201) && general.json?.code === 1,
    `count=${generalRows.length}`,
  );
  const leakIds = generalRows.filter((r) => {
    const cat = String(r?.reportTemplate?.category || r?.templateCategory || "").toUpperCase();
    const name = String(r?.reportTemplate?.name || r?.taskName || "").toLowerCase();
    return (
      cat === "SAFETY_AUDIT" ||
      cat === "INCIDENT" ||
      name.includes("safety audit") ||
      (+r.id === +(ctx?.sampleId || 0))
    );
  });
  assert(
    "API general CUSTOM excludes own-page reports",
    leakIds.length === 0,
    leakIds.length ? `leaked=${leakIds.map((r) => r.id).join(",")}` : "none leaked",
  );

  if (ctx?.sampleId) {
    const detail = await requestJson("GET", `${API_BASE}/user-tasks/${ctx.sampleId}`, { headers });
    const data = detail.json?.data;
    const reports = data?.reports || data?.userTaskReports || [];
    assert(
      "API sample detail loads",
      (detail.status === 200 || detail.status === 201) && detail.json?.code === 1,
      `status=${detail.status} code=${detail.json?.code}`,
    );
    const yn = reports.filter((r) => String(r.type || "").toUpperCase() === "YES_NO");
    assert("API sample detail has YES_NO fields", yn.length >= 8, `yes_no=${yn.length}`);
    const pdf = data?.pdfFile || data?.pdf_file || "";
    assert("API sample detail has pdfFile", String(pdf).includes("http"), pdf || "empty");
  }
}

function runCodeChecks() {
  console.log("\n[3] Code / FE wiring checks");
  const tpl = path.resolve(__dirname, "../../service_link_api-main/template.html");
  const util = path.resolve(__dirname, "../../service_link_api-main/src/helpers/util.ts");
  const statusUser = path.resolve(
    __dirname,
    "../../service_link_admin-main/src/constants/statusUser.ts",
  );
  const routes = path.resolve(__dirname, "../../service_link_admin-main/src/containers/routes.tsx");
  const safetyPage = path.resolve(
    __dirname,
    "../../service_link_admin-main/src/containers/reports/safety-audits.tsx",
  );
  const incidentPage = path.resolve(
    __dirname,
    "../../service_link_admin-main/src/containers/reports/incident-report.tsx",
  );

  const tplHtml = fs.readFileSync(tpl, "utf8");
  assert("PDF template has CONTENT_CLASS", tplHtml.includes("{{CONTENT_CLASS}}"));
  assert(
    "PDF template has audit content class CSS",
    tplHtml.includes("tcontent--audit") || tplHtml.includes("field-row--stack"),
  );

  const utilSrc = fs.readFileSync(util, "utf8");
  assert("util has isSafetyAuditPdf", utilSrc.includes("function isSafetyAuditPdf"));
  assert("util has getTitleBarClassForAudit", utilSrc.includes("function getTitleBarClassForAudit"));
  assert("util sets CONTENT_CLASS for audit", utilSrc.includes("tcontent--audit"));

  const su = fs.readFileSync(statusUser, "utf8");
  assert("FE SAFETY_AUDIT_CATEGORY", su.includes("SAFETY_AUDIT_CATEGORY"));
  assert(
    "FE NEW_REPORTS_OWN_PAGE_CATEGORIES includes both",
    su.includes("NEW_REPORTS_OWN_PAGE_CATEGORIES") &&
      /NEW_REPORTS_OWN_PAGE_CATEGORIES\s*=\s*\[[\s\S]*INCIDENT[\s\S]*SAFETY_AUDIT/.test(su),
  );

  assert("FE safety-audits page exists", fs.existsSync(safetyPage));
  assert("FE incident-report page exists", fs.existsSync(incidentPage));
  const routesSrc = fs.readFileSync(routes, "utf8");
  assert("FE routes wire safety-audits", /safety-audits/i.test(routesSrc));
  assert("FE routes wire incident-report", /incident-report/i.test(routesSrc));
}

async function runAdminChecks() {
  console.log("\n[4] Admin UI reachability");
  try {
    const home = await requestText(`${ADMIN_BASE}/`);
    assert("Admin app reachable", home.status === 200, `status=${home.status}`);
  } catch (e) {
    fail("Admin app reachable", e.message);
  }
}

async function main() {
  console.log("=== Smoke: Safety Audit / Incident (local) ===");
  loadLocalEnv();
  const client = await dbClient();
  let ctx = null;
  try {
    ctx = await runDbChecks(client);
  } finally {
    await client.end();
  }
  await runApiChecks(ctx);
  runCodeChecks();
  await runAdminChecks();

  console.log(`\n=== Result: ${passed} passed, ${failed} failed ===`);
  if (failed) {
    console.error("Failures:\n - " + failures.join("\n - "));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
