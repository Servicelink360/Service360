require('dotenv').config();
const { Client } = require('pg');

(async () => {
  const c = new Client({
    host: process.env.DATABASE_HOST,
    port: +(process.env.DATABASE_PORT || 5432),
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DB_NAME,
    ssl:
      String(process.env.DATABASE_SSL || '').toLowerCase() === 'true'
        ? { rejectUnauthorized: false }
        : false,
  });
  await c.connect();

  const users = await c.query(`
    SELECT u.id, u.full_name, u.type, u.status, c.company_id, c.company_name, org.name AS org_name
    FROM users u
    LEFT JOIN customers c ON c.user_id = u.id
    LEFT JOIN customer_companies org ON org.id = c.company_id
    WHERE u.full_name ILIKE '%Alex%' OR u.full_name ILIKE '%Jessica%'
    ORDER BY u.full_name
  `);
  console.log('Users:', users.rows);

  const taskId = +(process.argv[2] || 211);
  const task = await c.query(
    'SELECT id, customer_id, customer_name, staff_id, site_name FROM user_tasks WHERE id = $1',
    [taskId],
  );
  console.log('Report', taskId, ':', task.rows[0]);

  const anchor = task.rows[0]?.customer_id ? +task.rows[0].customer_id : 0;
  if (anchor) {
    const peers = await c.query(
      `
      SELECT c.user_id AS id, u.full_name, c.company_id, c.company_name, org.name AS org_name
      FROM customers anchor
      INNER JOIN customers c ON (
        (anchor.company_id IS NOT NULL AND c.company_id = anchor.company_id)
        OR (
          anchor.company_id IS NULL
          AND TRIM(COALESCE(anchor.company_name, '')) <> ''
          AND LOWER(TRIM(c.company_name)) = LOWER(TRIM(anchor.company_name))
        )
      )
      INNER JOIN users u ON u.id = c.user_id
      LEFT JOIN customer_companies org ON org.id = c.company_id
      WHERE anchor.user_id = $1 AND c.user_id != $1 AND u.status != 3
      ORDER BY u.full_name
    `,
      [anchor],
    );
    console.log('CC peers (exclude anchor) for', anchor, ':', peers.rows);

    const allPeers = await c.query(
      `
      SELECT c.user_id AS id, u.full_name
      FROM customers anchor
      INNER JOIN customers c ON (
        (anchor.company_id IS NOT NULL AND c.company_id = anchor.company_id)
        OR (
          anchor.company_id IS NULL
          AND TRIM(COALESCE(anchor.company_name, '')) <> ''
          AND LOWER(TRIM(c.company_name)) = LOWER(TRIM(anchor.company_name))
        )
      )
      INNER JOIN users u ON u.id = c.user_id
      WHERE anchor.user_id = $1 AND c.user_id != 0 AND u.status != 3
      ORDER BY u.full_name
    `,
      [anchor],
    );
    console.log('CC peers (forStaff — all company) for', anchor, ':', allPeers.rows);
  }

  await c.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
