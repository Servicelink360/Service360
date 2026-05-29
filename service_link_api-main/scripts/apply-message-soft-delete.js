/**
 * Apply message soft-delete table migration.
 * Usage: node scripts/apply-message-soft-delete.js
 */
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Client } = require('pg');

const envPaths = [
  path.join(process.cwd(), '.env'),
  path.join(__dirname, '..', '.env'),
];
for (const p of envPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

function sslOption() {
  const raw = String(process.env.DATABASE_SSL ?? '').trim().toLowerCase();
  if (raw === '1' || raw === 'true' || raw === 'yes') {
    return { rejectUnauthorized: false };
  }
  return undefined;
}

async function main() {
  const host = process.env.DATABASE_HOST;
  const user = process.env.DATABASE_USERNAME;
  const password = process.env.DATABASE_PASSWORD;
  const database = process.env.DATABASE_DB_NAME || 'service360';
  const port = parseInt(process.env.DATABASE_PORT || '5432', 10);

  if (!host || !user) {
    console.error('Missing DATABASE_HOST or DATABASE_USERNAME in .env');
    process.exit(1);
  }

  const migrationFiles = ['003_message_soft_delete.sql', '004_message_deletion_purged.sql'];

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
