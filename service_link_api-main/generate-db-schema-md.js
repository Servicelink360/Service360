// generate-db-schema-md.js
// This script connects to PostgreSQL and generates a Markdown file with the schema for all tables in the 'servicelink360' database.
// Requires: npm install pg

const { Client } = require('pg');
const fs = require('fs');

const client = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'servicelink360',
  password: '', // Add password if needed
  port: 5432,
});

async function getTables() {
  const res = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`);
  return res.rows.map(r => r.table_name);
}

async function getTableSchema(table) {
  const columns = await client.query(`SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = $1`, [table]);
  const constraints = await client.query(`SELECT tc.constraint_type, kcu.column_name FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name WHERE tc.table_name = $1`, [table]);
  return { columns: columns.rows, constraints: constraints.rows };
}

(async () => {
  await client.connect();
  const tables = await getTables();
  let md = `# Database Schema for servicelink360\n\n`;
  for (const table of tables) {
    md += `## Table: ${table}\n`;
    const { columns, constraints } = await getTableSchema(table);
    md += `| Column | Type | Nullable | Default |\n|--------|------|----------|---------|\n`;
    for (const col of columns) {
      md += `| ${col.column_name} | ${col.data_type} | ${col.is_nullable} | ${col.column_default || ''} |\n`;
    }
    if (constraints.length) {
      md += `\n**Constraints:**\n`;
      for (const c of constraints) {
        md += `- ${c.constraint_type} on ${c.column_name}\n`;
      }
    }
    md += `\n---\n`;
  }
  fs.writeFileSync('servicelink360_schema.md', md);
  await client.end();
  console.log('Schema written to servicelink360_schema.md');
})();
