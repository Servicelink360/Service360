/**
 * Seed a completed sample Monthly Safety Audit submitted by Adam Kay.
 * Use ASCII-only punctuation.
 * Run: node scripts/seed-sample-safety-audit-adam.js
 */
const { Client } = require('pg');

const ADAM_ID = 140;
const TEMPLATE_ID = 80;

async function main() {
  const client = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: +(process.env.DATABASE_PORT || 5432),
    user: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || '123456',
    database: process.env.DATABASE_DB_NAME || 'service360',
  });
  await client.connect();

  const adam = await client.query(`SELECT id, full_name FROM users WHERE id = $1`, [ADAM_ID]);
  if (!adam.rows.length) throw new Error('Adam (user 140) not found');
  const adamName = adam.rows[0].full_name || 'Adam Kay';

  const tpl = await client.query(
    `SELECT id, name, category FROM report_templates WHERE id = $1`,
    [TEMPLATE_ID],
  );
  if (!tpl.rows.length) throw new Error(`Safety audit template ${TEMPLATE_ID} not found`);

  const forceNew = String(process.env.FORCE || '1') !== '0';
  const existing = await client.query(
    `SELECT id FROM user_tasks
     WHERE type = 'CUSTOM'
       AND report_template_id = $1
       AND staff_id = $2
       AND status = 1
       AND task_name ILIKE 'Safety Audit - sample (Adam)%'
     ORDER BY id DESC
     LIMIT 1`,
    [TEMPLATE_ID, ADAM_ID],
  );
  if (existing.rows.length && !forceNew) {
    console.log('Sample already exists id=', existing.rows[0].id);
    await client.end();
    return;
  }

  const now = new Date();
  const reportDate = '2026-09-12';
  const stamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const taskName = `Safety Audit - sample (Adam) - ${stamp}`;
  const SAMPLE_IMAGE =
    'https://service360basket.s3.ap-southeast-2.amazonaws.com/admin-uploads/2026-09-10/1789003792770-hero-1783906000684.webp';

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

  // Realistic mix: mostly YES, a few NO so PDF badge/section counts look like a real audit.
  const byName = new Map([
    ['date of inspection', reportDate],
    ['area/site inspected', site.siteName],
    ['site address', site.siteAddress],
    ['customer', site.customerName],
    ['inspected by', adamName],

    [
      'risk assessments undertaken for all plant, equipment, chemicals & processes on site',
      'YES',
    ],
    ['hazard register has been used in the past month', 'YES'],
    [
      'hazard register notes (regular use / reviews)',
      'Hazard register reviewed weekly during toolbox talks. Two entries closed this month (wet floor near entry; damaged trolley latch).',
    ],
    ['new risk assessments for hazards, accidents or new processes', 'YES'],
    [
      'risk assessment update notes',
      'Updated risk assessment for chemical spray bottle storage after new SDS pack received 3 Sep 2026.',
    ],

    [
      'evidence of communication of safety issues (ohs minutes, hazard notifications) on site',
      'YES',
    ],
    [
      'toolbox talks / safety communication notes',
      'TBTs held each Monday: wet floors, PPE, sharps handling. Attendance sheet kept in site folder.',
    ],
    ['monthly site meetings undertaken (consultation & communication)', 'YES'],
    ['fire training held within the past 12 months (or suitable period)', 'YES'],
    ['fire doors clear of rubbish and stored goods', 'YES'],

    ['availability of personal protective equipment', 'YES'],
    ['employees trained & competent in using ppe', 'YES'],
    ['competency record available', 'YES'],
    ['employees observed using ppe', 'YES'],

    ['no broken plugs, sockets or switches', 'YES'],
    ['no frayed or damaged leads', 'NO'],
    [
      'portable electrical equipment in good condition and tagged (current)',
      'YES',
    ],
    ['current testing and tagging', 'YES'],

    [
      'sds for all chemicals / register of chemicals (no sds over 5 years old)',
      'YES',
    ],
    ['sds updated on an ongoing basis', 'YES'],
    ['spray bottles clearly labelled', 'YES'],
    ['spray bottles locked in trolley cabinet when not in use', 'YES'],
    ['no out of date or unused chemicals still stored on site', 'YES'],
    ['employees competent to use chemicals and ppe', 'YES'],

    [
      'first aid cabinets and contents clean and orderly; contents replenished',
      'YES',
    ],
    ['employees aware of location of first aid cabinet', 'YES'],
    ['first aid cabinet clearly labelled', 'YES'],
    ['emergency numbers and names displayed for easy viewing', 'NO'],

    ['no obstacles in walkways where avoidable', 'YES'],

    ['plant & equipment adequately maintained', 'YES'],
    ['storage of equipment in convenient access', 'YES'],
    ['sufficient labelling / instructions / tagging for out of order', 'YES'],
    ['battery charging areas safe and well ventilated', 'YES'],

    ['waste equipment fit for purpose', 'YES'],
    ['bins emptied regularly to prevent over filling', 'YES'],
    [
      'syringes/needles/broken glass contained appropriately; ppe & swi known',
      'YES',
    ],

    [
      'protective clothing and sun screen available according to need',
      'YES',
    ],
    ['reflector vests worn outdoors in traffic areas', 'YES'],

    [
      'identify action required (who / when)',
      '1) Replace frayed vacuum lead (tag out until replaced) - Adam Kay - due 19 Sep 2026.\n2) Post emergency contact sheet beside first aid cabinet - Supervisor - due 15 Sep 2026.',
    ],
    [
      'urgent actions required',
      'Frayed lead on vacuum cleaner in amenities store - remove from service immediately until replaced and re-tagged.',
    ],
    ['inspection photos', JSON.stringify([SAMPLE_IMAGE])],
    ['inspector signature', adamName],
    ['sign-off date', reportDate],
  ]);

  const tplFields = await client.query(
    `SELECT name, type, "order" FROM report_template_items
     WHERE report_template_id = $1 ORDER BY "order"`,
    [TEMPLATE_ID],
  );

  const itemsToInsert = tplFields.rows.map((tf) => {
    const key = String(tf.name).trim().toLowerCase();
    let value = byName.get(key);
    if (value === undefined) {
      // Fuzzy match for encoding-glitched action field name
      for (const [k, v] of byName.entries()) {
        if (key.startsWith(k) || k.startsWith(key.slice(0, 40))) {
          value = v;
          break;
        }
      }
    }
    if (value === undefined) value = '';
    return {
      name: tf.name,
      type: tf.type,
      order: tf.order,
      value,
    };
  });

  const photo = itemsToInsert.find(
    (it) =>
      /photo|image/i.test(it.name) && String(it.type).toUpperCase().includes('IMAGE'),
  );
  if (photo && (!photo.value || photo.value === '[]' || photo.value === '')) {
    photo.value = JSON.stringify([SAMPLE_IMAGE]);
  }

  await client.query('BEGIN');
  try {
    const maxTask = await client.query(
      `SELECT COALESCE(MAX(id), 0)::bigint AS max FROM user_tasks`,
    );
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
      'Created sample Safety Audit id=',
      taskId,
      'by',
      adamName,
      'fields=',
      itemsToInsert.length,
      'template=',
      tpl.rows[0].name,
    );
    console.log('TASK_ID=' + taskId);
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
