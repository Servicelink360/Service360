/**
 * Regenerate report PDFs.
 *
 * Usage:
 *   node scripts/regenerate-report-pdfs.js [--dry-run] [--id=155] [--custom-only] [--missing-site]
 *
 * --missing-site  Only tasks whose PDF is missing Site Name and/or Site Address
 *                 (no non-empty site field rows in user_task_reports).
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env.prod') });
const { Client } = require('pg');
const path = require('path');

async function loadConvertHtmlToPdf() {
  const distUtil = path.join(__dirname, '../dist/src/helpers/util.js');
  try {
    return require(distUtil).convertHtmlToPdf;
  } catch {
    console.error('Build API first: npm run build');
    process.exit(1);
  }
}

function parseArgs() {
  const dryRun = process.argv.includes('--dry-run');
  const customOnly = process.argv.includes('--custom-only');
  const missingSite = process.argv.includes('--missing-site');
  const idArg = process.argv.find((a) => a.startsWith('--id='));
  const id = idArg ? Number(idArg.split('=')[1]) : null;
  return { dryRun, id, customOnly, missingSite };
}

async function backfillTaskSiteFromMaster(client, taskId) {
  await client.query(
    `
    UPDATE public.user_tasks ut
    SET
      site_name = COALESCE(NULLIF(TRIM(ut.site_name), ''), s.name),
      site_address = COALESCE(NULLIF(TRIM(ut.site_address), ''), s.address_name)
    FROM public.sites s
    WHERE ut.id = $1
      AND ut.site_id = s.id
      AND ut.site_id IS NOT NULL
      AND ut.site_id > 0
      AND (
        NULLIF(TRIM(ut.site_name), '') IS NULL
        OR NULLIF(TRIM(ut.site_address), '') IS NULL
      )
    `,
    [taskId],
  );
}

async function fetchTaskBundle(client, taskId) {
  await backfillTaskSiteFromMaster(client, taskId);

  const taskRes = await client.query(
    `SELECT ut.*,
            row_to_json(rt.*) AS report_template,
            row_to_json(st.*) AS staff,
            row_to_json(cu.*) AS created_user,
            s.name AS site_master_name,
            s.address_name AS site_master_address
     FROM user_tasks ut
     LEFT JOIN report_templates rt ON rt.id = ut.report_template_id
     LEFT JOIN users st ON st.id = ut.staff_id
     LEFT JOIN users cu ON cu.id = ut.created_by
     LEFT JOIN sites s ON s.id = ut.site_id
     WHERE ut.id = $1`,
    [taskId],
  );
  if (!taskRes.rows.length) return null;

  const templateItemsRes = await client.query(
    `SELECT id, name, type, value, "order", config
     FROM report_template_items
     WHERE report_template_id = $1
     ORDER BY "order" ASC, id ASC`,
    [taskRes.rows[0].report_template_id],
  );

  const reportsRes = await client.query(
    `SELECT id, name, type, value, "order", created_at AS "createdAt"
     FROM user_task_reports
     WHERE user_task_id = $1
     ORDER BY "order" ASC, id ASC`,
    [taskId],
  );

  const rowNumRes = await client.query(
    `SELECT row_num FROM (
       SELECT id, ROW_NUMBER() OVER (PARTITION BY 'id') AS row_num FROM user_tasks
     ) t WHERE t.id = $1`,
    [taskId],
  );

  const row = taskRes.rows[0];
  row.checkIn = row.check_in;
  row.createdAt = row.created_at;
  row.siteName = row.site_name || row.site_master_name || '';
  row.siteAddress = row.site_address || row.site_master_address || '';
  row.siteId = row.site_id;
  row.reportTemplate = row.report_template
    ? { ...row.report_template, items: templateItemsRes.rows }
    : null;
  row.staff = row.staff ? { fullName: row.staff.full_name, username: row.staff.username } : null;
  row.createdUser = row.created_user
    ? {
        fullName: row.created_user.full_name,
        username: row.created_user.username,
        type: row.created_user.type,
      }
    : null;

  return {
    row,
    reports: reportsRes.rows,
    rowNum: rowNumRes.rows[0]?.row_num ?? 1,
  };
}

async function main() {
  const { dryRun, id, customOnly, missingSite } = parseArgs();

  // Capture prod DB settings before requiring PDF util — util pulls config/index.ts
  // which Object.assign's local .env over process.env (localhost).
  const dbConfig = {
    host: process.env.DATABASE_HOST,
    port: +process.env.DATABASE_PORT || 5432,
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DB_NAME,
    ssl:
      String(process.env.DATABASE_SSL || '').toLowerCase() === 'true'
        ? { rejectUnauthorized: false }
        : false,
  };

  const convertHtmlToPdf = await loadConvertHtmlToPdf();

  const client = new Client(dbConfig);
  await client.connect();

  let taskIds;
  if (id) {
    taskIds = [id];
  } else if (missingSite) {
    const typeFilter = customOnly ? `AND ut.type = 'CUSTOM'` : '';
    const q = await client.query(`
      SELECT ut.id
      FROM public.user_tasks ut
      WHERE ut.pdf_file IS NOT NULL
        AND TRIM(ut.pdf_file) <> ''
        ${typeFilter}
        AND (
          NOT EXISTS (
            SELECT 1
            FROM public.user_task_reports r
            WHERE r.user_task_id = ut.id
              AND (
                UPPER(COALESCE(r.type, '')) = '[SITE_NAME]'
                OR LOWER(TRIM(TRAILING ':' FROM COALESCE(r.name, ''))) = 'site name'
              )
              AND NULLIF(TRIM(r.value), '') IS NOT NULL
          )
          OR NOT EXISTS (
            SELECT 1
            FROM public.user_task_reports r
            WHERE r.user_task_id = ut.id
              AND (
                UPPER(COALESCE(r.type, '')) = '[SITE_ADDRESS]'
                OR LOWER(TRIM(TRAILING ':' FROM COALESCE(r.name, ''))) = 'site address'
              )
              AND NULLIF(TRIM(r.value), '') IS NOT NULL
          )
        )
        -- Only regenerate when we can populate site from task or sites master
        AND (
          NULLIF(TRIM(ut.site_name), '') IS NOT NULL
          OR NULLIF(TRIM(ut.site_address), '') IS NOT NULL
          OR (
            ut.site_id IS NOT NULL
            AND ut.site_id > 0
            AND EXISTS (SELECT 1 FROM public.sites s WHERE s.id = ut.site_id)
          )
        )
      ORDER BY ut.id ASC
    `);
    taskIds = q.rows.map((r) => r.id);
  } else {
    const typeFilter = customOnly ? `AND type = 'CUSTOM'` : '';
    const q = await client.query(`
      SELECT id from user_tasks
      WHERE pdf_file IS NOT NULL AND pdf_file <> ''
      ${typeFilter}
      ORDER BY id ASC
    `);
    taskIds = q.rows.map((r) => r.id);
  }

  console.log(
    `Tasks to regenerate: ${taskIds.length}${dryRun ? ' (dry-run)' : ''}${
      missingSite ? ' [missing-site only]' : ''
    }`,
  );

  let ok = 0;
  let fail = 0;
  let skipped = 0;
  for (const taskId of taskIds) {
    const bundle = await fetchTaskBundle(client, taskId);
    if (!bundle) {
      console.warn(`skip ${taskId}: not found`);
      skipped++;
      continue;
    }

    const siteName = String(bundle.row.siteName || '').trim();
    const siteAddress = String(bundle.row.siteAddress || '').trim();
    if (missingSite && !siteName && !siteAddress) {
      console.log(`#${taskId} skip: no site name/address available`);
      skipped++;
      continue;
    }

    const oldUrl = bundle.row.pdf_file;
    process.stdout.write(
      `#${taskId} site="${siteName || '—'}" addr="${(siteAddress || '—').slice(0, 40)}" reports=${bundle.reports.length} ... `,
    );
    if (dryRun) {
      console.log(`would regen (current: ${oldUrl})`);
      continue;
    }
    try {
      const pdfUrl = await convertHtmlToPdf(bundle.row, bundle.reports, bundle.rowNum);
      await client.query('UPDATE user_tasks SET pdf_file = $1, updated_at = NOW() WHERE id = $2', [
        pdfUrl,
        taskId,
      ]);
      console.log(`OK -> ${pdfUrl}`);
      ok++;
    } catch (e) {
      console.log(`FAIL: ${e?.message || e}`);
      fail++;
    }
  }

  console.log(`Done. ok=${ok} fail=${fail} skipped=${skipped}`);
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
