/**
 * Smoke: Messages Cc (recipients + company-cc + optional UI).
 *   node deploy/scripts/smoke-messages-cc.js
 *   SMOKE_USER=... SMOKE_PASS=... SMOKE_TYPE=1 node deploy/scripts/smoke-messages-cc.js
 */
const { Client } = require("../../service_link_api-main/node_modules/pg");
const fs = require("fs");
const path = require("path");

const API_BASE = process.env.SMOKE_API_URL || "http://127.0.0.1:5301/v1";
const ADMIN_BASE = process.env.SMOKE_ADMIN_URL || "http://127.0.0.1:3001";
const PASS = process.env.SMOKE_PASS || process.env.SMOKE_PASSWORD || "123456";

function loadApiEnv() {
  const dotenv = require("../../service_link_api-main/node_modules/dotenv");
  const root = path.join(__dirname, "../../service_link_api-main");
  const out = {};
  for (const name of [".env", ".env.local"]) {
    const p = path.join(root, name);
    if (!fs.existsSync(p)) continue;
    Object.assign(out, dotenv.parse(fs.readFileSync(p)));
  }
  return out;
}

async function requestJson(method, url, { body, token } = {}) {
  const headers = { "Content-Type": "application/json", version: "1.0.0" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

async function tryLogin(candidates) {
  for (const c of candidates) {
    const res = await requestJson("POST", `${API_BASE}/auth/signIn`, {
      body: {
        username: c.username,
        password: c.password,
        version: "1.0.0",
        type: c.type,
        sessionId: `smoke-cc-${Date.now()}`,
      },
    });
    const data = res.json?.data || {};
    const token =
      data.accessToken || data.access_token || data.token || res.json?.accessToken;
    if ((res.status === 200 || res.status === 201) && res.json?.code === 1 && token) {
      return { token, user: data, loginAs: c };
    }
  }
  return null;
}

function ok(name, detail) {
  console.log(`PASS  ${name}${detail ? ` � ${detail}` : ""}`);
}
function fail(name, detail) {
  console.error(`FAIL  ${name}${detail ? ` � ${detail}` : ""}`);
}

async function findLocalUsers(env) {
  const client = new Client({
    host: env.DATABASE_HOST || "localhost",
    port: +(env.DATABASE_PORT || 5432),
    user: env.DATABASE_USERNAME || "postgres",
    password: env.DATABASE_PASSWORD,
    database: env.DATABASE_DB_NAME || "service360",
  });
  await client.connect();
  const r = await client.query(
    `SELECT id, username, email, type,
            COALESCE(NULLIF(TRIM(full_name),''), username) AS full_name
     FROM users
     WHERE status != 4
       AND type IN (0,1,2)
     ORDER BY type, id
     LIMIT 80`,
  );
  await client.end();
  return r.rows;
}

async function main() {
  let failed = 0;
  console.log(`\n[SMOKE-MESSAGES-CC] API=${API_BASE} ADMIN=${ADMIN_BASE}\n`);

  // 0) health
  try {
    const health = await fetch("http://127.0.0.1:5301/v1/deploy-status");
    if (health.ok) ok("api-up", `status ${health.status}`);
    else {
      fail("api-up", `status ${health.status}`);
      failed++;
    }
  } catch (e) {
    fail("api-up", e.message);
    failed++;
    process.exit(1);
  }

  try {
    const admin = await fetch(ADMIN_BASE);
    if (admin.ok) ok("admin-up", `status ${admin.status}`);
    else {
      fail("admin-up", `status ${admin.status}`);
      failed++;
    }
  } catch (e) {
    fail("admin-up", e.message);
    failed++;
  }

  const env = loadApiEnv();
  let users = [];
  try {
    users = await findLocalUsers(env);
    ok("db-users", `${users.length} active users`);
  } catch (e) {
    fail("db-users", e.message);
    failed++;
  }

  // API userType: CUSTOMER=1 STAFF=2 ADMIN=3
  const customers = users.filter((u) => +u.type === 1);
  const admins = users.filter((u) => +u.type === 3);
  const staff = users.filter((u) => +u.type === 2);

  const forced = process.env.SMOKE_USER
    ? [
        {
          username: process.env.SMOKE_USER,
          password: PASS,
          type: +(process.env.SMOKE_TYPE || 1),
        },
      ]
    : null;

  const candidates = [];
  for (const u of [...customers, ...admins, ...staff].slice(0, 40)) {
    const name = u.username || u.email;
    if (!name) continue;
    candidates.push({ username: name, password: PASS, type: +u.type });
    if (u.email && u.email !== name) {
      candidates.push({ username: u.email, password: PASS, type: +u.type });
    }
  }
  // de-dupe
  const seen = new Set();
  const uniq = candidates.filter((c) => {
    const k = `${c.type}:${c.username}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const auth = await tryLogin(forced || uniq);
  if (!auth) {
    fail(
      "login",
      forced
        ? `Forced user ${forced[0].username} (type ${forced[0].type}) failed`
        : "No user accepted password � set SMOKE_USER/SMOKE_PASS",
    );
    failed++;
    if (!forced) {
      console.log(
        "\nTried sample usernames:",
        uniq.slice(0, 12).map((c) => c.username).join(", "),
      );
    }
    process.exit(1);
  }
  ok(
    "login",
    `${auth.loginAs.username} type=${auth.loginAs.type} id=${auth.user?.id || auth.user?.userId || "?"}`,
  );

  const token = auth.token;
  const type = +auth.loginAs.type;

  if (type === 1 || type === 2) {
    const rec = await requestJson("GET", `${API_BASE}/messages/recipients`, { token });
    const adminsR = rec.json?.data?.admins || [];
    const cols = rec.json?.data?.colleagues || [];
    if (rec.json?.code === 1) {
      ok(
        "recipients",
        `admins=${adminsR.length} colleagues=${cols.length}` +
          (adminsR[0]?.companyName != null
            ? ` brand=${JSON.stringify(adminsR[0].companyName)}`
            : " brand=(missing)"),
      );
      if (!adminsR.length && !cols.length) {
        fail("recipients-nonempty", "no admins or colleagues");
        failed++;
      }
      if (adminsR.length && adminsR[0].companyName == null) {
        // soft warn � brand should be dynamic when set
        console.log("WARN  recipients-brand � companyName null (fallback ServiceLink label OK)");
      }
    } else {
      fail("recipients", JSON.stringify(rec.json));
      failed++;
    }

    const threads = await requestJson("GET", `${API_BASE}/messages/threads`, { token });
    const rows = threads.json?.data?.rows || [];
    if (threads.json?.code === 1) {
      const kinds = rows.reduce((acc, t) => {
        const k = t.conversationKind || t.peerType || "?";
        acc[k] = (acc[k] || 0) + 1;
        return acc;
      }, {});
      ok("threads", `${rows.length} rows ${JSON.stringify(kinds)}`);
    } else {
      fail("threads", JSON.stringify(threads.json));
      failed++;
    }
  }

  if (type === 3) {
    const cust =
      customers.find((u) => /jessica|alex|bayside/i.test(String(u.username || ""))) ||
      customers[0];
    if (cust) {
      const cc = await requestJson(
        "GET",
        `${API_BASE}/messages/company-cc?customerId=${cust.id}`,
        { token },
      );
      const rows = cc.json?.data?.rows || [];
      if (cc.json?.code === 1) {
        ok(
          "company-cc",
          `customer=${cust.full_name || cust.id} peers=${rows.length}`,
        );
      } else {
        fail("company-cc", JSON.stringify(cc.json));
        failed++;
      }
    } else {
      fail("company-cc", "no customer to query");
      failed++;
    }

    const adminThreads = await requestJson("GET", `${API_BASE}/messages/threads`, {
      token,
    });
    const arows = adminThreads.json?.data?.rows || [];
    if (adminThreads.json?.code === 1) {
      ok("admin-threads", `${arows.length} conversations`);
    } else {
      fail("admin-threads", JSON.stringify(adminThreads.json));
      failed++;
    }
  }

  // personnel for customer
  if (type === 1) {
    const p = await requestJson("GET", `${API_BASE}/customer-personnel`, { token });
    if (p.json?.code === 1) {
      const rows = Array.isArray(p.json.data) ? p.json.data : [];
      ok("personnel", `${rows.length} contacts`);
    } else {
      console.log("WARN  personnel �", p.json?.message || p.status);
    }
  }

  console.log(`\n[SMOKE-MESSAGES-CC] done � ${failed ? failed + " failed" : "all passed"}\n`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
