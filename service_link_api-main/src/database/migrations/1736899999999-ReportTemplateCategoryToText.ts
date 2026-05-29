import { MigrationInterface, QueryRunner } from "typeorm";

const CATEGORY_ENUM_NAME = 'report_templates_category_enum';
const LEGACY_VALUES = [
  'CLEANING',
  'MAINTENANCE',
  'SECURITY',
  'LANDSCAPING',
  'WASTE_MANAGEMENT',
  'PUBLIC_AMENITIES',
  'INSPECTIONS',
  'INCIDENT',
  'GENERAL',
];

export class ReportTemplateCategoryToText1736899999999 implements MigrationInterface {
  name = 'ReportTemplateCategoryToText1736899999999'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'report_templates' AND column_name = 'category'
        ) THEN
          ALTER TABLE "report_templates" ALTER COLUMN "category" DROP DEFAULT;
          ALTER TABLE "report_templates" ALTER COLUMN "category" TYPE VARCHAR(120) USING "category"::text;
          UPDATE "report_templates"
          SET "category" = 'GENERAL'
          WHERE "category" IS NULL OR TRIM("category"::text) = '';
          ALTER TABLE "report_templates" ALTER COLUMN "category" SET DEFAULT 'GENERAL';
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = '${CATEGORY_ENUM_NAME}') THEN
          DROP TYPE "${CATEGORY_ENUM_NAME}";
        END IF;
      END$$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${CATEGORY_ENUM_NAME}') THEN
          CREATE TYPE "${CATEGORY_ENUM_NAME}" AS ENUM (${LEGACY_VALUES.map((value) => `'${value}'`).join(', ')});
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'report_templates' AND column_name = 'category'
        ) THEN
          ALTER TABLE "report_templates" ALTER COLUMN "category" DROP DEFAULT;
          ALTER TABLE "report_templates" ALTER COLUMN "category" TYPE "${CATEGORY_ENUM_NAME}"
          USING (
            CASE
              WHEN "category"::text IN (${LEGACY_VALUES.map((value) => `'${value}'`).join(', ')}) THEN "category"::text
              ELSE 'GENERAL'
            END
          )::"${CATEGORY_ENUM_NAME}";
          ALTER TABLE "report_templates" ALTER COLUMN "category" SET DEFAULT 'GENERAL';
        END IF;
      END$$;
    `);
  }
}
