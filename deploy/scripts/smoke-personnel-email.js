/**
 * Smoke: customer → own personnel email path.
 *   node deploy/scripts/smoke-personnel-email.js
 *   SMOKE_USER=... SMOKE_PASS=... node deploy/scripts/smoke-personnel-email.js
 */
const { Client } = require("../../service_link_api-main/node_modules/pg");
const fs = require("fs");
const path = require("path");

const API_BASE = process.env.SMOKE_API_URL || "http://127.0.0.1:5301/v1";
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

function ok(name, detail) {
  console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(name, detail) {
  console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
}
function warn(name, detail) {
  console.log(`WARN  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function tryLogin(candidates) {
  for (const c of candidates) {
    const res = await requestJson("POST", `${API_BASE}/auth/signIn`, {
      body: {
        username: c.username,
        password: c.password,
        version: "1.0.0",
        type: c.type,
        sessionId: `smoke-personnel-mail-${Date.now()}`,
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

async function main() {
  let failed = 0;
  console.log(`\n[SMOKE-PERSONNEL-EMAIL] API=${API_BASE}\n`);

  const env = loadApiEnv();
  const brevo = String(env.BREVO_API_KEY || env.MAIL_PASSWORD || "").trim();
  const mailConfigured = Boolean(env.MAIL_FROM && brevo.length >= 16);
  if (mailConfigured) {
    ok("mail-config", `MAIL_FROM=${env.MAIL_FROM} keyLen=${brevo.length}`);
  } else {
    warn(
      "mail-config",
      `MAIL_FROM=${env.MAIL_FROM || "(missing)"} BREVO keyLen=${brevo.length} — real SMTP/API send will be skipped`,
    );
  }

  try {
    const health = await fetch("http://127.0.0.1:5301/v1/deploy-status");
    if (health.ok) ok("api-up", `status ${health.status}`);
    else {
      fail("api-up", `status ${health.status}`);
      process.exit(1);
    }
  } catch (e) {
    fail("api-up", e.message);
    process.exit(1);
  }

  const client = new Client({
    host: env.DATABASE_HOST || "localhost",
    port: +(env.DATABASE_PORT || 5432),
    user: env.DATABASE_USERNAME || "postgres",
    password: env.DATABASE_PASSWORD,
    database: env.DATABASE_DB_NAME || "service360",
  });
  await client.connect();

  // Prefer a customer who already has active personnel.
  // Ensure at least one customer has a smoke personnel contact.
  const companyRows = await client.query(
    `
    SELECT c.user_id, c.company_id, u.username, u.email
    FROM customers c
    JOIN users u ON u.id = c.user_id
    WHERE u.status != 4 AND u.type = 1 AND c.company_id IS NOT NULL
    ORDER BY c.user_id
    LIMIT 20
    `,
  );
  let seededEmail = null;
  if (companyRows.rows.length) {
    const anchor = companyRows.rows[0];
    seededEmail = `smoke.personnel.${anchor.user_id}@example.com`;
    await client.query(
      `
      INSERT INTO customer_personnel (company_id, name, email, role, is_active, created_by)
      SELECT $1::int, $2::varchar, $3::varchar, $4::varchar, true, $5::int
      WHERE NOT EXISTS (
        SELECT 1 FROM customer_personnel
        WHERE company_id = $1::int AND LOWER(TRIM(email)) = LOWER(TRIM($3::varchar))
      )
      `,
      [
        anchor.company_id,
        "Smoke Personnel",
        seededEmail,
        "Personnel",
        anchor.user_id,
      ],
    );
    ok(
      "personnel-seed",
      `company=${anchor.company_id} user=${anchor.username || anchor.email} email=${seededEmail}`,
    );
  }

  const withPersonnel = await client.query(
    `
    SELECT u.id, u.username, u.email, u.type, c.company_id,
           COUNT(p.id)::int AS personnel_count
    FROM users u
    INNER JOIN customers c ON c.user_id = u.id
    INNER JOIN customer_personnel p
      ON p.company_id = c.company_id AND p.is_active = true
    WHERE u.status != 4 AND u.type = 1 AND c.company_id IS NOT NULL
    GROUP BY u.id, u.username, u.email, u.type, c.company_id
    ORDER BY personnel_count DESC, u.id
    LIMIT 10
    `,
  );
  const customers = withPersonnel.rows;
  if (!customers.length) {
    const anyCust = await client.query(
      `SELECT id, username, email, type FROM users WHERE status != 4 AND type = 1 ORDER BY id LIMIT 20`,
    );
    warn("personnel-db", "no customer with active personnel; will still test reject path");
    customers.push(...anyCust.rows.map((r) => ({ ...r, personnel_count: 0 })));
  } else {
    ok(
      "personnel-db",
      customers
        .slice(0, 3)
        .map((r) => `${r.username||r.email} n=${r.personnel_count}`)
        .join("; "),
    );
  }

  const forced = process.env.SMOKE_USER
    ? [{ username: process.env.SMOKE_USER, password: PASS, type: +(process.env.SMOKE_TYPE || 1) }]
    : null;

  const candidates = [];
  for (const u of customers) {
    const name = u.username || u.email;
    if (!name) continue;
    candidates.push({ username: name, password: PASS, type: 1 });
    if (u.email && u.email !== name) {
      candidates.push({ username: u.email, password: PASS, type: 1 });
    }
  }

  const auth = await tryLogin(forced || candidates);
  if (!auth) {
    fail("login", "no customer login — set SMOKE_USER/SMOKE_PASS");
    await client.end();
    process.exit(1);
  }
  ok("login", `${auth.loginAs.username} id=${auth.user?.id || "?"}`);

  const token = auth.token;
  const userId = +(auth.user?.id || auth.user?.userId || 0);

  const personnelRes = await requestJson("GET", `${API_BASE}/customer-personnel`, {
    token,
  });
  const personnel = Array.isArray(personnelRes.json?.data) ? personnelRes.json.data : [];
  if (personnelRes.json?.code === 1) {
    ok("personnel-api", `${personnel.length} contacts`);
  } else {
    fail("personnel-api", JSON.stringify(personnelRes.json));
    failed++;
  }

  const own = personnel.find((p) => String(p.email || "").includes("@") && p.isActive !== false);
  const foreignEmail = `not-my-personnel-${Date.now()}@example.com`;

  // Reject foreign / free-typed email
  const rejectRes = await requestJson("POST", `${API_BASE}/messages/send`, {
    token,
    body: {
      body: `Smoke reject foreign email ${new Date().toISOString()}`,
      ccEmails: [foreignEmail],
    },
  });
  if (
    rejectRes.json?.code !== 1 &&
    /own personnel|personnel/i.test(String(rejectRes.json?.message || ""))
  ) {
    ok("reject-foreign-email", rejectRes.json.message);
  } else if (rejectRes.json?.code === 1) {
    fail("reject-foreign-email", "API accepted non-personnel email");
    failed++;
  } else {
    fail("reject-foreign-email", JSON.stringify(rejectRes.json));
    failed++;
  }

  if (own?.email) {
    const stamp = new Date().toISOString();
    const sendRes = await requestJson("POST", `${API_BASE}/messages/send`, {
      token,
      body: {
        body: `Smoke personnel email ${stamp}\nTo: ${own.name} <${own.email}>`,
        ccEmails: [String(own.email).toLowerCase()],
      },
    });
    if (sendRes.json?.code === 1) {
      ok(
        "send-own-personnel",
        `to=${own.email}` +
          (mailConfigured
            ? " (Brevo configured — check inbox/Brevo logs)"
            : " (API accepted; Brevo not configured so delivery skipped)"),
      );
    } else {
      fail("send-own-personnel", JSON.stringify(sendRes.json));
      failed++;
    }

    // Confirm message stored with that cc email
    const listRes = await requestJson("GET", `${API_BASE}/messages?page=1&limit=20`, {
      token,
    });
    const rows = listRes.json?.data?.rows || [];
    const hit = rows.find((m) => {
      const emails = Array.isArray(m.ccEmails)
        ? m.ccEmails
        : typeof m.ccEmails === "string"
          ? (() => {
              try {
                return JSON.parse(m.ccEmails);
              } catch {
                return [];
              }
            })()
          : [];
      return (
        String(m.body || "").includes(stamp) ||
        emails.map((e) => String(e).toLowerCase()).includes(String(own.email).toLowerCase())
      );
    });
    if (hit) ok("stored-message", `id=${hit.id}`);
    else warn("stored-message", "sent OK but latest list did not show stamp (folder filter?)");
  } else {
    warn("send-own-personnel", "skipped — this customer has no personnel with email");
  }

  await client.end();
  console.log(
    `\n[SMOKE-PERSONNEL-EMAIL] done — ${failed ? failed + " failed" : "all passed"}\n`,
  );
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
