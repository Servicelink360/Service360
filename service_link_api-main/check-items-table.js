const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'My_toti1277',
  database: 'servicelink360',
});

async function checkItemsTable() {
  try {
    await client.connect();
    const res = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'items'`);
    console.log('Columns in items table:');
    res.rows.forEach(row => console.log(`${row.column_name} (${row.data_type})`));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

checkItemsTable();
