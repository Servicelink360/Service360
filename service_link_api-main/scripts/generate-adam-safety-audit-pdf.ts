/**
 * Generate PDF for Adam sample safety audit and set pdf_file.
 * Run from service_link_api-main:
 *   npx ts-node -r tsconfig-paths/register scripts/generate-adam-safety-audit-pdf.ts
 * Or: TASK_ID=123 npx ts-node -r tsconfig-paths/register scripts/generate-adam-safety-audit-pdf.ts
 */
import { Client } from 'pg';

async function main() {
  require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
  require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

  const { convertHtmlToPdf } = require('../src/helpers/util');

  const client = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: +(process.env.DATABASE_PORT || 5432),
    user: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || '123456',
    database: process.env.DATABASE_DB_NAME || 'service360',
  });
  await client.connect();

  let resolvedTaskId = Number(process.env.TASK_ID || process.argv[2] || 0);
  if (!resolvedTaskId) {
    const latest = await client.query(
      `SELECT id FROM user_tasks
       WHERE type = 'CUSTOM' AND report_template_id = 80 AND staff_id = 140
         AND task_name ILIKE 'Safety Audit - sample (Adam)%'
       ORDER BY id DESC LIMIT 1`,
    );
    if (!latest.rows.length) throw new Error('No Adam sample safety audit found. Pass TASK_ID.');
    resolvedTaskId = Number(latest.rows[0].id);
  }

  const taskRes = await client.query(`SELECT * FROM user_tasks WHERE id = $1`, [resolvedTaskId]);
  const task = taskRes.rows[0];
  if (!task) throw new Error(`user_tasks ${resolvedTaskId} not found`);

  const itemsRes = await client.query(
    `SELECT name, type, value, "order" FROM user_task_reports WHERE user_task_id = $1 ORDER BY "order"`,
    [resolvedTaskId],
  );
  const tpl = await client.query(
    `SELECT id, name, category FROM report_templates WHERE id = $1`,
    [task.report_template_id],
  );
  const tplItems = await client.query(
    `SELECT name, type, config, "order" FROM report_template_items
     WHERE report_template_id = $1 ORDER BY "order"`,
    [task.report_template_id],
  );

  const reports = itemsRes.rows.map((r) => {
    const match = tplItems.rows.find((t) => t.name === r.name);
    return {
      name: r.name,
      type: r.type,
      value: r.value,
      order: r.order,
      config: match?.config || undefined,
    };
  });

  const staff = await client.query(`SELECT full_name FROM users WHERE id = $1`, [task.staff_id]);

  const row: any = {
    id: task.id,
    taskName: task.task_name,
    siteName: task.site_name,
    siteAddress: task.site_address,
    siteLocation: task.site_location,
    serviceName: task.service_name,
    customerName: task.customer_name,
    companyName: task.company_name,
    staffId: task.staff_id,
    checkIn: task.check_in,
    checkOut: task.check_out,
    createdAt: task.created_at,
    staff: { fullName: staff.rows[0]?.full_name || 'Adam Kay' },
    reportTemplate: {
      name: tpl.rows[0]?.name || 'Monthly Safety Audit & Inspection Checklist',
      category: tpl.rows[0]?.category || 'SAFETY_AUDIT',
      items: tplItems.rows.map((t) => ({
        name: t.name,
        type: t.type,
        config: t.config,
        order: t.order,
      })),
    },
    reports,
  };

  console.log('Generating PDF for task', resolvedTaskId, 'fields', reports.length);
  const pdfUrl = await convertHtmlToPdf(row, reports, resolvedTaskId);
  console.log('PDF URL', pdfUrl);

  await client.query(`UPDATE user_tasks SET pdf_file = $1, updated_at = NOW() WHERE id = $2`, [
    pdfUrl,
    resolvedTaskId,
  ]);
  console.log('Updated user_tasks.pdf_file');
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
