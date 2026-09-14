/**
 * One-off seed: create Incident Report template if missing.
 * Run: node scripts/seed-incident-report-template.js
 */
const { Client } = require('pg');
const path = require('path');

// Load template from admin source (CommonJS-friendly duplicate of fields)
const items = [
  { name: 'Report date', type: '[REPORT_DATE]', required: true, order: 1 },
  { name: 'Report time', type: '[REPORT_TIME]', required: true, order: 2 },
  { name: 'Site', type: '[SITE_NAME]', required: true, order: 3 },
  { name: 'Site address', type: '[SITE_ADDRESS]', required: false, order: 4 },
  { name: 'Reported by', type: '[REPORT_BY]', required: true, order: 5 },
  {
    name: 'Incident type',
    type: 'SELECT',
    required: true,
    order: 10,
    options: [
      'Injury / illness',
      'Near miss',
      'Property damage',
      'Environmental',
      'Security / theft',
      'Vehicle incident',
      'Public complaint',
      'Other',
    ],
    section: 'Incident details',
  },
  {
    name: 'Severity',
    type: 'SELECT',
    required: true,
    order: 11,
    options: ['Low', 'Medium', 'High', 'Critical'],
    section: 'Incident details',
  },
  { name: 'Date of incident', type: 'DATE', required: true, order: 12, section: 'Incident details' },
  { name: 'Time of incident', type: 'TIME', required: true, order: 13, section: 'Incident details' },
  {
    name: 'Exact location on site',
    type: 'TEXT',
    required: true,
    order: 14,
    section: 'Incident details',
    placeholder: 'e.g. Level 2 male amenities, loading dock, car park bay 12',
  },
  { name: 'GPS location (if captured)', type: 'GPS', required: false, order: 15, section: 'Incident details' },
  {
    name: 'What happened (description)',
    type: 'TEXTAREA',
    required: true,
    order: 16,
    section: 'Incident details',
    placeholder: 'Describe the sequence of events in order. Include what was being done at the time.',
  },
  {
    name: 'Weather / environmental conditions',
    type: 'TEXT',
    required: false,
    order: 17,
    section: 'Incident details',
    placeholder: 'e.g. wet floor, poor lighting, outdoor heat, wind',
  },
  { name: 'Was anyone injured or ill?', type: 'YES_NO', required: true, order: 20, section: 'People involved' },
  { name: 'Injured / affected person name', type: 'TEXT', required: false, order: 21, section: 'People involved' },
  {
    name: 'Injured / affected person role',
    type: 'SELECT',
    required: false,
    order: 22,
    options: ['Staff', 'Contractor', 'Customer / client', 'Member of public', 'Other'],
    section: 'People involved',
  },
  {
    name: 'Contact phone / email',
    type: 'TEXT',
    required: false,
    order: 23,
    section: 'People involved',
    placeholder: 'Phone or email for follow-up',
  },
  {
    name: 'Witnesses (names & contacts)',
    type: 'TEXTAREA',
    required: false,
    order: 24,
    section: 'People involved',
    placeholder: 'List witness names and how to contact them',
  },
  {
    name: 'Nature of injury / illness',
    type: 'SELECT',
    required: false,
    order: 30,
    options: [
      'Cut / laceration',
      'Bruise / contusion',
      'Sprain / strain',
      'Fracture',
      'Burn',
      'Eye injury',
      'Needlestick / sharps',
      'Chemical exposure',
      'Allergic reaction',
      'Illness (non-injury)',
      'Psychological',
      'Other / none',
    ],
    section: 'Injury & treatment',
  },
  {
    name: 'Body part(s) affected',
    type: 'TEXT',
    required: false,
    order: 31,
    section: 'Injury & treatment',
    placeholder: 'e.g. left hand, lower back, right eye',
  },
  { name: 'First aid given?', type: 'YES_NO', required: false, order: 32, section: 'Injury & treatment' },
  { name: 'First aider name', type: 'TEXT', required: false, order: 33, section: 'Injury & treatment' },
  {
    name: 'Treatment / first aid details',
    type: 'TEXTAREA',
    required: false,
    order: 34,
    section: 'Injury & treatment',
    placeholder: 'What treatment was provided on site?',
  },
  {
    name: 'Medical / hospital treatment required?',
    type: 'YES_NO',
    required: false,
    order: 35,
    section: 'Injury & treatment',
  },
  { name: 'Medical facility / doctor details', type: 'TEXT', required: false, order: 36, section: 'Injury & treatment' },
  {
    name: 'Worker ceased work / time lost?',
    type: 'YES_NO',
    required: false,
    order: 37,
    section: 'Injury & treatment',
  },
  { name: 'Property or equipment damaged?', type: 'YES_NO', required: true, order: 40, section: 'Damage' },
  {
    name: 'Damage description',
    type: 'TEXTAREA',
    required: false,
    order: 41,
    section: 'Damage',
    placeholder: 'Describe damaged assets, estimated impact',
  },
  { name: 'Environmental impact?', type: 'YES_NO', required: false, order: 42, section: 'Damage' },
  { name: 'Environmental impact details', type: 'TEXTAREA', required: false, order: 43, section: 'Damage' },
  {
    name: 'Immediate actions taken to make safe',
    type: 'TEXTAREA',
    required: true,
    order: 50,
    section: 'Immediate response',
    placeholder: 'e.g. area cordoned, spill cleaned, equipment isolated, first aid',
  },
  { name: 'Supervisor / manager notified?', type: 'YES_NO', required: true, order: 51, section: 'Immediate response' },
  {
    name: 'Who was notified and when',
    type: 'TEXTAREA',
    required: false,
    order: 52,
    section: 'Immediate response',
    placeholder: 'Name, role, date/time notified',
  },
  { name: 'Emergency services contacted?', type: 'YES_NO', required: false, order: 53, section: 'Immediate response' },
  {
    name: 'Regulator / insurer notification required?',
    type: 'YES_NO',
    required: false,
    order: 54,
    section: 'Immediate response',
  },
  {
    name: 'Notification reference numbers',
    type: 'TEXT',
    required: false,
    order: 55,
    section: 'Immediate response',
    placeholder: 'e.g. SafeWork ref, insurer claim number',
  },
  {
    name: 'Likely cause / contributing factors',
    type: 'TEXTAREA',
    required: true,
    order: 60,
    section: 'Causes & follow-up',
    placeholder: 'Human factors, equipment, process, environment, PPE, training gaps, etc.',
  },
  {
    name: 'Was a risk assessment / SWMS in place?',
    type: 'YES_NO',
    required: false,
    order: 61,
    section: 'Causes & follow-up',
  },
  {
    name: 'Corrective / preventive actions required',
    type: 'TEXTAREA',
    required: true,
    order: 62,
    section: 'Causes & follow-up',
    placeholder: 'Actions, owner, and target date',
  },
  {
    name: 'Further investigation required?',
    type: 'YES_NO',
    required: true,
    order: 63,
    section: 'Causes & follow-up',
  },
  {
    name: 'Investigation / follow-up notes',
    type: 'TEXTAREA',
    required: false,
    order: 64,
    section: 'Causes & follow-up',
  },
  { name: 'Incident photos / evidence', type: 'IMAGES', required: false, order: 70, section: 'Evidence & sign-off' },
  { name: 'Video evidence (optional)', type: 'VIDEOS', required: false, order: 71, section: 'Evidence & sign-off' },
  { name: 'Additional comments', type: 'TEXTAREA', required: false, order: 72, section: 'Evidence & sign-off' },
  { name: 'Reporter signature', type: 'SIGNATURE', required: true, order: 73, section: 'Evidence & sign-off' },
  { name: 'Sign-off date', type: 'DATE', required: true, order: 74, section: 'Evidence & sign-off' },
];

