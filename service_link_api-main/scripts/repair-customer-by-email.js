/**
 * Repair a user account: force type=CUSTOMER, ensure customers row, tag company [C-id].
 * Usage: node scripts/repair-customer-by-email.js jessica.bosevska_copy@bayside.nsw.gov.au
 */
const { Client } = require('pg');

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/repair-customer-by-email.js <email>');
  process.exit(1);
}

function formatCompanyName(companyName, userId) {
  const base = String(companyName ?? '')
    .replace(/\s*\[C-\d+\]\s*/gi, ' ')
    .replace(/\s*\(Copy\)\s*/gi, ' ')
    .trim();
  const tag = `[C-${userId}]`;
  return base ? `${base} ${tag}` : tag;
}

async function main() {
  const c = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '123456',
    database: 'service360',
  });
  await c.connect();

  const users = await c.query(
    `SELECT id, username, email, type FROM users WHERE LOWER(email) = LOWER($1)`,
    [email],
  );
  if (!users.rows.length) {
    console.error('User not found:', email);
    process.exit(1);
  }
  const user = users.rows[0];
  const userId = user.id;

  await c.query(`UPDATE users SET type = 1 WHERE id = $1`, [userId]);
  await c.query(`DELETE FROM staff WHERE user_id = $1`, [userId]).catch(() => {});

  const existing = await c.query(`SELECT * FROM customers WHERE user_id = $1`, [userId]);
  let companyName = existing.rows[0]?.company_name ?? '';
  companyName = formatCompanyName(companyName, userId);

  if (existing.rows.length) {
    await c.query(
      `UPDATE customers SET company_name = $1 WHERE user_id = $2`,
      [companyName, userId],
    );
  } else {
    const src = await c.query(
      `SELECT * FROM customers c
       JOIN users u ON u.id = c.user_id
       WHERE u.type = 1 AND u.id != $1
       ORDER BY u.id DESC LIMIT 1`,
      [userId],
    );
    const template = src.rows[0] || {};
    await c.query(
      `INSERT INTO customers (
        user_id, city, state, post_code, country, website, location, land_line,
        description, send_login_info, show_qr_code, company_name, company_phone, company_email
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        userId,
        template.city ?? '',
        template.state ?? '',
        template.post_code ?? '',
        template.country ?? '',
        template.website ?? '',
        template.location ?? '',
        template.land_line ?? '',
        template.description ?? '',
        template.send_login_info ?? 0,
        template.show_qr_code ?? 0,
        companyName,
        template.company_phone ?? '',
        template.company_email ?? '',
      ],
    );
  }

  const after = await c.query(
    `SELECT u.id, u.email, u.type, c.company_name
     FROM users u
     LEFT JOIN customers c ON c.user_id = u.id
     WHERE u.id = $1`,
    [userId],
  );
  console.log('Repaired:', after.rows[0]);
  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
