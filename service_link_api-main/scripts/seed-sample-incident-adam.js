/**
 * Seed a completed sample Incident Report submitted by Adam Kay.
 * Use ASCII-only punctuation (avoid em dashes - they break as in some encodings).
 * Run: node scripts/seed-sample-incident-adam.js
 */
const { Client } = require('pg');

const ADAM_ID = 140;
const TEMPLATE_ID = 82;

async function main() {
  const client = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: +(process.env.DATABASE_PORT || 5432),
    user: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || '123456',
    database: process.env.DATABASE_DB_NAME || 'service360',
  });
  await client.connect();

  const adam = await client.query(
    `SELECT id, full_name FROM users WHERE id = $1`,
    [ADAM_ID],
  );
  if (!adam.rows.length) {
    throw new Error('Adam (user 140) not found');
  }
  const adamName = adam.rows[0].full_name || 'Adam Kay';

  const existing = await client.query(
    `SELECT id FROM user_tasks
     WHERE type = 'CUSTOM'
       AND report_template_id = $1
       AND staff_id = $2
       AND status = 1
       AND task_name ILIKE 'Incident Report - sample (Adam)%'
     ORDER BY id DESC
     LIMIT 1`,
    [TEMPLATE_ID, ADAM_ID],
  );
  // Always create a fresh sample when FORCE=1 (default), otherwise reuse latest.
  const forceNew = String(process.env.FORCE || '1') !== '0';
  if (existing.rows.length && !forceNew) {
    console.log('Sample already exists id=', existing.rows[0].id);
    await client.end();
    return;
  }

  const now = new Date();
  const reportDate = '2026-09-10';
  const reportTime = '09:15:00';
  const stamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const taskName = `Incident Report - sample (Adam) - ${stamp}`;
  const SAMPLE_IMAGE =
    'https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-09-10/1789003792770-hero-1783906000684.webp';
  const reportDateTime = `${reportDate} ${reportTime}`;

  const site = {
    siteId: 219,
    siteName: 'Ador Avenue Reserve',
    siteAddress: 'West Botany St, Rockdale NSW 2216',
    siteLocation: '-33.95388982603879, 151.1470370239184',
    customerId: 139,
    customerName: 'Jessica Bosevska',
    companyName: 'Bayside Council',
    serviceId: 4,
    serviceName: 'Public Amenities Cleaning',
  };

  const items = [
    { name: 'Report date & time', type: '[REPORT_DATETIME]', value: reportDateTime, order: 1 },
    { name: 'Report date', type: '[REPORT_DATE]', value: reportDate, order: 1 },
    { name: 'Report time', type: '[REPORT_TIME]', value: reportTime, order: 2 },
    { name: 'Site', type: '[SITE_NAME]', value: site.siteName, order: 3 },
    { name: 'Site address', type: '[SITE_ADDRESS]', value: site.siteAddress, order: 4 },
    { name: 'Reported by', type: '[REPORT_BY]', value: adamName, order: 6 },
    { name: 'Incident type', type: 'SELECT', value: 'Near miss', order: 10 },
    { name: 'Severity', type: 'SELECT', value: 'Medium', order: 11 },
    { name: 'Date & time of incident', type: 'DATETIME', value: reportDateTime, order: 12 },
    { name: 'Date of incident', type: 'DATE', value: reportDate, order: 12 },
    { name: 'Time of incident', type: 'TIME', value: reportTime, order: 13 },
    {
      name: 'Exact location on site',
      type: 'TEXT',
      value: 'Male amenities entry - wet floor near wash basins',
      order: 14,
    },
    {
      name: 'GPS location (if captured)',
      type: 'GPS',
      value: site.siteLocation,
      order: 15,
    },
    {
      name: 'What happened (description)',
      type: 'TEXTAREA',
      value:
        'During morning clean, a contractor almost slipped on a wet section of the tiled floor after mopping. No fall occurred. A caution cone was already in place but partially obscured by the open door.',
      order: 16,
    },
    {
      name: 'Weather / environmental conditions',
      type: 'TEXT',
      value: 'Indoor amenities; floor recently mopped; good lighting',
      order: 17,
    },
    { name: 'Was anyone injured or ill?', type: 'YES_NO', value: 'NO', order: 20 },
    { name: 'Injured / affected person name', type: 'TEXT', value: 'N/A - near miss only', order: 21 },
    { name: 'Injured / affected person role', type: 'SELECT', value: 'Contractor', order: 22 },
    { name: 'Contact phone / email', type: 'TEXT', value: '', order: 23 },
    {
      name: 'Witnesses (names & contacts)',
      type: 'TEXTAREA',
      value: `${adamName} (site cleaner) - present when the near miss occurred`,
      order: 24,
    },
    { name: 'Nature of injury / illness', type: 'SELECT', value: 'Other / none', order: 30 },
    { name: 'Body part(s) affected', type: 'TEXT', value: 'None', order: 31 },
    { name: 'First aid given?', type: 'YES_NO', value: 'NO', order: 32 },
    { name: 'First aider name', type: 'TEXT', value: '', order: 33 },
    { name: 'Treatment / first aid details', type: 'TEXTAREA', value: 'Not required', order: 34 },
    { name: 'Medical / hospital treatment required?', type: 'YES_NO', value: 'NO', order: 35 },
    { name: 'Medical facility / doctor details', type: 'TEXT', value: '', order: 36 },
    { name: 'Worker ceased work / time lost?', type: 'YES_NO', value: 'NO', order: 37 },
    { name: 'Property or equipment damaged?', type: 'YES_NO', value: 'NO', order: 40 },
    { name: 'Damage description', type: 'TEXTAREA', value: '', order: 41 },
    { name: 'Environmental impact?', type: 'YES_NO', value: 'NO', order: 42 },
    { name: 'Environmental impact details', type: 'TEXTAREA', value: '', order: 43 },
    {
      name: 'Immediate actions taken to make safe',
      type: 'TEXTAREA',
      value:
        'Repositioned wet-floor sign in doorway line of sight; wiped excess water at threshold; advised contractor of the hazard.',
      order: 50,
    },
    { name: 'Supervisor / manager notified?', type: 'YES_NO', value: 'YES', order: 51 },
    {
      name: 'Who was notified and when',
      type: 'TEXTAREA',
      value: 'Site supervisor notified by phone at approx. 09:20 on 10 Sep 2026',
      order: 52,
    },
    { name: 'Emergency services contacted?', type: 'YES_NO', value: 'NO', order: 53 },
    { name: 'Regulator / insurer notification required?', type: 'YES_NO', value: 'NO', order: 54 },
    { name: 'Notification reference numbers', type: 'TEXT', value: '', order: 55 },
    {
      name: 'Likely cause / contributing factors',
      type: 'TEXTAREA',
      value:
        'Wet floor after mopping; warning sign partially hidden by door swing; contractor entered quickly without checking floor condition.',
      order: 60,
    },
    { name: 'Was a risk assessment / SWMS in place?', type: 'YES_NO', value: 'YES', order: 61 },
    {
      name: 'Corrective / preventive actions required',
      type: 'TEXTAREA',
      value:
        '1) Place two wet-floor signs (entry + basin area). 2) Brief cleaners on door-swing sign placement. 3) Review mopping sequence for peak entry times. Owner: Adam Kay - due 17 Sep 2026.',
      order: 62,
    },
    { name: 'Further investigation required?', type: 'YES_NO', value: 'NO', order: 63 },
    {
      name: 'Investigation / follow-up notes',
      type: 'TEXTAREA',
      value: 'Toolbox talk on wet-floor controls scheduled for next site meeting.',
      order: 64,
    },
    {
      name: 'Incident photos / evidence',
      type: 'IMAGES',
      value: JSON.stringify([SAMPLE_IMAGE]),
      order: 70,
    },
    { name: 'Video evidence (optional)', type: 'VIDEOS', value: '', order: 71 },
    { name: 'Additional comments', type: 'TEXTAREA', value: '', order: 72 },
    { name: 'Reporter signature', type: 'SIGNATURE', value: adamName, order: 73 },
    { name: 'Sign-off date', type: 'DATE', value: reportDate, order: 74 },
  ];

  // Map seed values onto current template fields (supports old/new date-time shapes).
  const tplFields = await client.query(
    `SELECT name, type, "order" FROM report_template_items
     WHERE report_template_id = $1 ORDER BY "order"`,
    [TEMPLATE_ID],
  );
  const byName = new Map(
    items.map((it) => [String(it.name).trim().toLowerCase(), it]),
  );
  // Also allow matching renamed combined fields.
  byName.set('report date & time', byName.get('report date & time') || {
    name: 'Report date & time',
    type: '[REPORT_DATETIME]',
    value: reportDateTime,
    order: 1,
  });
  byName.set('date & time of incident', byName.get('date & time of incident') || {
    name: 'Date & time of incident',
    type: 'DATETIME',
    value: reportDateTime,
    order: 12,
  });

  const itemsToInsert = tplFields.rows.map((tf) => {
    const key = String(tf.name).trim().toLowerCase();
    const seed = byName.get(key);
    let value = seed?.value ?? '';
    // If template uses combined datetime but seed only has separate date/time, synthesize.
    if ((!value || value === '') && (String(tf.type).toUpperCase() === '[REPORT_DATETIME]' || String(tf.type).toUpperCase() === 'DATETIME')) {
      value = reportDateTime;
    }
    if ((!value || value === '') && String(tf.type).toUpperCase() === '[REPORT_DATE]') value = reportDate;
    if ((!value || value === '') && String(tf.type).toUpperCase() === '[REPORT_TIME]') value = reportTime;
    return {
      name: tf.name,
      type: tf.type,
      order: tf.order,
      value,
    };
  });
  // Ensure photo field has the sample image even if name differs slightly.
  const photo = itemsToInsert.find((it) => /photo|image|evidence/i.test(it.name) && String(it.type).toUpperCase().includes('IMAGE'));
  if (photo && (!photo.value || photo.value === '[]' || photo.value === '')) {
    photo.value = JSON.stringify([SAMPLE_IMAGE]);
  }
  await client.query('BEGIN');
  try {
    const maxTask = await client.query(`SELECT COALESCE(MAX(id), 0)::bigint AS max FROM user_tasks`);
    const taskId = Number(maxTask.rows[0].max) + 1;

    await client.query(
      `INSERT INTO user_tasks (
        id, created_at, updated_at, status, staff_id, task_shift_id, task_id, task_name,
        site_id, site_name, site_address, site_location,
        customer_id, customer_name, company_name,
        service_id, service_name,
        report_template_id, description, start_time, end_time,
        notifies_staff, type, created_by, updated_by,
        check_in, check_out, images, pdf_file, cleared_at
      ) VALUES (
        $1, $2, $2, 1, $3, 0, 0, $4,
        $5, $6, $7, $8,
        $9, $10, $11,
        $12, $13,
        $14, '', $2, $2,
        1, 'CUSTOM', $3, $3,
        $2, $2, NULL, NULL, NULL
      )`,
      [
        taskId,
        now,
        ADAM_ID,
        taskName,
        site.siteId,
        site.siteName,
        site.siteAddress,
        site.siteLocation,
        site.customerId,
        site.customerName,
        site.companyName,
        site.serviceId,
        site.serviceName,
        TEMPLATE_ID,
      ],
    );

    const maxRep = await client.query(
      `SELECT COALESCE(MAX(id), 0)::bigint AS max FROM user_task_reports`,
    );
    let nextRepId = Number(maxRep.rows[0].max) + 1;

    for (const item of itemsToInsert) {
      await client.query(
        `INSERT INTO user_task_reports (id, created_at, user_task_id, name, type, value, "order")
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [nextRepId++, now, taskId, item.name, item.type, item.value ?? '', item.order],
      );
    }

    await client.query('COMMIT');
    console.log(
      'Created sample Incident Report id=',
      taskId,
      'by',
      adamName,
      'fields=',
      itemsToInsert.length,
      'image=yes',
    );
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
