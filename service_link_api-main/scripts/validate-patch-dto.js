const { validate } = require('class-validator');
const { plainToInstance } = require('class-transformer');
const { Client } = require('pg');

async function main() {
  const { UpdateReportTemplateDto } = require('../dist/src/report-templates/dto/update-report-template.dto');
  const { CreateReportTemplateDto } = require('../dist/src/report-templates/dto/create-report-template.dto');

  const c = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '123456',
    database: 'service360',
  });
  await c.connect();
  const t = await c.query('SELECT * FROM report_templates WHERE id = 38');
  const rows = await c.query(
    'SELECT * FROM report_template_items WHERE report_template_id = 38 ORDER BY "order"',
  );
  await c.end();

  const items = rows.rows.map((row, index) => {
    const item = {
      id: row.id,
      name: row.name,
      type: row.type,
      value: row.value ?? '',
      order: row.order,
      required: row.required,
      label: row.config?.label,
      config: row.config,
    };
    return item;
  });

  const payloads = [
    {
      label: 'frontend-like',
      body: {
        name: t.rows[0].name,
        description: t.rows[0].description,
        category: 'Window Cleaning',
        fileUrl: '',
        items,
      },
    },
    {
      label: 'omit-fileUrl',
      body: {
        name: t.rows[0].name,
        description: t.rows[0].description,
        category: 'Window Cleaning',
        items: items.map(({ id, ...rest }) => rest),
      },
    },
    {
      label: 'empty-items',
      body: {
        name: t.rows[0].name,
        description: t.rows[0].description,
        category: 'Window Cleaning',
        fileUrl: '',
        items: [],
      },
    },
  ];

  for (const { label, body } of payloads) {
    const dto = plainToInstance(UpdateReportTemplateDto, body, {
      enableImplicitConversion: true,
    });
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: false });
    console.log(`\n${label}: ${errors.length} error(s)`);
    errors.slice(0, 5).forEach((e) => {
      console.log(' ', e.property, Object.values(e.constraints || {}).join('; '));
      if (e.children?.length) {
        e.children.slice(0, 2).forEach((ch) => {
          console.log('   child', ch.property, Object.values(ch.constraints || {}).join('; '));
        });
      }
    });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
