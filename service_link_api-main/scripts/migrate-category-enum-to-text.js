/**
 * One-time fix: report_templates.category enum -> VARCHAR(120)
 * Run: node scripts/migrate-category-enum-to-text.js
 */
const { Client } = require('pg');

async function main() {
  const c = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: +(process.env.DATABASE_PORT || 5432),
    user: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || '123456',
    database: process.env.DATABASE_DB_NAME || 'service360',
  });
  await c.connect();

  const before = await c.query(
    `SELECT udt_name FROM information_schema.columns
     WHERE table_name = 'report_templates' AND column_name = 'category'`,
  );
  console.log('Before:', before.rows[0]?.udt_name);

  await c.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'report_templates'
          AND column_name = 'category'
          AND udt_name = 'report_templates_category_enum'
      ) THEN
        ALTER TABLE "report_templates" ALTER COLUMN "category" DROP DEFAULT;
        ALTER TABLE "report_templates"
          ALTER COLUMN "category" TYPE VARCHAR(120) USING "category"::text;
        UPDATE "report_templates"
        SET "category" = 'GENERAL'
        WHERE "category" IS NULL OR TRIM("category") = '';
        ALTER TABLE "report_templates"
          ALTER COLUMN "category" SET DEFAULT 'GENERAL';
      END IF;
    END$$;
  `);

  await c.query(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_templates_category_enum') THEN
        DROP TYPE "report_templates_category_enum";
      END IF;
    END$$;
  `);

  const after = await c.query(
    `SELECT udt_name, data_type, character_maximum_length
     FROM information_schema.columns
     WHERE table_name = 'report_templates' AND column_name = 'category'`,
  );
  console.log('After:', after.rows[0]);

  await c.end();
  console.log('Done. Custom categories (e.g. "Roof and Gutter") can now be saved.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
