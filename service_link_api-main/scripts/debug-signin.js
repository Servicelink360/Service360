require('dotenv').config();
const bcrypt = require('bcrypt');
const { Client } = require('pg');
const Redis = require('ioredis');

const email = process.argv[2] || 'helpdesk1@servicelink.net.au';
const password = process.argv[3] || '123456';

(async () => {
  const pg = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '123456',
    database: 'service360',
  });
  await pg.connect();

  const userRes = await pg.query(
    `SELECT u.*, json_agg(json_build_object('roleId', ur.role_id)) FILTER (WHERE ur.id IS NOT NULL) AS roles
     FROM users u
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     WHERE u.email = $1
     GROUP BY u.id`,
    [email],
  );
  const user = userRes.rows[0];
  if (!user) throw new Error('User not found');

  const salt = process.env.PASSWORD_SALT || 'SVLinkSALT@2024';
  const match = await bcrypt.compare(`${password}${salt}`, user.password);
  console.log('Password match:', match);

  const roles = user.roles || [];
  console.log('Roles:', roles);

  try {
    JSON.stringify(user);
    console.log('JSON.stringify(user): OK');
  } catch (e) {
    console.log('JSON.stringify(user): FAIL', e.message);
  }

  const safeUser = { ...user, roles };
  delete safeUser.password;
  try {
    JSON.stringify(safeUser);
    console.log('JSON.stringify(safeUser): OK');
  } catch (e) {
    console.log('JSON.stringify(safeUser): FAIL', e.message);
  }

  try {
    const redis = new Redis({ host: '127.0.0.1', port: 6379, lazyConnect: true });
    await redis.connect();
    await redis.ping();
    console.log('Redis: OK');
    await redis.quit();
  } catch (e) {
    console.log('Redis: FAIL', e.message);
  }

  await pg.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
