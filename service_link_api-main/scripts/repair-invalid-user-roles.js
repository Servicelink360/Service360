require('dotenv').config();
const { Client } = require('pg');

(async () => {
  const c = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: Number(process.env.DATABASE_PORT || 5432),
    user: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || '123456',
    database: process.env.DATABASE_DB_NAME || 'service360',
  });
  await c.connect();

  const bad = await c.query(
    `SELECT id, user_id, role_id FROM user_roles WHERE role_id = 'NaN' OR role_id IS NULL`,
  );
  console.log('Broken role rows:', bad.rows);

  for (const row of bad.rows) {
    await c.query('DELETE FROM user_roles WHERE id = $1', [row.id]);
    await c.query(
      `INSERT INTO user_roles (user_id, role_id, created_at)
       SELECT $1, 'ADMIN', NOW()
       WHERE NOT EXISTS (
         SELECT 1 FROM user_roles WHERE user_id = $1 AND role_id = 'ADMIN'
       )`,
      [row.user_id],
    );
    console.log(`Repaired user_id=${row.user_id} -> ADMIN`);
  }

  const verify = await c.query(
    `SELECT ur.user_id, u.email, ur.role_id, r.name
     FROM user_roles ur
     JOIN users u ON u.id = ur.user_id
     LEFT JOIN roles r ON r.id = ur.role_id
     WHERE u.email ILIKE '%helpdesk%'`,
  );
  console.log('After repair:', verify.rows);
  await c.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
