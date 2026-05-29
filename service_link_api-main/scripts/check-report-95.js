const { Client } = require('pg');

async function main() {
  const c = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '123456',
    database: 'service360',
  });
  await c.connect();

  const fault95 = await c.query(
    'SELECT id, subject, status, staff_id, customer_id, created_at FROM report_faults WHERE id = $1',
    [95],
  );
  const nearby = await c.query(
    `SELECT id, subject, status FROM report_faults
     WHERE subject ILIKE '%Gaijuga%' OR id BETWEEN 90 AND 100
     ORDER BY id`,
  );
  const task95 = await c.query(
    'SELECT id, task_name, type, status, staff_id, customer_id FROM user_tasks WHERE id = $1',
    [95],
  );
  const answers = await c.query(
    'SELECT id, report_fault_id, message FROM report_fault_answers WHERE report_fault_id = $1',
    [95],
  );
  const msgRef = await c.query(
    `SELECT id, report_fault_id, user_task_id, LEFT(body, 120) AS body_preview
     FROM customer_admin_messages
     WHERE body ILIKE '%#95%' OR report_fault_id = 95 OR user_task_id = 95
     ORDER BY id DESC LIMIT 5`,
  );

  console.log('=== report_faults WHERE id = 95 ===');
  console.log(fault95.rows.length ? fault95.rows : '(no row)');

  console.log('\n=== user_tasks WHERE id = 95 ===');
  console.log(task95.rows.length ? task95.rows : '(no row)');

  console.log('\n=== report_fault_answers for fault_id 95 ===');
  console.log(answers.rows);

  console.log('\n=== nearby faults / Gaijuga ===');
  console.log(nearby.rows);

  console.log('\n=== recent messages mentioning #95 ===');
  console.log(msgRef.rows);

  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
