require('dotenv').config();
const { Client } = require('pg');

(async () => {
  const c = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '123456',
    database: 'service360',
  });
  await c.connect();
  const cols = await c.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name IN ('user_roles','roles') ORDER BY table_name, ordinal_position",
  );
  console.log(cols.rows);
  await c.end();
})();
