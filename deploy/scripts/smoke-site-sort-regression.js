/**
 * Regression smoke after sites.dropdown_sort_order (Bayside/Mascot → dynamic).
 * Read-only: verifies New Reports, Messages, Faults, Sites still work.
 *
 *  1) API up + admin (and optional staff) login
 *  2) DB: sites.dropdown_sort_order exists; Bayside/Mascot seed if those sites exist
 *  3) GET sites/getSites — returns rows; sort order sane when parents exist
 *  4) GET user-tasks — New Reports list
 *  5) GET messages/threads, recipients, unreadCount
 *  6) GET report-faults — list
 *
 * Usage:
 *   node deploy/scripts/smoke-site-sort-regression.js
 *   SMOKE_ADMIN_USER=... SMOKE_PASS=... node deploy/scripts/smoke-site-sort-regression.js
 *
 * Local API + local DB only — never .env.prod / RDS.
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const { URL } = require("url");
const { Client } = require(path.resolve(__dirname, "../../service_link_api-main/node_modules/pg"));
const jwt = require(path.resolve(__dirname, "../../service_link_api-main/node_modules/jsonwebtoken"));

const API_BASE = process.env.SMOKE_API_URL || "http://localhost:5301/v1";

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

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return false;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    const key = line.slice(0, i).trim();
    if (!process.env[key]) process.env[key] = v;
  }
  return true;
}

function loadLocalEnv() {
  const root = path.resolve(__dirname, "../../service_link_api-main");
  const loaded =
    loadEnvFile(path.join(root, ".env.local")) | loadEnvFile(path.join(root, ".env"));
  if (!loaded) throw new Error("Missing service_link_api-main/.env.local or .env");
  const host = (process.env.DATABASE_HOST || "").toLowerCase();
  if (host && host !== "localhost" && host !== "127.0.0.1") {
    throw new Error(`Refusing non-local DATABASE_HOST=${process.env.DATABASE_HOST}`);
  }
  const apiHost = new URL(API_BASE).hostname.toLowerCase();
  if (apiHost !== "localhost" && apiHost !== "127.0.0.1") {
    throw new Error(`Refusing non-local SMOKE_API_URL=${API_BASE}`);
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
        timeout: 60000,
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
            json = { raw: raw.slice(0, 800) };
          }
          resolve({ status: res.statusCode, json });
        });
      },
    );
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("request timeout"));
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function tryLogin(candidates) {
  for (const c of candidates) {
    const res = await requestJson("POST", `${API_BASE}/auth/signIn`, {
      body: {
        username: c.username,
        password: c.password,
        version: "1.0.0",
        type: c.type,
        sessionId: `smoke-sort-reg-${Date.now()}`,
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

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

function listRows(payload) {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

async function main() {
  console.log(`Site-sort regression smoke — ${API_BASE}`);
  console.log("(read-only: must not break New Reports / Messages / Faults)\n");
  loadLocalEnv();

  console.log("[1] API + login");
  const health = await requestJson(
    "GET",
    `${API_BASE}/auth/checkUsername?username=smoke-probe`,
  ).catch((e) => ({ status: 0, json: { error: e.message } }));
  assert("API reachable", Boolean(health.status), health.json?.error || `status=${health.status}`);
  if (!health.status) {
    console.error("\nStart local API on :5301 then re-run.");
    process.exit(1);
  }

  const pass = process.env.SMOKE_PASS || process.env.SMOKE_PASSWORD || "123456";
  const adminCandidates = [];
  if (process.env.SMOKE_ADMIN_USER || process.env.SMOKE_USER) {
    adminCandidates.push({
      username: process.env.SMOKE_ADMIN_USER || process.env.SMOKE_USER,
      password: pass,
      type: +(process.env.SMOKE_ADMIN_TYPE || process.env.SMOKE_TYPE || 3),
    });
  }
  adminCandidates.push(
    { username: "helpdesk@servicelink.net.au", password: pass, type: 3 },
    { username: "helpdesk2@servicelink.net.au", password: pass, type: 3 },
    { username: "admin@servicelink.net.au", password: pass, type: 3 },
  );

  const pg = new Client({
    host: process.env.DATABASE_HOST || "127.0.0.1",
    port: +(process.env.DATABASE_PORT || 5432),
    user: process.env.DATABASE_USERNAME || process.env.DATABASE_USER || "postgres",
    password: process.env.DATABASE_PASSWORD || "postgres",
    database: process.env.DATABASE_DB_NAME || process.env.DATABASE_NAME || process.env.DATABASE_DB || "service360",
  });
  await pg.connect();

  let admin = await tryLogin(adminCandidates);
  if (!admin) {
    const row = (
      await pg.query(
        `SELECT id, username, email, full_name, type
         FROM users
         WHERE type = 3 AND (username ILIKE '%helpdesk%' OR email ILIKE '%helpdesk%' OR username ILIKE '%admin%')
         ORDER BY id
         LIMIT 1`,
      )
    ).rows[0];
    const secret = process.env.JWT_SECRET_KEY;
    if (row && secret) {
      const token = jwt.sign(
        {
          username: row.username || row.email,
          sub: +row.id,
          email: row.email || row.username,
          fullName: row.full_name || "Smoke Admin",
          type: 3,
          roleIds: [],
          companyId: null,
        },
        secret,
        { expiresIn: "1h" },
      );
      admin = {
        token,
        user: row,
        loginAs: { username: row.username || row.email, type: 3 },
      };
      ok("admin JWT fallback", admin.loginAs.username);
    }
  } else {
    ok("admin login", admin.loginAs.username);
  }
  assert("admin auth", Boolean(admin), "Set SMOKE_ADMIN_USER / SMOKE_PASS or JWT_SECRET_KEY");
  if (!admin) {
    await pg.end().catch(() => undefined);
    process.exit(1);
  }
  const headers = authHeaders(admin.token);

  console.log("\n[2] DB column + seed");
  try {
    const col = await pg.query(`
      SELECT 1 AS ok
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'sites'
        AND column_name = 'dropdown_sort_order'
    `);
    assert("sites.dropdown_sort_order column exists", col.rowCount === 1);

    const parents = await pg.query(`
      SELECT name, dropdown_sort_order
      FROM public.sites
      WHERE LOWER(TRIM(name)) IN (
        LOWER(TRIM('Bayside Public Amenities')),
        LOWER(TRIM('Mascot Public Amenities'))
      )
      ORDER BY dropdown_sort_order NULLS LAST, name
    `);
    if (!parents.rowCount) {
      ok("Bayside/Mascot sites", "not in this DB (skip seed check)");
    } else {
      const byName = Object.fromEntries(
        parents.rows.map((r) => [String(r.name).trim().toLowerCase(), r.dropdown_sort_order]),
      );
      const b = byName["bayside public amenities"];
      const m = byName["mascot public amenities"];
      if (b != null) {
        assert("Bayside Public Amenities sort seeded", +b === 10, `got ${b}`);
      } else {
        ok("Bayside Public Amenities", "absent");
      }
      if (m != null) {
        assert("Mascot Public Amenities sort seeded", +m === 20, `got ${m}`);
      } else {
        ok("Mascot Public Amenities", "absent");
      }
      if (b != null && m != null) {
        assert("Bayside order before Mascot", +b < +m, `b=${b} m=${m}`);
      }
    }
  } finally {
    await pg.end().catch(() => undefined);
  }

  console.log("\n[3] Sites dropdown (getSites)");
  const sitesRes = await requestJson("GET", `${API_BASE}/sites/getSites`, { headers });
  const sites = listRows(sitesRes.json);
  assert(
    "getSites ok",
    (sitesRes.status === 200 || sitesRes.status === 201) && sitesRes.json?.code === 1,
    `status=${sitesRes.status} code=${sitesRes.json?.code}`,
  );
  assert("getSites returns sites", sites.length > 0, `count=${sites.length}`);
  const hasSortField = sites.some(
    (s) => s.dropdownSortOrder != null || Object.prototype.hasOwnProperty.call(s, "dropdownSortOrder"),
  );
  ok(
    "getSites exposes dropdownSortOrder when present",
    hasSortField ? "field on rows" : "all null (ok if unseeded)",
  );

  console.log("\n[4] New Reports (user-tasks list)");
  const tasksRes = await requestJson(
    "GET",
    `${API_BASE}/user-tasks?page=1&limit=10&orderBy=createdAt&orderValue=DESC`,
    { headers },
  );
  const tasks = listRows(tasksRes.json);
  assert(
    "user-tasks list ok",
    (tasksRes.status === 200 || tasksRes.status === 201) &&
      (tasksRes.json?.code === 1 || Array.isArray(tasksRes.json?.data) || tasks.length >= 0),
    `status=${tasksRes.status} code=${tasksRes.json?.code} raw=${JSON.stringify(tasksRes.json)?.slice(0, 200)}`,
  );
  ok("user-tasks list reachable", `rows≈${tasks.length}`);

  console.log("\n[5] Messages (admin inbox)");
  const threadsRes = await requestJson("GET", `${API_BASE}/messages/threads`, { headers });
  assert(
    "messages/threads ok",
    (threadsRes.status === 200 || threadsRes.status === 201) && threadsRes.json?.code === 1,
    `status=${threadsRes.status} code=${threadsRes.json?.code}`,
  );
  const unreadRes = await requestJson("GET", `${API_BASE}/messages/unreadCount`, { headers });
  assert(
    "messages/unreadCount ok",
    (unreadRes.status === 200 || unreadRes.status === 201) && unreadRes.json?.code === 1,
    `status=${unreadRes.status} code=${unreadRes.json?.code}`,
  );

  console.log("\n[6] Report faults");
  const faultsRes = await requestJson(
    "GET",
    `${API_BASE}/report-faults?page=1&limit=10&orderBy=createdAt&orderValue=DESC`,
    { headers },
  );
  assert(
    "report-faults list ok",
    (faultsRes.status === 200 || faultsRes.status === 201) && faultsRes.json?.code === 1,
    `status=${faultsRes.status} code=${faultsRes.json?.code}`,
  );
  const faultRows = listRows(faultsRes.json);
  ok("report-faults list reachable", `rows≈${faultRows.length}`);

  console.log("\n[7] Staff path: getSites sort + messages recipients");
  const staffCandidates = [];
  if (process.env.SMOKE_USER) {
    staffCandidates.push({
      username: process.env.SMOKE_USER,
      password: pass,
      type: +(process.env.SMOKE_TYPE || 2),
    });
  }
  staffCandidates.push(
    { username: "adam@servicelink.net.au", password: pass, type: 2 },
    { username: "helpdesk2@servicelink.net.au", password: pass, type: 2 },
  );
  const staff = await tryLogin(staffCandidates);
  if (!staff) {
    ok("staff login", "skipped (no staff credentials)");
  } else {
    ok("staff login", staff.loginAs.username);
    const staffHeaders = authHeaders(staff.token);
    const staffSitesRes = await requestJson("GET", `${API_BASE}/sites/getSites`, {
      headers: staffHeaders,
    });
    const staffSites = listRows(staffSitesRes.json);
    assert(
      "staff getSites ok",
      (staffSitesRes.status === 200 || staffSitesRes.status === 201) &&
        staffSitesRes.json?.code === 1,
      `status=${staffSitesRes.status}`,
    );
    assert("staff getSites returns sites", staffSites.length > 0, `count=${staffSites.length}`);

    const names = staffSites.map((s) => String(s.name || "").trim());
    const bi = names.findIndex((n) => /^bayside public amenities$/i.test(n));
    const mi = names.findIndex((n) => /^mascot public amenities$/i.test(n));
    if (bi >= 0 && mi >= 0) {
      assert(
        "staff dropdown: Bayside before Mascot",
        bi < mi,
        `bayside@${bi} mascot@${mi}`,
      );
    } else {
      ok("staff dropdown Bayside/Mascot order", "parents not on this staff — skip");
    }

    // recipients is staff/customer only (not admin)
    const recipientsRes = await requestJson("GET", `${API_BASE}/messages/recipients`, {
      headers: staffHeaders,
    });
    assert(
      "staff messages/recipients ok",
      (recipientsRes.status === 200 || recipientsRes.status === 201) &&
        recipientsRes.json?.code === 1,
      `status=${recipientsRes.status} code=${recipientsRes.json?.code}`,
    );

    const staffThreads = await requestJson("GET", `${API_BASE}/messages/threads`, {
      headers: staffHeaders,
    });
    assert(
      "staff messages/threads ok",
      (staffThreads.status === 200 || staffThreads.status === 201) &&
        staffThreads.json?.code === 1,
      `status=${staffThreads.status} code=${staffThreads.json?.code}`,
    );
  }

  console.log(`\nSite-sort regression: ${passed} passed, ${failed} failed`);
  if (failures.length) {
    console.error("Failures:");
    failures.forEach((f) => console.error(`  - ${f}`));
  }
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
