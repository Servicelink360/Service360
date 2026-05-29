// reset-admin-password.js
const bcrypt = require('bcrypt');
const { Client } = require('pg');
require('dotenv').config();

const dbConfig = {
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT,
  user: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_DB_NAME
};

const username = 'admin'; // Change if needed
const newPassword = '123456';
const saltRounds = parseInt(process.env.BCRYPT_SALT) || 10;
const passwordSalt = process.env.PASSWORD_SALT || '';

async function resetPassword() {
  const client = new Client(dbConfig);
  await client.connect();

  const hash = bcrypt.hashSync(newPassword + passwordSalt, saltRounds);

  const res = await client.query(
    'UPDATE users SET password = $1 WHERE username = $2',
    [hash, username]
  );

  console.log(`Password reset for user "${username}". Rows affected: ${res.rowCount}`);
  await client.end();
}

resetPassword().catch(err => {
  console.error('Error resetting password:', err);
});
