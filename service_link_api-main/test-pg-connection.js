// test-pg-connection.js
const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT,
  user: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_DB_NAME,
});

client.connect()
  .then(() => {
    console.log('PostgreSQL connection successful!');
    return client.end();
  })
  .catch(err => {
    console.error('PostgreSQL connection failed:', err.message);
    process.exit(1);
  });
