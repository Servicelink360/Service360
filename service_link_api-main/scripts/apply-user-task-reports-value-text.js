/**
 * Applies 005_user_task_reports_value_text.sql using DATABASE_* from .env
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

function sslOption() {
  const v = process.env.DATABASE_SSL;
  if (v === 'true' || v === '1') return { rejectUnauthorized: false };
  return false;
}

async function main() {
  const host = process.env.DATABASE_HOST || 'localhost';
  const port = Number(process.env.DATABASE_PORT || 5432);
  const user = process.env.DATABASE_USERNAME || process.env.DATABASE_USER;
  const password = process.env.DATABASE_PASSWORD;
  const database = process.env.DATABASE_NAME || 'service360';

  if (!user || password === undefined) {
    console.error('Set DATABASE_USERNAME and DATABASE_PASSWORD in .env');
    process.exit(1);
  }

  const migrationFiles = ['005_user_task_reports_value_text.sql'];

  const client = new Client({
    host,
    port,
    user,
    password,
    database,
    ssl: sslOption(),
  });

  try {
    await client.connect();
    for (const file of migrationFiles) {
      const sqlPath = path.join(__dirname, '..', 'database', 'migrations', file);
      const sql = fs.readFileSync(sqlPath, 'utf8');
      await client.query(sql);
      console.log('Applied:', file);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
