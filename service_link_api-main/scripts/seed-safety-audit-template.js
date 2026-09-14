/**
 * One-off seed: create Monthly Safety Audit template if missing.
 * Run: node scripts/seed-safety-audit-template.js
 * For live: copy into API container and run (uses container DATABASE_* env).
 */
const { Client } = require('pg');

const DESCRIPTION =
  'SACL monthly site safety audit - risk management, PPE, electrical, chemicals, first aid, walkways, plant, waste, outdoor work. Admin-managed template (Safety Audit category).';

const items = [
  { name: 'Date of Inspection', type: 'DATE', required: true, order: 1 },
  { name: 'Area/site Inspected', type: '[SITE_NAME]', required: true, order: 2 },
  { name: 'Site address', type: '[SITE_ADDRESS]', required: false, order: 3 },
  { name: 'Customer', type: '[CUSTOMER_NAME]', required: false, order: 4 },
  { name: 'Inspected by', type: '[REPORT_BY]', required: true, order: 5 },

  {
    name: 'Risk assessments undertaken for all plant, equipment, chemicals & processes on site',
    type: 'YES_NO',
    required: true,
    order: 10,
    section: 'Risk Management',
  },
  {
    name: 'Hazard Register has been used in the past month',
    type: 'YES_NO',
    required: true,
    order: 11,
    section: 'Risk Management',
  },
  {
    name: 'Hazard register notes (regular use / reviews)',
    type: 'TEXTAREA',
    required: false,
    order: 12,
    section: 'Risk Management',
    placeholder:
      'e.g. hazard register is used on regular basis; risk reviews being progressively undertaken',
  },
  {
    name: 'New risk assessments for hazards, accidents or new processes',
    type: 'YES_NO',
    required: true,
    order: 13,
    section: 'Risk Management',
  },
  {
    name: 'Risk assessment update notes',
    type: 'TEXTAREA',
    required: false,
    order: 14,
    section: 'Risk Management',
    placeholder: 'State what has been done over the past month',
  },

  {
    name: 'Evidence of communication of safety issues (OHS minutes, hazard notifications) on site',
    type: 'YES_NO',
    required: true,
    order: 20,
    section: 'Communication & Consultation',
  },
  {
    name: 'Toolbox talks / safety communication notes',
    type: 'TEXTAREA',
    required: false,
    order: 21,
    section: 'Communication & Consultation',
    placeholder: 'e.g. TBT held weekly; monthly site meetings resumed',
  },
  {
    name: 'Monthly site meetings undertaken (consultation & communication)',
    type: 'YES_NO',
    required: true,
    order: 22,
    section: 'Communication & Consultation',
  },
  {
    name: 'Fire training held within the past 12 months (or suitable period)',
    type: 'YES_NO',
    required: true,
    order: 23,
    section: 'Communication & Consultation',
  },
  {
    name: 'Fire doors clear of rubbish and stored goods',
    type: 'YES_NO',
    required: true,
    order: 24,
    section: 'Communication & Consultation',
  },

  {
    name: 'Availability of personal protective equipment',
    type: 'YES_NO',
    required: true,
    order: 30,
    section: 'Safety Equipment',
  },
  {
    name: 'Employees trained & competent in using PPE',
    type: 'YES_NO',
    required: true,
    order: 31,
    section: 'Safety Equipment',
  },
  {
    name: 'Competency record available',
    type: 'YES_NO',
    required: true,
    order: 32,
    section: 'Safety Equipment',
  },
  {
    name: 'Employees observed using PPE',
    type: 'YES_NO',
    required: true,
    order: 33,
    section: 'Safety Equipment',
  },

  {
    name: 'No broken plugs, sockets or switches',
    type: 'YES_NO',
    required: true,
    order: 40,
    section: 'Electrical',
  },
  {
    name: 'No frayed or damaged leads',
    type: 'YES_NO',
    required: true,
    order: 41,
    section: 'Electrical',
  },
  {
    name: 'Portable electrical equipment in good condition and tagged (current)',
    type: 'YES_NO',
    required: true,
    order: 42,
    section: 'Electrical',
  },
  {
    name: 'Current testing and tagging',
    type: 'YES_NO',
    required: true,
    order: 43,
    section: 'Electrical',
  },

  {
    name: 'SDS for all chemicals / Register of Chemicals (no SDS over 5 years old)',
    type: 'YES_NO',
    required: true,
    order: 50,
    section: 'Chemicals on Site',
  },
  {
    name: 'SDS updated on an ongoing basis',
    type: 'YES_NO',
    required: true,
    order: 51,
    section: 'Chemicals on Site',
  },
  {
    name: 'Spray bottles clearly labelled',
    type: 'YES_NO',
    required: true,
    order: 52,
    section: 'Chemicals on Site',
  },
  {
    name: 'Spray bottles locked in trolley cabinet when not in use',
    type: 'YES_NO',
    required: true,
    order: 53,
    section: 'Chemicals on Site',
  },
  {
    name: 'No out of date or unused chemicals still stored on site',
    type: 'YES_NO',
    required: true,
    order: 54,
    section: 'Chemicals on Site',
  },
  {
    name: 'Employees competent to use chemicals and PPE',
    type: 'YES_NO',
    required: true,
    order: 55,
    section: 'Chemicals on Site',
  },

  {
    name: 'First aid cabinets and contents clean and orderly; contents replenished',
    type: 'YES_NO',
    required: true,
    order: 60,
    section: 'First Aid',
  },
  {
    name: 'Employees aware of location of first aid cabinet',
    type: 'YES_NO',
    required: true,
    order: 61,
    section: 'First Aid',
  },
  {
    name: 'First aid cabinet clearly labelled',
    type: 'YES_NO',
    required: true,
    order: 62,
    section: 'First Aid',
  },
  {
    name: 'Emergency numbers and names displayed for easy viewing',
    type: 'YES_NO',
    required: true,
    order: 63,
    section: 'First Aid',
  },

  {
    name: 'No obstacles in walkways where avoidable',
    type: 'YES_NO',
    required: true,
    order: 70,
    section: 'Public Walkways',
  },

  {
    name: 'Plant & equipment adequately maintained',
    type: 'YES_NO',
    required: true,
    order: 80,
    section: 'Plant & Equipment (Machines)',
  },
  {
    name: 'Storage of equipment in convenient access',
    type: 'YES_NO',
    required: true,
    order: 81,
    section: 'Plant & Equipment (Machines)',
  },
  {
    name: 'Sufficient labelling / instructions / tagging for out of order',
    type: 'YES_NO',
    required: true,
    order: 82,
    section: 'Plant & Equipment (Machines)',
  },
  {
    name: 'Battery charging areas safe and well ventilated',
    type: 'YES_NO',
    required: true,
    order: 83,
    section: 'Plant & Equipment (Machines)',
  },

  {
    name: 'Waste equipment fit for purpose',
    type: 'YES_NO',
    required: true,
    order: 90,
    section: 'Waste/Rubbish Disposal/Compactor',
  },
  {
    name: 'Bins emptied regularly to prevent over filling',
    type: 'YES_NO',
    required: true,
    order: 91,
    section: 'Waste/Rubbish Disposal/Compactor',
  },
  {
    name: 'Syringes/needles/broken glass contained appropriately; PPE & SWI known',
    type: 'YES_NO',
    required: true,
    order: 92,
    section: 'Waste/Rubbish Disposal/Compactor',
  },

  {
    name: 'Protective clothing and sun screen available according to need',
    type: 'YES_NO',
    required: true,
    order: 100,
    section: 'Outdoor Work',
  },
  {
    name: 'Reflector vests worn outdoors in traffic areas',
    type: 'YES_NO',
    required: true,
    order: 101,
    section: 'Outdoor Work',
  },

  {
    name: 'Identify action required (Who / When) - including need for risk assessment',
    type: 'TEXTAREA',
    required: false,
    order: 110,
    section: 'Actions',
    placeholder: 'Identify action required. Who/When?',
  },
  {
    name: 'URGENT ACTIONS REQUIRED',
    type: 'TEXTAREA',
    required: false,
    order: 111,
    section: 'Actions',
    placeholder: 'These items must be followed up and signed off as completed.',
  },
  {
    name: 'Inspection photos',
    type: 'IMAGES',
    required: false,
    order: 112,
    section: 'Actions',
  },
  {
    name: 'Inspector signature',
    type: 'SIGNATURE',
    required: true,
    order: 113,
    section: 'Sign-off',
  },
  {
    name: 'Sign-off date',
    type: 'DATE',
    required: true,
    order: 114,
    section: 'Sign-off',
  },
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
     WHERE (
       UPPER(TRIM(COALESCE(category, ''))) = 'SAFETY_AUDIT'
       OR LOWER(TRIM(name)) = LOWER('Monthly Safety Audit & Inspection Checklist')
     )
     LIMIT 1`,
  );
  if (existing.rows.length) {
    console.log('Safety Audit template already exists id=', existing.rows[0].id);
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
        ($1, $2, 'SAFETY_AUDIT', 0, '', 1, NULL, 0, NOW(), NOW(), $3, $3)
       RETURNING id`,
      [
        'Monthly Safety Audit & Inspection Checklist',
        DESCRIPTION,
        userId,
      ],
    );
    const templateId = tpl.rows[0].id;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const config = {
        label: item.name,
        ...(item.section ? { section: item.section } : {}),
        ...(item.placeholder ? { placeholder: item.placeholder } : {}),
      };
      await client.query(
        `INSERT INTO report_template_items
          (name, type, value, required, config, report_template_id, "order", created_at)
         VALUES ($1, $2, '', $3, $4::jsonb, $5, $6, NOW())`,
        [item.name, item.type, !!item.required, JSON.stringify(config), templateId, item.order ?? i + 1],
      );
    }

    try {
      await client.query(
        `INSERT INTO report_template_categories (name)
         SELECT 'SAFETY_AUDIT'
         WHERE NOT EXISTS (
           SELECT 1 FROM report_template_categories WHERE UPPER(TRIM(name)) = 'SAFETY_AUDIT'
         )`,
      );
    } catch (_) {
      /* optional table */
    }

    await client.query('COMMIT');
    console.log('Created Safety Audit template id=', templateId, 'fields=', items.length);
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
