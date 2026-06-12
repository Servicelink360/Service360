require('dotenv').config({ path: require('path').join(__dirname, '../.env.prod') });
const { Client } = require('pg');

const STATUS = { 0: 'NEW', 1: 'COMPLETED', 2: 'PENDING', 3: 'INPROGRESS', 4: 'DELETED' };

(async () => {
  const c = new Client({
    host: process.env.DATABASE_HOST,
    port: 5432,
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DB_NAME,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  const dbHost = process.env.DATABASE_HOST;
  const checkedAt = new Date().toISOString();

  const total = await c.query('SELECT COUNT(*)::int n FROM report_faults');
  const byStatus = await c.query(
    'SELECT status, COUNT(*)::int n FROM report_faults GROUP BY status ORDER BY status',
  );
  const hidden = await c.query(
    'SELECT COUNT(*)::int n FROM report_fault_customer_visibility WHERE hidden_at IS NOT NULL',
  );
  const visibleDefault = await c.query(
    'SELECT COUNT(*)::int n FROM report_faults WHERE status NOT IN (3, 4)',
  );
  const answers = await c.query('SELECT COUNT(*)::int n FROM report_fault_answers');
  const listableAnswers = await c.query(`
    SELECT COUNT(*)::int n FROM report_fault_answers a
    INNER JOIN report_faults f ON f.id = a.report_fault_id
    WHERE f.status NOT IN (3, 4)
  `);

  const softDeleted = await c.query(`
    SELECT id, status, subject, customer_id, staff_id, created_at
    FROM report_faults WHERE status = 4 ORDER BY id
  `);
  const inProgress = await c.query(`
    SELECT id, status, subject, customer_id, staff_id, created_at
    FROM report_faults WHERE status = 3 ORDER BY id
  `);

  const allFaults = await c.query(`
    SELECT
      f.id,
      f.status,
      f.subject,
      f.customer_id,
      f.staff_id,
      f.created_at,
      (SELECT COUNT(*)::int FROM report_fault_answers a WHERE a.report_fault_id = f.id) AS answer_count,
      CASE
        WHEN f.status IN (3, 4) THEN false
        ELSE true
      END AS in_default_list
    FROM report_faults f
    ORDER BY f.id
  `);

  const recent = await c.query(`
    SELECT id, status, subject, customer_id, created_at
    FROM report_faults
    ORDER BY created_at DESC
    LIMIT 10
  `);

  const customerHidden = await c.query(`
    SELECT v.report_fault_id, v.user_id, v.hidden_at, f.status, f.subject
    FROM report_fault_customer_visibility v
    JOIN report_faults f ON f.id = v.report_fault_id
    WHERE v.hidden_at IS NOT NULL
    ORDER BY v.hidden_at DESC
  `);

  const fault89 = await c.query(
    'SELECT id, status, subject, customer_id, staff_id, created_at, message FROM report_faults WHERE id = 89',
  );

  const idGaps = await c.query(`
    WITH ids AS (SELECT generate_series(MIN(id), MAX(id))::int AS id FROM report_faults)
    SELECT ids.id AS missing_id
    FROM ids
    LEFT JOIN report_faults f ON f.id = ids.id
    WHERE f.id IS NULL
    ORDER BY ids.id
  `);

  console.log(
    JSON.stringify(
      {
        checkedAt,
        database: dbHost,
        summary: {
          totalInDatabase: total.rows[0].n,
          byStatus: byStatus.rows.map((r) => ({
            status: r.status,
            label: STATUS[r.status] || 'UNKNOWN',
            count: r.n,
          })),
          shownInDefaultAdminCustomerList: visibleDefault.rows[0].n,
          hiddenFromDefaultList: total.rows[0].n - visibleDefault.rows[0].n,
          inProgressHidden: inProgress.rows.length,
          softDeletedHidden: softDeleted.rows.length,
          answerRowsTotal: answers.rows[0].n,
          answerRowsInDefaultList: listableAnswers.rows[0].n,
          customerHiddenRows: hidden.rows[0].n,
          hardDeletedIdGaps: idGaps.rows.length,
        },
        hiddenFromDefaultList: {
          inProgress: inProgress.rows.map((r) => ({
            ...r,
            statusLabel: STATUS[r.status],
          })),
          softDeleted: softDeleted.rows.map((r) => ({
            ...r,
            statusLabel: STATUS[r.status],
          })),
        },
        customerPerUserHidden: customerHidden.rows,
        missingIdsPossiblyHardDeleted: idGaps.rows.map((r) => r.missing_id),
        fault89: fault89.rows[0]
          ? { ...fault89.rows[0], statusLabel: STATUS[fault89.rows[0].status], message: '[truncated]' }
          : null,
        recentFaults: recent.rows.map((r) => ({
          ...r,
          statusLabel: STATUS[r.status],
        })),
        allFaultIds: allFaults.rows.map((r) => ({
          id: r.id,
          status: r.status,
          statusLabel: STATUS[r.status],
          subject: r.subject,
          inDefaultList: r.in_default_list,
          answerCount: r.answer_count,
        })),
      },
      null,
      2,
    ),
  );

  await c.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
