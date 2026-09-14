const { Client } = require('pg');

/** Replace broken UTF-8 / replacement chars with plain ASCII. */
function cleanText(s) {
  return String(s || '')
    .replace(/\uFFFD/g, '-')
    .replace(/\u00E2\u0080[\u0093\u0094]/g, '-') // mojibake en/em dash
    .replace(/�"|—|–/g, '-')
    .replace(/[��]/g, '-')
    .replace(/\s+-\s+/g, ' - ');
}

const fixes = {
  'Exact location on site': 'Male amenities entry - wet floor near wash basins',
  'Injured / affected person name': 'N/A - near miss only',
  'Witnesses (names & contacts)': 'Adam Kay (site cleaner) - present when the near miss occurred',
  'Corrective / preventive actions required':
    '1) Place two wet-floor signs (entry + basin area). 2) Brief cleaners on door-swing sign placement. 3) Review mopping sequence for peak entry times. Owner: Adam Kay - due 17 Sep 2026.',
  'Additional comments': '',
};

async function main() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '123456',
    database: 'service360',
  });
  await client.connect();

  await client.query(
    `UPDATE user_tasks SET task_name = $1 WHERE id = 666`,
    ['Incident Report - sample (Adam) - 2026-09-10 09-15-00'],
  );

  for (const [name, value] of Object.entries(fixes)) {
    const r = await client.query(
      `UPDATE user_task_reports SET value = $1
       WHERE user_task_id = 666 AND name = $2
       RETURNING id, name, value`,
      [value, name],
    );
    console.log('set', name, '=>', JSON.stringify(r.rows[0]?.value));
  }

  // Sweep any remaining bad chars in this report
  const all = await client.query(
    `SELECT id, name, value FROM user_task_reports WHERE user_task_id = 666`,
  );
  for (const row of all.rows) {
    const cleaned = cleanText(row.value);
    if (cleaned !== row.value) {
      await client.query(`UPDATE user_task_reports SET value = $1 WHERE id = $2`, [
        cleaned,
        row.id,
      ]);
      console.log('cleaned', row.id, row.name, JSON.stringify(cleaned));
    }
  }

  const check = await client.query(
    `SELECT name, value FROM user_task_reports
     WHERE user_task_id = 666
       AND (value LIKE '%' || CHR(65533) || '%' OR value LIKE '%demo%')`,
  );
  console.log('remaining bad/demo rows', check.rows);

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