async function main() {
  const ssl =
    String(process.env.DATABASE_SSL || '').toLowerCase() === 'true' ||
    String(process.env.DATABASE_HOST || '').includes('rds.amazonaws.com')
      ? { rejectUnauthorized: false }
      : undefined;

  const client = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: +(process.env.DATABASE_PORT || 5432),
    user: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || '123456',
    database: process.env.DATABASE_DB_NAME || 'service360',
    ssl,
  });
  await client.connect();

  const existing = await client.query(
    `SELECT id FROM report_templates
     WHERE LOWER(TRIM(name)) = 'incident report' AND UPPER(TRIM(category)) = 'INCIDENT'
     LIMIT 1`,
  );
  if (existing.rows.length) {
    console.log('Incident Report already exists id=', existing.rows[0].id);
    await client.end();
    return;
  }

  const admin = await client.query(
    `SELECT id FROM users WHERE type = 3 ORDER BY id ASC LIMIT 1`,
  );
  const userId = admin.rows[0]?.id || 1;

  await client.query('BEGIN');
  try {
    const tpl = await client.query(
      `INSERT INTO report_templates
        (name, description, category, "order", file_url, status, settings, assigned_staff_id, created_at, updated_at, created_by, updated_by)
       VALUES
        ($1, $2, 'INCIDENT', 0, '', 1, NULL, 0, NOW(), NOW(), $3, $3)
       RETURNING id`,
      [
        'Incident Report',
        'Site incident, injury, near-miss and property-damage report - details, people involved, treatment, causes, notifications and sign-off.',
        userId,
      ],
    );
    const templateId = tpl.rows[0].id;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const config = {
        label: item.name,
        section: item.section,
        ...(item.options ? { options: item.options } : {}),
        ...(item.placeholder ? { placeholder: item.placeholder } : {}),
      };
      await client.query(
        `INSERT INTO report_template_items
          (name, type, value, required, config, report_template_id, "order", created_at)
         VALUES ($1, $2, '', $3, $4::jsonb, $5, $6, NOW())`,
        [item.name, item.type, !!item.required, JSON.stringify(config), templateId, item.order ?? i + 1],
      );
    }

    // Ensure category row exists if table is used
    try {
      await client.query(
        `INSERT INTO report_template_categories (name)
         SELECT 'INCIDENT'
         WHERE NOT EXISTS (
           SELECT 1 FROM report_template_categories WHERE LOWER(name) = 'incident'
         )`,
      );
    } catch (_) {
      /* optional table */
    }

    await client.query('COMMIT');
    console.log('Created Incident Report template id=', templateId, 'fields=', items.length);
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
