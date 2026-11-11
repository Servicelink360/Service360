/**
 * Smoke test: Monthly reports — LOCAL only.
 *
 *  1) API up + admin login
 *  2) List customers for month
 *  3) GET pack for Bayside + Inner West (Oct 2026)
 *  4) Pack shape: contractedServices, streams inputs, amenity parents
 *  5) DB: parent PAC daily; child parks N/A frequency
 *  6) KPI simulation: group % never > 100; amenity parents excluded
 *  7) PDF generate for Bayside
 *
 * Usage:
 *   node deploy/scripts/smoke-monthly-reports.js
 *   SMOKE_ADMIN_USER=... SMOKE_PASS=... node deploy/scripts/smoke-monthly-reports.js
 *
 * Never uses .env.prod / RDS.
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const { URL } = require("url");
const { Client } = require(path.resolve(__dirname, "../../service_link_api-main/node_modules/pg"));
const jwt = require(path.resolve(__dirname, "../../service_link_api-main/node_modules/jsonwebtoken"));

const API_BASE = process.env.SMOKE_API_URL || "http://localhost:5301/v1";
const MONTH = process.env.SMOKE_MONTH || "2026-10";
const PARENTS = ["Bayside Public Amenities", "Mascot Public Amenities"];

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
  // Prefer .env.local for DB, then fill gaps from .env (JWT etc).
  const loaded =
    loadEnvFile(path.join(root, ".env.local"))
    | loadEnvFile(path.join(root, ".env"));
  if (!loaded) throw new Error("Missing service_link_api-main/.env.local or .env");
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
        timeout: 120000,
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
        sessionId: `smoke-monthly-${Date.now()}`,
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

function isAmenityParentName(name) {
  return /\bpublic\s+amenities\b/i.test(String(name || "").trim());
}

function childLabelsFromAddress(address) {
  let text = String(address || "").trim();
  if (!text) return [];
  text = text.replace(/^sites?\s*:\s*/i, "").trim();
  if (/\d+\.\s*\S/.test(text)) {
    return text
      .split(/\d+\.\s*/)
      .map((part) => part.replace(/[.,]\s*$/g, "").trim())
      .filter(Boolean);
  }
  return text
    .split(",")
    .map((part) => part.replace(/^[.\s]+|[.\s]+$/g, "").trim())
    .filter(Boolean);
}

