import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserTaskMediaRequired1738800000000 implements MigrationInterface {
  name = 'AddUserTaskMediaRequired1738800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'user_tasks'
            AND column_name = 'media_required'
        ) THEN
          ALTER TABLE public.user_tasks
            ADD COLUMN media_required integer NOT NULL DEFAULT 2;
        END IF;
      END$$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.user_tasks DROP COLUMN IF EXISTS media_required;
    `);
  }
}
