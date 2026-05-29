const { Client } = require('pg');
const bcrypt = require('bcrypt');

const email = process.argv[2] || 'helpdesk1@servicelink.net.au';
const testPassword = process.argv[3];
const tryPasswords = process.argv[4] ? process.argv.slice(4) : [
  '', 'Helpdesk123', 'helpdesk123', 'Helpdesk1', 'password', '123456', 'ChangeMe123!',
];

(async () => {
  const c = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: Number(process.env.DATABASE_PORT || 5432),
    user: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || '123456',
    database: process.env.DATABASE_DB_NAME || 'service360',
  });
  await c.connect();
  const r = await c.query(
    `SELECT id, email, username, type, status, password, created_at, updated_at
     FROM users WHERE email ILIKE $1 ORDER BY id`,
    [email],
  );
  console.log('Users matching:', email);
  const salt = process.env.PASSWORD_SALT || 'SVLinkSALT@2024';
  for (const row of r.rows) {
    const info = { ...row, password: row.password ? `${row.password.slice(0, 20)}... (${row.password.length} chars)` : null };
    console.log(JSON.stringify(info, null, 2));
    const passwords = testPassword ? [testPassword] : tryPasswords;
    for (const p of passwords) {
      const match = await bcrypt.compare(`${p}${salt}`, row.password);
      if (match) console.log('Password match:', JSON.stringify(p));
    }
  }
  const roles = await c.query(
    'SELECT ur.*, r.id as role_ref, r.name FROM user_roles ur LEFT JOIN roles r ON r.id::text = ur.role_id::text WHERE ur.user_id = $1',
    [r.rows[0]?.id],
  );
  console.log('Roles:', roles.rows);
  await c.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