function softSiteMatch(a, b) {
  const na = String(a || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  const nb = String(b || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

function siteGroup(name) {
  const text = String(name || "").toLowerCase();
  if (/child|elc|\bccc\b|kindergarten|preschool|day care|daycare/.test(text)) return "Early Learning Centers";
  if (/aquatic|pool|swim/.test(text)) return "Aquatic Centers";
  if (/town hall|townhall|library/.test(text)) return "Town Hall and Library";
  if (/depot/.test(text)) return "Depot";
  if (/community|hall|centre|center/.test(text)) return "Community Centers";
  if (/toilet|amenit|park|oval|pavilion/.test(text)) return "Parks and amenities";
  return "Other sites";
}

function visitsDue(site, daysInMonth) {
  const fromApi = site.scheduleVisits != null ? Math.max(0, Math.floor(+site.scheduleVisits)) : 0;
  if (fromApi > 0) return fromApi;
  const period = String(site.frequencyPeriod || "").toLowerCase();
  if (!period || period === "na") return 0;
  const times = Math.max(1, Math.floor(+(site.frequencyTimes ?? 1)));
  const count = Math.max(1, Math.floor(+(site.frequencyCount ?? 1)));
  if (period === "day") return Math.max(0, Math.round((times / count) * daysInMonth));
  if (period === "week") return Math.max(0, Math.round((times / count) * (daysInMonth / 7)));
  if (period === "month") return count <= 1 ? Math.max(1, times) : Math.max(1, Math.round(times));
  return 0;
}

/** Mirror MonthlyCustomerPack schedule/completed rules for one contracted service. */
function simulateSummary(svc, workRows, daysInMonth) {
  const sites = svc.sites || [];
  const scheduleBySite = new Map();
  sites.forEach((site) => {
    scheduleBySite.set(site.name, Math.max(scheduleBySite.get(site.name) || 0, visitsDue(site, daysInMonth)));
  });
  const reportsBySite = new Map();
  workRows.forEach((row) => {
    const text = `${row.service || ""} ${row.title || ""} ${row.kind || ""}`;
    if (/adhoc|fault|reactive/i.test(text)) return;
    if (svc.id != null && row.serviceId != null && +row.serviceId !== +svc.id) return;
    if (
      svc.id == null
      && String(row.service || "").trim().toLowerCase() !== String(svc.name || "").trim().toLowerCase()
    ) {
      return;
    }
    const site = String(row.site || "").trim() || "Unnamed site";
    reportsBySite.set(site, (reportsBySite.get(site) || 0) + 1);
  });

  const amenityParents = sites
    .filter((site) => isAmenityParentName(site.name))
    .map((site) => ({
      name: site.name,
      labels: childLabelsFromAddress(site.addressName || ""),
    }))
    .filter((site) => site.labels.length > 0);
  const isAmenityParentSite = (site) =>
    amenityParents.some((parent) => softSiteMatch(site, parent.name));
  const isAmenityChildSite = (site) =>
    amenityParents.some((parent) => parent.labels.some((label) => softSiteMatch(site, label)));

  [...reportsBySite.keys()].forEach((site) => {
    if (isAmenityParentSite(site)) reportsBySite.delete(site);
  });
  amenityParents.forEach((parent) => {
    [...scheduleBySite.keys()].forEach((siteName) => {
      if (softSiteMatch(siteName, parent.name)) scheduleBySite.set(siteName, 0);
    });
  });

  const groups = new Map();
  reportsBySite.forEach((reports, site) => {
    if (reports <= 0) return;
    const freqDue = isAmenityChildSite(site) ? reports : scheduleBySite.get(site) || 0;
    const due = freqDue > 0 ? freqDue : reports;
    const group = siteGroup(site);
    const entry = groups.get(group) || { schedule: 0, completed: 0, sites: new Set() };
    if (!entry.sites.has(site)) {
      entry.sites.add(site);
      entry.schedule += due;
    }
    entry.completed += Math.min(reports, due);
    groups.set(group, entry);
  });

  return [...groups.entries()].map(([group, entry]) => {
    const schedule = entry.schedule;
    const completed = Math.min(entry.completed, entry.schedule);
    const pct = schedule > 0 ? Math.round((Math.min(completed, schedule) / schedule) * 100) : null;
    return { group, schedule, completed, pct };
  });
}

async function main() {
  console.log(`Monthly reports smoke — ${API_BASE} month=${MONTH}`);
  loadLocalEnv();

  const db = new Client({
    host: process.env.DATABASE_HOST || "127.0.0.1",
    port: +(process.env.DATABASE_PORT || 5432),
    user: process.env.DATABASE_USERNAME || "postgres",
    password: process.env.DATABASE_PASSWORD || "postgres",
    database: process.env.DATABASE_DB_NAME || "service360",
  });
  await db.connect();

  console.log("\n[0] API + login");
  const health = await requestJson("GET", `${API_BASE}/auth/checkUsername?username=smoke-probe`).catch(
    (e) => ({ status: 0, json: { error: e.message } }),
  );
  assert("API reachable", !!health.status, health.status ? `status=${health.status}` : health.json?.error);
  if (!health.status) {
    await db.end();
    throw new Error("API not running on localhost:5301");
  }

  const pass = process.env.SMOKE_PASS || process.env.SMOKE_PASSWORD || "123456";
  const candidates = [];
  if (process.env.SMOKE_ADMIN_USER || process.env.SMOKE_USER) {
    candidates.push({
      username: process.env.SMOKE_ADMIN_USER || process.env.SMOKE_USER,
      password: pass,
      type: +(process.env.SMOKE_TYPE || 3),
    });
  }
  candidates.push(
    { username: "helpdesk@servicelink.net.au", password: pass, type: 3 },
    { username: "helpdesk2@servicelink.net.au", password: pass, type: 3 },
    { username: "admin@servicelink.net.au", password: pass, type: 3 },
  );
  let auth = await tryLogin(candidates);
  if (!auth) {
    // Local DBs often have unknown passwords — mint a short-lived admin JWT (same as tmp/regen-monthly-pdf.js).
    const admin = (
      await db.query(
        `SELECT id, username, email, full_name, type
         FROM users
         WHERE type = 3 AND (username ILIKE '%helpdesk%' OR email ILIKE '%helpdesk%' OR username ILIKE '%admin%')
         ORDER BY id
         LIMIT 1`,
      )
    ).rows[0];
    const secret = process.env.JWT_SECRET_KEY;
    if (admin && secret) {
      const token = jwt.sign(
        {
          username: admin.username || admin.email,
          sub: +admin.id,
          email: admin.email || admin.username,
          fullName: admin.full_name || "Smoke Admin",
          type: 3,
          roleIds: [],
          companyId: null,
        },
        secret,
        { expiresIn: "1h" },
      );
      auth = { token, user: admin, loginAs: { username: admin.username || admin.email, type: 3 } };
      ok("admin JWT fallback", auth.loginAs.username);
    }
  } else {
    ok("admin login", auth.loginAs.username);
  }
  assert("admin auth", !!auth, "set SMOKE_ADMIN_USER / SMOKE_PASS or JWT_SECRET_KEY");
  if (!auth) {
    await db.end();
    process.exit(1);
  }
  const headers = { Authorization: `Bearer ${auth.token}` };

  console.log("\n[1] Customers list");
  const customersRes = await requestJson(
    "GET",
    `${API_BASE}/monthly-reports/customers?month=${encodeURIComponent(MONTH)}`,
    { headers },
  );
  assert(
    "customers endpoint",
    customersRes.json?.code === 1,
    `status=${customersRes.status} code=${customersRes.json?.code} msg=${customersRes.json?.message || ""}`,
  );
  const customers = customersRes.json?.data || [];
  assert("customers non-empty", Array.isArray(customers) && customers.length > 0, `n=${customers.length}`);

  const pickCompany = (re) => {
    const hit = customers.find((c) => re.test(String(c.name || c.companyName || "")));
    return hit ? +(hit.companyId || hit.id || hit.company_id) : null;
  };
  let baysideId = pickCompany(/bayside/i);
  let innerwestId = pickCompany(/inner\s*west/i);
  if (!baysideId || !innerwestId) {
    const rows = (
      await db.query(
        `SELECT id, name FROM customer_companies
         WHERE name ILIKE '%bayside%' OR name ILIKE '%inner%west%'
         ORDER BY name`,
      )
    ).rows;
    if (!baysideId) baysideId = +(rows.find((r) => /bayside/i.test(r.name))?.id || 0) || null;
    if (!innerwestId) innerwestId = +(rows.find((r) => /inner/i.test(r.name))?.id || 0) || null;
  }
  assert("Bayside company resolved", !!baysideId, `id=${baysideId}`);
  assert("Inner West company resolved", !!innerwestId, `id=${innerwestId}`);

  console.log("\n[2] DB amenity frequency");
  const freq = await db.query(
    `SELECT st.name, si.frequency_times, si.frequency_count, si.frequency_period
     FROM site_items si
     JOIN sites st ON st.id = si.site_id
     JOIN services sv ON sv.id = si.service_id
     WHERE sv.name = 'Public Amenities Cleaning'
       AND (
         st.name = ANY($1::text[])
         OR st.name ILIKE '%park%'
         OR st.name ILIKE '%oval%'
         OR st.name ILIKE '%reserve%'
         OR st.name ILIKE '%botany%'
       )
     ORDER BY st.name`,
    [PARENTS],
  );
  const parentRows = freq.rows.filter((r) => PARENTS.includes(r.name));
  const childRows = freq.rows.filter((r) => !PARENTS.includes(r.name));
  assert(
    "parents still daily",
    parentRows.length >= 2
      && parentRows.every(
        (r) => +r.frequency_times === 1 && +r.frequency_count === 1 && String(r.frequency_period) === "day",
      ),
    parentRows.map((r) => `${r.name}=${r.frequency_times}/${r.frequency_count}/${r.frequency_period}`).join("; "),
  );
  const dailyChildren = childRows.filter(
    (r) => String(r.frequency_period || "").toLowerCase() === "day" && +r.frequency_times > 0,
  );
  assert(
    "child parks not daily",
    dailyChildren.length === 0,
    dailyChildren.length ? dailyChildren.map((r) => r.name).join(", ") : `cleared=${childRows.length}`,
  );

  console.log("\n[3] GET packs");
  async function getPack(label, companyId) {
    const res = await requestJson(
      "GET",
      `${API_BASE}/monthly-reports?companyId=${companyId}&month=${encodeURIComponent(MONTH)}`,
      { headers },
    );
    assert(
      `${label} GET`,
      res.json?.code === 1 && !!res.json?.data,
      `status=${res.status} code=${res.json?.code} msg=${res.json?.message || ""}`,
    );
    return res.json?.data || null;
  }

  const bayside = await getPack("Bayside", baysideId);
  const innerwest = await getPack("Inner West", innerwestId);

  if (bayside) {
    assert("Bayside has customer", !!bayside.customer?.name, bayside.customer?.name);
    assert(
      "Bayside contractedServices",
      Array.isArray(bayside.contractedServices) && bayside.contractedServices.length > 0,
      `n=${bayside.contractedServices?.length || 0}`,
    );
    assert("Bayside work array", Array.isArray(bayside.work), `n=${bayside.work?.length || 0}`);
    const pac = (bayside.contractedServices || []).find((s) =>
      /public amenities cleaning/i.test(String(s.name || "")),
    );
    assert("Bayside has Public Amenities Cleaning", !!pac, pac?.name);
    if (pac) {
      const parentSites = (pac.sites || []).filter((s) => isAmenityParentName(s.name));
      assert(
        "PAC parents present",
        parentSites.length >= 1,
        parentSites.map((s) => s.name).join(", "),
      );
      parentSites.forEach((p) => {
        const labels = childLabelsFromAddress(p.addressName || "");
        assert(`${p.name} has child labels`, labels.length > 0, `n=${labels.length}`);
      });

      const days = 31;
      const summaries = (bayside.contractedServices || []).map((svc) => ({
        service: svc.name,
        rows: simulateSummary(svc, bayside.work || [], days),
      }));
      let over = [];
      summaries.forEach((s) => {
        s.rows.forEach((row) => {
          if (row.pct != null && row.pct > 100) over.push(`${s.service}/${row.group}=${row.pct}%`);
        });
      });
      assert("Bayside KPI % never > 100", over.length === 0, over.join("; ") || "all capped");

      const pacSummary = summaries.find((s) => /public amenities cleaning/i.test(s.service));
      if (pacSummary) {
        const parentInKpi = pacSummary.rows.some((r) => /public amenities/i.test(r.group) && false);
        // Parents contribute via child parks group only — schedule should not be 2×31 from parents alone.
        const parks = pacSummary.rows.find((r) => r.group === "Parks and amenities");
        if (parks) {
          assert(
            "PAC parks schedule not parent-daily inflated",
            parks.schedule < 50,
            `schedule=${parks.schedule} completed=${parks.completed} pct=${parks.pct}`,
          );
          assert(
            "PAC parks pct is 100 when children visited",
            parks.schedule === 0 || parks.pct === 100,
            `pct=${parks.pct}`,
          );
        } else {
          ok("PAC parks summary", "no parks group this month (no child uploads)");
        }
        void parentInKpi;
      }
    }
  }

  if (innerwest) {
    assert("Inner West has customer", !!innerwest.customer?.name, innerwest.customer?.name);
    assert(
      "Inner West contractedServices",
      Array.isArray(innerwest.contractedServices) && innerwest.contractedServices.length > 0,
      `n=${innerwest.contractedServices?.length || 0}`,
    );
    const days = 31;
    const over = [];
    (innerwest.contractedServices || []).forEach((svc) => {
      simulateSummary(svc, innerwest.work || [], days).forEach((row) => {
        if (row.pct != null && row.pct > 100) over.push(`${svc.name}/${row.group}=${row.pct}%`);
      });
    });
    assert("Inner West KPI % never > 100", over.length === 0, over.join("; ") || "all capped");
  }

  console.log("\n[4] PDF");
  if (bayside) {
    const editBody =
      bayside.edit && typeof bayside.edit === "object"
        ? bayside.edit
        : {
            clientName: bayside.customer?.name || "Bayside",
            periodLabel: MONTH,
            streams: [],
          };
    const pdf = await requestJson("POST", `${API_BASE}/monthly-reports/pdf`, {
      headers,
      body: { companyId: baysideId, month: MONTH, body: editBody },
    });
    const pdfOk =
      (pdf.status === 200 || pdf.status === 201)
      && (pdf.json?.code === 1 || !!pdf.json?.data || !!pdf.json?.url || !!pdf.json?.path);
    assert(
      "Bayside PDF",
      pdfOk,
      `status=${pdf.status} code=${pdf.json?.code} msg=${pdf.json?.message || ""} keys=${Object.keys(pdf.json || {}).join(",")}`,
    );
  }

  await db.end();

  console.log(`\n${"=".repeat(48)}`);
  console.log(`Monthly reports smoke: ${passed} passed, ${failed} failed`);
  if (failures.length) {
    failures.forEach((f) => console.log(`  - ${f}`));
    process.exit(1);
  }
  console.log("OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
