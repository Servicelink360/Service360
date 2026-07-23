import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { DataSource } from 'typeorm';

/**
 * Idempotent DDL for environments where schema drifted ahead of DATABASE_SYNC=false.
 * Fixes: column items.required does not exist (relation alias `items` = report_template_items).
 */
@Injectable()
export class PostgresSchemaPatchService implements OnModuleInit {
  private readonly logger = new Logger(PostgresSchemaPatchService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    const opts = this.dataSource.options;
    if (opts.type !== 'postgres') return;

    try {
      await this.dataSource.query(`
        ALTER TABLE "report_template_items"
        ADD COLUMN IF NOT EXISTS "required" boolean NOT NULL DEFAULT false;
      `);
    } catch (e) {
      this.logger.warn(
        `report_template_items.required patch: ${(e as Error).message}`,
      );
    }

    try {
      await this.dataSource.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1
            FROM information_schema.columns
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
      await this.dataSource.query(`
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_templates_category_enum') THEN
            DROP TYPE "report_templates_category_enum";
          END IF;
        END$$;
      `);
      this.logger.log('report_templates.category: enum converted to VARCHAR(120)');
    } catch (e) {
      this.logger.warn(
        `report_templates.category enum patch: ${(e as Error).message}`,
      );
    }

    try {
      await this.dataSource.query(`
        ALTER TABLE public.report_templates
        ADD COLUMN IF NOT EXISTS assigned_staff_id INT NULL;
      `);
      this.logger.log('report_templates.assigned_staff_id column ensured');
    } catch (e) {
      this.logger.warn(
        `report_templates.assigned_staff_id patch: ${(e as Error).message}`,
      );
    }

    try {
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS "report_template_categories" (
          "id" SERIAL PRIMARY KEY,
          "name" VARCHAR(120) NOT NULL UNIQUE,
          "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      this.logger.log('report_template_categories table ensured');
    } catch (e) {
      this.logger.warn(
        `report_template_categories patch: ${(e as Error).message}`,
      );
    }

    await this.ensureReportTemplateServicesTable();
    await this.ensureFaultIssuesTables();
    await this.ensureRoofGutterFaultIssues();
    await this.ensureGroundMaintenanceFaultIssues();
    await this.ensureReportFaultToiletAreaColumn();
    await this.ensureCustomerPersonnelAndFaultDelegation();
    await this.ensureAdminPersonnelAndStaffDelegation();
    await this.ensureInvoicesTable();
    await this.ensureAssetsTable();
    await this.applyRenameDepartmentsToServices();

    try {
      const rows = await this.dataSource.query(
        `SELECT pg_get_serial_sequence('public.user_tasks', 'id') AS seq`,
      );
      const seq = rows?.[0]?.seq ?? rows?.[0]?.SEQ;
      if (seq) {
        await this.dataSource.query(
          `SELECT setval($1::regclass, GREATEST((SELECT COALESCE(MAX(id), 0) FROM public.user_tasks), 1), true)`,
          [String(seq)],
        );
        this.logger.log(`user_tasks.id sequence synced: ${seq}`);
      } else {
        this.logger.warn(
          'user_tasks.id: no pg serial sequence (explicit id inserts must be used).',
        );
      }
    } catch (e) {
      this.logger.warn(`user_tasks id sequence sync skipped: ${(e as Error).message}`);
    }

    try {
      await this.dataSource.query(`
        ALTER TABLE public.user_tasks
        ADD COLUMN IF NOT EXISTS admin_opened_at TIMESTAMP NULL;
      `);
    } catch (e) {
      this.logger.warn(`user_tasks.admin_opened_at patch: ${(e as Error).message}`);
    }

    try {
      await this.dataSource.query(`
        ALTER TABLE public.report_faults
        ADD COLUMN IF NOT EXISTS admin_opened_at TIMESTAMP NULL;
      `);
    } catch (e) {
      this.logger.warn(`report_faults.admin_opened_at patch: ${(e as Error).message}`);
    }

    try {
      await this.dataSource.query(`
        ALTER TABLE public.user_tasks
        ADD COLUMN IF NOT EXISTS customer_opened_at TIMESTAMP NULL;
      `);
    } catch (e) {
      this.logger.warn(`user_tasks.customer_opened_at patch: ${(e as Error).message}`);
    }

    try {
      await this.dataSource.query(`
        ALTER TABLE public.report_faults
        ADD COLUMN IF NOT EXISTS customer_opened_at TIMESTAMP NULL;
      `);
    } catch (e) {
      this.logger.warn(`report_faults.customer_opened_at patch: ${(e as Error).message}`);
    }

    try {
      await this.dataSource.query(`
        ALTER TABLE public.report_faults
        ADD COLUMN IF NOT EXISTS issue VARCHAR(120) NULL;
      `);
    } catch (e) {
      this.logger.warn(`report_faults.issue patch: ${(e as Error).message}`);
    }

    try {
      await this.dataSource.query(`
        ALTER TABLE public.report_faults
        DROP COLUMN IF EXISTS notes;
      `);
    } catch (e) {
      this.logger.warn(`report_faults.drop notes patch: ${(e as Error).message}`);
    }

    try {
      await this.dataSource.query(`
        ALTER TABLE public.report_faults
        ALTER COLUMN site_id DROP NOT NULL;
      `);
    } catch (e) {
      this.logger.warn(`report_faults.site_id nullable patch: ${(e as Error).message}`);
    }

    try {
      await this.dataSource.query(`
        ALTER TABLE public.user_tasks
        ADD COLUMN IF NOT EXISTS staff_opened_at TIMESTAMP NULL;
      `);
    } catch (e) {
      this.logger.warn(`user_tasks.staff_opened_at patch: ${(e as Error).message}`);
    }

    try {
      await this.dataSource.query(`
        ALTER TABLE public.user_tasks
        ALTER COLUMN report_template_id DROP NOT NULL;
      `);
    } catch (e) {
      this.logger.warn(`user_tasks.report_template_id nullable patch: ${(e as Error).message}`);
    }

    await this.applyDashboardBadgeDismissedColumns();
    await this.applyDashboardUnreadBaseline();
    await this.applyCustomerDashboardUnreadBaseline();
    await this.applyReportFaultCustomerReplyToAdminPatch();
    await this.ensureCustomerAdminMessagesTables();
    await this.ensureUserTaskCustomerVisibilityTable();
    await this.ensureAdminDashboardBadgeVisibilityTables();
    await this.ensureReportFaultCustomerVisibilityTable();
    await this.ensureTicketVisibilityTables();
    await this.applyCustomerOpenedAtBackfillFromLegacy();
    await this.applyCustomerEmailNotificationPrefs();
    await this.applyCustomerFaultNotificationSubtypes();
    await this.applyAdminEmailNotificationPrefs();
    await this.applyAdminEmailNotifyTicketsColumn();
    await this.repairCustomerReadStateFromLegacy();
    await this.ensureDashboardUnreadIndexes();

    for (const table of ['report_template_items', 'report_faults', 'report_fault_answers']) {
      try {
        await this.ensureIdSequence(table);
      } catch (e) {
        this.logger.warn(`${table} id sequence patch: ${(e as Error).message}`);
      }
    }

    await this.applyServicesNumericId();
    await this.ensureCoreTablePrimaryKeys();
    await this.ensureBusinessUniqueConstraints();
  }

  /** services.id: VARCHAR codes → INTEGER serial; updates site_items and related FKs. */
  private async applyServicesNumericId(): Promise<void> {
    const patchName = 'services_numeric_id_v1';
    try {
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS public.schema_patches_applied (
          name VARCHAR(128) PRIMARY KEY,
          applied_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
      const done = await this.dataSource.query(
        `SELECT 1 FROM public.schema_patches_applied WHERE name = $1 LIMIT 1`,
        [patchName],
      );
      if (done?.length) {
        return;
      }

      const col = await this.dataSource.query(`
        SELECT data_type FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'id'
      `);
      const dt = String(col?.[0]?.data_type ?? '').toLowerCase();
      if (dt === 'integer' || dt === 'bigint' || dt === 'smallint') {
        await this.dataSource.query(
          `INSERT INTO public.schema_patches_applied (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
          [patchName],
        );
        return;
      }

      const candidates = [
        path.join(process.cwd(), 'database', 'migrations', '014_departments_numeric_id.sql'),
        path.join(__dirname, '..', '..', 'database', 'migrations', '014_departments_numeric_id.sql'),
      ];
      const sqlPath = candidates.find((p) => fs.existsSync(p));
      if (!sqlPath) {
        this.logger.warn('services numeric id: migration file not found');
        return;
      }
      const sql = fs.readFileSync(sqlPath, 'utf8');
      await this.dataSource.query(sql);
      await this.dataSource.query(
        `INSERT INTO public.schema_patches_applied (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
        [patchName],
      );
      this.logger.log('services.id migrated to INTEGER (patch applied)');
    } catch (e) {
      this.logger.warn(`services numeric id patch: ${(e as Error).message}`);
    }
  }

  /** pg_dump side tables (`user_tasks1`, …) steal `*_pkey` index names from real tables. */
  private async dropLegacyShadowTables(): Promise<void> {
    for (const table of ['user_tasks1', 'user_task_reports1', 'report_fault_answers1']) {
      try {
        await this.dataSource.query(`DROP TABLE IF EXISTS public."${table}" CASCADE`);
      } catch (e) {
        this.logger.warn(`Drop shadow table ${table}: ${(e as Error).message}`);
      }
    }
  }

  /** Legacy pg_dump restores omitted PRIMARY KEY on several tables — enforce idempotent PKs. */
  private async ensureCoreTablePrimaryKeys(): Promise<void> {
    await this.dropLegacyShadowTables();
    const specs: { table: string; constraint: string }[] = [
      { table: 'services', constraint: 'services_pkey' },
      { table: 'sites', constraint: 'sites_pkey' },
      { table: 'site_items', constraint: 'site_items_pkey' },
      { table: 'site_item_staffs', constraint: 'site_item_staffs_pkey' },
      { table: 'site_item_staff_shifts', constraint: 'site_item_staff_shifts_pkey' },
      { table: 'user_tasks', constraint: 'user_tasks_pkey' },
      { table: 'user_task_reports', constraint: 'user_task_reports_pkey' },
      { table: 'user_roles', constraint: 'user_roles_pkey' },
      { table: 'report_faults', constraint: 'report_faults_pkey' },
      { table: 'report_fault_answers', constraint: 'report_fault_answers_pkey' },
      { table: 'tasks', constraint: 'tasks_pkey' },
      { table: 'task_shifts', constraint: 'task_shifts_pkey' },
      { table: 'task_shift_logs', constraint: 'task_shift_logs_pkey' },
    ];
    for (const { table, constraint } of specs) {
      try {
        await this.dataSource.query(
          `
          DO $$
          BEGIN
            IF EXISTS (
              SELECT 1 FROM information_schema.tables
              WHERE table_schema = 'public' AND table_name = '${table}'
            ) AND NOT EXISTS (
              SELECT 1 FROM pg_constraint
              WHERE conrelid = 'public.${table}'::regclass AND contype = 'p'
            ) THEN
              ALTER TABLE public."${table}" ADD CONSTRAINT "${constraint}" PRIMARY KEY (id);
            END IF;
          END$$;
          `,
        );
        await this.ensureIdSequence(table);
      } catch (e) {
        this.logger.warn(`${table} primary key patch: ${(e as Error).message}`);
      }
    }
  }

  /** One row per natural key (job site line, staff assignment, report field, role). */
  private async ensureBusinessUniqueConstraints(): Promise<void> {
    const uniques: { table: string; name: string; columns: string[] }[] = [
      {
        table: 'site_items',
        name: 'uq_site_items_site_svc_customer',
        columns: ['site_id', 'service_id', 'customer_id'],
      },
      {
        table: 'site_item_staffs',
        name: 'uq_site_item_staffs_item_staff',
        columns: ['site_item_id', 'staff_id'],
      },
      { table: 'user_roles', name: 'uq_user_roles_user_role', columns: ['user_id', 'role_id'] },
      {
        table: 'user_task_reports',
        name: 'uq_user_task_reports_task_name',
        columns: ['user_task_id', 'name'],
      },
    ];
    for (const { table, name, columns } of uniques) {
      try {
        const colList = columns.map((c) => `"${c}"`).join(', ');
        await this.dataSource.query(
          `
          DO $$
          BEGIN
            IF EXISTS (
              SELECT 1 FROM information_schema.tables
              WHERE table_schema = 'public' AND table_name = '${table}'
            ) AND NOT EXISTS (
              SELECT 1 FROM pg_constraint
              WHERE conrelid = 'public.${table}'::regclass AND conname = '${name}'
            ) THEN
              ALTER TABLE public."${table}"
                ADD CONSTRAINT "${name}" UNIQUE (${colList});
            END IF;
          END$$;
          `,
        );
      } catch (e) {
        this.logger.warn(`${name}: ${(e as Error).message}`);
      }
    }
  }

  /** Dashboard badge vs list read/unread use separate timestamp columns. */
  private async applyDashboardBadgeDismissedColumns(): Promise<void> {
    const patchName = 'dashboard_badge_dismissed_columns_v1';
    try {
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS public.schema_patches_applied (
          name VARCHAR(128) PRIMARY KEY,
          applied_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
      const existing = await this.dataSource.query(
        `SELECT 1 FROM public.schema_patches_applied WHERE name = $1 LIMIT 1`,
        [patchName],
      );
      if (Array.isArray(existing) && existing.length > 0) {
        return;
      }

      for (const stmt of [
        `ALTER TABLE public.user_tasks ADD COLUMN IF NOT EXISTS admin_dashboard_dismissed_at TIMESTAMP NULL`,
        `ALTER TABLE public.user_tasks ADD COLUMN IF NOT EXISTS customer_dashboard_dismissed_at TIMESTAMP NULL`,
        `ALTER TABLE public.report_faults ADD COLUMN IF NOT EXISTS admin_dashboard_dismissed_at TIMESTAMP NULL`,
        `ALTER TABLE public.report_faults ADD COLUMN IF NOT EXISTS customer_dashboard_dismissed_at TIMESTAMP NULL`,
        `UPDATE public.user_tasks SET admin_dashboard_dismissed_at = COALESCE(admin_dashboard_dismissed_at, admin_opened_at, NOW()) WHERE admin_opened_at IS NOT NULL`,
        `UPDATE public.user_tasks SET customer_dashboard_dismissed_at = COALESCE(customer_dashboard_dismissed_at, customer_opened_at, NOW()) WHERE customer_opened_at IS NOT NULL`,
        `UPDATE public.report_faults SET admin_dashboard_dismissed_at = COALESCE(admin_dashboard_dismissed_at, admin_opened_at, NOW()) WHERE admin_opened_at IS NOT NULL`,
        `UPDATE public.report_faults SET customer_dashboard_dismissed_at = COALESCE(customer_dashboard_dismissed_at, customer_opened_at, NOW()) WHERE customer_opened_at IS NOT NULL`,
      ]) {
        await this.dataSource.query(stmt);
      }

      await this.dataSource.query(
        `INSERT INTO public.schema_patches_applied (name) VALUES ($1)`,
        [patchName],
      );
      this.logger.log('Dashboard badge dismissed columns applied.');
    } catch (e) {
      this.logger.warn(`Dashboard badge dismissed columns: ${(e as Error).message}`);
    }
  }

  /**
   * One-time: treat all existing staff reports/faults as already seen so dashboard badges start at 0.
   * Only rows created after this patch stay unopened until admin views them.
   */
  private async applyDashboardUnreadBaseline(): Promise<void> {
    const patchName = 'dashboard_unread_baseline_v1';
    try {
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS public.schema_patches_applied (
          name VARCHAR(128) PRIMARY KEY,
          applied_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
      const existing = await this.dataSource.query(
        `SELECT 1 FROM public.schema_patches_applied WHERE name = $1 LIMIT 1`,
        [patchName],
      );
      if (Array.isArray(existing) && existing.length > 0) {
        return;
      }

      await this.dataSource.query(`
        UPDATE public.user_tasks
        SET admin_opened_at = NOW()
        WHERE type = 'CUSTOM'
          AND staff_id > 0
          AND admin_opened_at IS NULL;
      `);
      await this.dataSource.query(`
        UPDATE public.report_faults
        SET admin_opened_at = NOW()
        WHERE staff_id > 0
          AND admin_opened_at IS NULL;
      `);
      await this.dataSource.query(
        `INSERT INTO public.schema_patches_applied (name) VALUES ($1)`,
        [patchName],
      );
      this.logger.log('Dashboard unread baseline applied (existing reports marked as opened).');
    } catch (e) {
      this.logger.warn(`Dashboard unread baseline: ${(e as Error).message}`);
    }
  }

  private async applyCustomerDashboardUnreadBaseline(): Promise<void> {
    const patchName = 'dashboard_customer_unread_baseline_v1';
    try {
      const existing = await this.dataSource.query(
        `SELECT 1 FROM public.schema_patches_applied WHERE name = $1 LIMIT 1`,
        [patchName],
      );
      if (Array.isArray(existing) && existing.length > 0) {
        return;
      }

      await this.dataSource.query(`
        UPDATE public.user_tasks
        SET customer_opened_at = NOW()
        WHERE type = 'CUSTOM'
          AND staff_id > 0
          AND customer_id > 0
          AND customer_opened_at IS NULL;
      `);
      await this.dataSource.query(`
        UPDATE public.report_faults
        SET customer_opened_at = NOW()
        WHERE staff_id > 0
          AND customer_id > 0
          AND customer_opened_at IS NULL;
      `);
      await this.dataSource.query(
        `INSERT INTO public.schema_patches_applied (name) VALUES ($1)`,
        [patchName],
      );
      this.logger.log('Customer dashboard unread baseline applied.');
    } catch (e) {
      this.logger.warn(`Customer dashboard unread baseline: ${(e as Error).message}`);
    }
  }

  /** In-progress faults where the customer replied last should wait for admin, not staff/customer again. */
  private async applyReportFaultCustomerReplyToAdminPatch(): Promise<void> {
    const patchName = 'report_fault_customer_reply_to_admin_v1';
    try {
      const existing = await this.dataSource.query(
        `SELECT 1 FROM public.schema_patches_applied WHERE name = $1 LIMIT 1`,
        [patchName],
      );
      if (Array.isArray(existing) && existing.length > 0) {
        return;
      }

      await this.dataSource.query(`
        UPDATE public.report_faults rf
        SET sender = 3,
            admin_opened_at = NULL
        WHERE rf.status = 3
          AND rf.sender = 1
          AND EXISTS (
            SELECT 1
            FROM public.report_fault_answers a
            WHERE a.report_fault_id = rf.id
              AND a.type = 1
              AND a.id = (
                SELECT MAX(a2.id)
                FROM public.report_fault_answers a2
                WHERE a2.report_fault_id = rf.id
              )
          );
      `);
      await this.dataSource.query(
        `INSERT INTO public.schema_patches_applied (name) VALUES ($1)`,
        [patchName],
      );
      this.logger.log('Report fault customer-reply routing patch applied.');
    } catch (e) {
      this.logger.warn(`Report fault customer-reply routing: ${(e as Error).message}`);
    }
  }

  private async ensureCustomerAdminMessagesTables(): Promise<void> {
    try {
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS public.customer_admin_threads (
          id SERIAL PRIMARY KEY,
          customer_id INT NOT NULL UNIQUE,
          customer_last_read_at TIMESTAMP NULL,
          admin_last_read_at TIMESTAMP NULL,
          last_message_preview TEXT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS public.customer_admin_messages (
          id SERIAL PRIMARY KEY,
          thread_id INT NOT NULL REFERENCES public.customer_admin_threads(id) ON DELETE CASCADE,
          sender_id INT NOT NULL,
          sender_type SMALLINT NOT NULL,
          body TEXT NOT NULL,
          report_fault_id INT NULL,
          report_reference TEXT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
      await this.dataSource.query(`
        ALTER TABLE public.customer_admin_messages
        ADD COLUMN IF NOT EXISTS user_task_id INT NULL;
      `);
      await this.dataSource.query(`
        ALTER TABLE public.customer_admin_messages
        ADD COLUMN IF NOT EXISTS attach_files TEXT NULL;
      `);
      await this.dataSource.query(`
        ALTER TABLE public.customer_admin_messages
        ADD COLUMN IF NOT EXISTS cc_customer_ids TEXT NULL;
      `);
      await this.dataSource.query(`
        ALTER TABLE public.customer_admin_threads
        ALTER COLUMN customer_id DROP NOT NULL;
      `);
      await this.dataSource.query(`
        ALTER TABLE public.customer_admin_threads
        ADD COLUMN IF NOT EXISTS staff_id INT NULL;
      `);
      await this.dataSource.query(`
        ALTER TABLE public.customer_admin_threads
        ADD COLUMN IF NOT EXISTS staff_last_read_at TIMESTAMP NULL;
      `);
      await this.dataSource.query(`
        ALTER TABLE public.customer_admin_threads
        ADD COLUMN IF NOT EXISTS peer_staff_id INT NULL;
      `);
      await this.dataSource.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_admin_threads_staff_peer
          ON public.customer_admin_threads (staff_id, peer_staff_id)
          WHERE staff_id IS NOT NULL AND peer_staff_id IS NOT NULL;
      `);
      try {
        await this.dataSource.query(`
          ALTER TABLE public.customer_admin_threads
          DROP CONSTRAINT IF EXISTS customer_admin_threads_customer_id_key;
        `);
      } catch {
        /* constraint name may differ */
      }
      await this.dataSource.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_admin_threads_customer
          ON public.customer_admin_threads (customer_id)
          WHERE customer_id IS NOT NULL;
      `);
      await this.dataSource.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_admin_threads_staff
          ON public.customer_admin_threads (staff_id)
          WHERE staff_id IS NOT NULL;
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_customer_admin_messages_thread
          ON public.customer_admin_messages (thread_id, created_at);
      `);
      this.logger.log('Customer–admin messages tables ensured.');
    } catch (e) {
      this.logger.warn(`Customer–admin messages tables: ${(e as Error).message}`);
    }
  }

  private async ensureUserTaskCustomerVisibilityTable(): Promise<void> {
    try {
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS public.user_task_customer_visibility (
          id SERIAL PRIMARY KEY,
          user_task_id INTEGER NOT NULL REFERENCES public.user_tasks(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL,
          hidden_at TIMESTAMP NULL,
          badge_dismissed_at TIMESTAMP NULL,
          opened_at TIMESTAMP NULL,
          UNIQUE (user_task_id, user_id)
        );
      `);
      await this.dataSource.query(`
        ALTER TABLE public.user_task_customer_visibility
        ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP NULL;
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_utcv_user_id
          ON public.user_task_customer_visibility(user_id);
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_utcv_user_task_id
          ON public.user_task_customer_visibility(user_task_id);
      `);

      const hasDeletions = await this.dataSource.query(`
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'user_task_customer_deletions'
        LIMIT 1
      `);
      if (Array.isArray(hasDeletions) && hasDeletions.length > 0) {
        await this.dataSource.query(`
          INSERT INTO public.user_task_customer_visibility (user_task_id, user_id, hidden_at)
          SELECT d.user_task_id, d.user_id, d.deleted_at
          FROM public.user_task_customer_deletions d
          ON CONFLICT (user_task_id, user_id) DO UPDATE
            SET hidden_at = COALESCE(public.user_task_customer_visibility.hidden_at, EXCLUDED.hidden_at)
        `);
        await this.dataSource.query(`DROP TABLE IF EXISTS public.user_task_customer_deletions`);
      }

      const hasBadge = await this.dataSource.query(`
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'user_task_customer_badge_dismissals'
        LIMIT 1
      `);
      if (Array.isArray(hasBadge) && hasBadge.length > 0) {
        await this.dataSource.query(`
          INSERT INTO public.user_task_customer_visibility (user_task_id, user_id, badge_dismissed_at)
          SELECT b.user_task_id, b.user_id, b.dismissed_at
          FROM public.user_task_customer_badge_dismissals b
          ON CONFLICT (user_task_id, user_id) DO UPDATE
            SET badge_dismissed_at = COALESCE(
              public.user_task_customer_visibility.badge_dismissed_at,
              EXCLUDED.badge_dismissed_at
            )
        `);
        await this.dataSource.query(
          `DROP TABLE IF EXISTS public.user_task_customer_badge_dismissals`,
        );
      }

      this.logger.log('user_task_customer_visibility table ensured.');
    } catch (e) {
      this.logger.warn(`user_task_customer_visibility: ${(e as Error).message}`);
    }
  }

  private async ensureAdminDashboardBadgeVisibilityTables(): Promise<void> {
    try {
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS public.user_task_admin_visibility (
          id SERIAL PRIMARY KEY,
          user_task_id INTEGER NOT NULL REFERENCES public.user_tasks(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL,
          badge_dismissed_at TIMESTAMP NULL,
          UNIQUE (user_task_id, user_id)
        );
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_utav_user_id
          ON public.user_task_admin_visibility(user_id);
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_utav_user_task_id
          ON public.user_task_admin_visibility(user_task_id);
      `);
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS public.report_fault_admin_visibility (
          id SERIAL PRIMARY KEY,
          report_fault_id INTEGER NOT NULL REFERENCES public.report_faults(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL,
          badge_dismissed_at TIMESTAMP NULL,
          UNIQUE (report_fault_id, user_id)
        );
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_rfav_user_id
          ON public.report_fault_admin_visibility(user_id);
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_rfav_report_fault_id
          ON public.report_fault_admin_visibility(report_fault_id);
      `);
      this.logger.log('Admin dashboard badge visibility tables ensured.');
    } catch (e) {
      this.logger.warn(`Admin dashboard badge visibility: ${(e as Error).message}`);
    }
  }

  private async ensureTicketVisibilityTables(): Promise<void> {
    try {
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS public.ticket_admin_visibility (
          id SERIAL PRIMARY KEY,
          ticket_id INTEGER NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL,
          badge_dismissed_at TIMESTAMP NULL,
          UNIQUE (ticket_id, user_id)
        );
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_tav_user_id
          ON public.ticket_admin_visibility(user_id);
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_tav_ticket_id
          ON public.ticket_admin_visibility(ticket_id);
      `);
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS public.ticket_customer_visibility (
          id SERIAL PRIMARY KEY,
          ticket_id INTEGER NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL,
          badge_dismissed_at TIMESTAMP NULL,
          UNIQUE (ticket_id, user_id)
        );
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_tcv_user_id
          ON public.ticket_customer_visibility(user_id);
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_tcv_ticket_id
          ON public.ticket_customer_visibility(ticket_id);
      `);
      this.logger.log('ticket visibility tables ensured.');
    } catch (e) {
      this.logger.warn(`ticket visibility tables: ${(e as Error).message}`);
    }
  }

  private async ensureReportFaultCustomerVisibilityTable(): Promise<void> {
    try {
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS public.report_fault_customer_visibility (
          id SERIAL PRIMARY KEY,
          report_fault_id INTEGER NOT NULL REFERENCES public.report_faults(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL,
          hidden_at TIMESTAMP NULL,
          badge_dismissed_at TIMESTAMP NULL,
          opened_at TIMESTAMP NULL,
          UNIQUE (report_fault_id, user_id)
        );
      `);
      await this.dataSource.query(`
        ALTER TABLE public.report_fault_customer_visibility
        ADD COLUMN IF NOT EXISTS badge_dismissed_at TIMESTAMP NULL;
      `);
      await this.dataSource.query(`
        ALTER TABLE public.report_fault_customer_visibility
        ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP NULL;
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_rfcv_user_id
          ON public.report_fault_customer_visibility(user_id);
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_rfcv_report_fault_id
          ON public.report_fault_customer_visibility(report_fault_id);
      `);
      this.logger.log('report_fault_customer_visibility table ensured.');
    } catch (e) {
      this.logger.warn(`report_fault_customer_visibility: ${(e as Error).message}`);
    }
  }

  /** One-time: copy user_tasks/report_faults.customer_opened_at into per-login visibility.opened_at. */
  private async applyCustomerOpenedAtBackfillFromLegacy(): Promise<void> {
    const patchName = 'customer_opened_visibility_backfill_v1';
    try {
      const existing = await this.dataSource.query(
        `SELECT 1 FROM public.schema_patches_applied WHERE name = $1 LIMIT 1`,
        [patchName],
      );
      if (Array.isArray(existing) && existing.length > 0) {
        return;
      }

      await this.dataSource.query(`
        INSERT INTO public.user_task_customer_visibility (user_task_id, user_id, opened_at)
        SELECT ut.id, c.user_id, ut.customer_opened_at
        FROM public.user_tasks ut
        INNER JOIN public.customers owner ON owner.user_id = ut.customer_id
        INNER JOIN public.customers c ON (
          c.user_id = ut.customer_id
          OR (
            owner.company_id IS NOT NULL
            AND c.company_id = owner.company_id
          )
          OR (
            owner.company_id IS NULL
            AND TRIM(COALESCE(owner.company_name, '')) <> ''
            AND LOWER(TRIM(c.company_name)) = LOWER(TRIM(owner.company_name))
          )
        )
        WHERE ut.type = 'CUSTOM'
          AND ut.customer_opened_at IS NOT NULL
        ON CONFLICT (user_task_id, user_id) DO UPDATE
        SET opened_at = COALESCE(
          public.user_task_customer_visibility.opened_at,
          EXCLUDED.opened_at
        )
      `);

      await this.dataSource.query(`
        INSERT INTO public.report_fault_customer_visibility (report_fault_id, user_id, opened_at)
        SELECT rf.id, c.user_id, rf.customer_opened_at
        FROM public.report_faults rf
        INNER JOIN public.customers owner ON owner.user_id = rf.customer_id
        INNER JOIN public.customers c ON (
          c.user_id = rf.customer_id
          OR (
            owner.company_id IS NOT NULL
            AND c.company_id = owner.company_id
          )
          OR (
            owner.company_id IS NULL
            AND TRIM(COALESCE(owner.company_name, '')) <> ''
            AND LOWER(TRIM(c.company_name)) = LOWER(TRIM(owner.company_name))
          )
        )
        WHERE rf.customer_opened_at IS NOT NULL
        ON CONFLICT (report_fault_id, user_id) DO UPDATE
        SET opened_at = COALESCE(
          public.report_fault_customer_visibility.opened_at,
          EXCLUDED.opened_at
        )
      `);

      await this.dataSource.query(
        `INSERT INTO public.schema_patches_applied (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
        [patchName],
      );
      this.logger.log('customer_opened_at backfill into visibility tables applied.');
    } catch (e) {
      this.logger.warn(`customer_opened visibility backfill: ${(e as Error).message}`);
    }
  }

  private async applyCustomerEmailNotificationPrefs(): Promise<void> {
    const patchName = 'customer_email_notification_prefs_v1';
    try {
      const existing = await this.dataSource.query(
        `SELECT 1 FROM public.schema_patches_applied WHERE name = $1 LIMIT 1`,
        [patchName],
      );
      if (Array.isArray(existing) && existing.length > 0) {
        return;
      }
      await this.dataSource.query(`
        ALTER TABLE public.customers
          ADD COLUMN IF NOT EXISTS email_notify_fault_reports BOOLEAN NOT NULL DEFAULT FALSE;
      `);
      await this.dataSource.query(`
        ALTER TABLE public.customers
          ADD COLUMN IF NOT EXISTS email_notify_urgent_faults_only BOOLEAN NOT NULL DEFAULT FALSE;
      `);
      await this.dataSource.query(`
        ALTER TABLE public.customers
          ADD COLUMN IF NOT EXISTS email_notify_new_reports BOOLEAN NOT NULL DEFAULT FALSE;
      `);
      await this.dataSource.query(`
        ALTER TABLE public.customers
          ADD COLUMN IF NOT EXISTS email_notify_messages BOOLEAN NOT NULL DEFAULT FALSE;
      `);
      await this.dataSource.query(
        `INSERT INTO public.schema_patches_applied (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
        [patchName],
      );
      this.logger.log('customer email notification preference columns ensured.');
    } catch (e) {
      this.logger.warn(`customer email notification prefs: ${(e as Error).message}`);
    }
  }

  private async applyCustomerFaultNotificationSubtypes(): Promise<void> {
    const patchName = 'customer_fault_notification_subtypes_v1';
    try {
      const existing = await this.dataSource.query(
        `SELECT 1 FROM public.schema_patches_applied WHERE name = $1 LIMIT 1`,
        [patchName],
      );
      if (Array.isArray(existing) && existing.length > 0) {
        return;
      }
      await this.dataSource.query(`
        ALTER TABLE public.customers
          ADD COLUMN IF NOT EXISTS email_notify_normal_fault_reports BOOLEAN NOT NULL DEFAULT FALSE;
      `);
      await this.dataSource.query(`
        ALTER TABLE public.customers
          ADD COLUMN IF NOT EXISTS email_notify_urgent_fault_reports BOOLEAN NOT NULL DEFAULT FALSE;
      `);
      await this.dataSource.query(`
        UPDATE public.customers
        SET
          email_notify_normal_fault_reports = COALESCE(email_notify_fault_reports, FALSE)
            AND NOT COALESCE(email_notify_urgent_faults_only, FALSE),
          email_notify_urgent_fault_reports = COALESCE(email_notify_fault_reports, FALSE)
        WHERE COALESCE(email_notify_fault_reports, FALSE) = TRUE
          AND email_notify_normal_fault_reports = FALSE
          AND email_notify_urgent_fault_reports = FALSE;
      `);
      await this.dataSource.query(
        `INSERT INTO public.schema_patches_applied (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
        [patchName],
      );
      this.logger.log('customer fault notification normal/urgent subtypes applied.');
    } catch (e) {
      this.logger.warn(`customer fault notification subtypes: ${(e as Error).message}`);
    }
  }

  private async applyAdminEmailNotificationPrefs(): Promise<void> {
    const patchName = 'admin_email_notification_prefs_v1';
    try {
      const existing = await this.dataSource.query(
        `SELECT 1 FROM public.schema_patches_applied WHERE name = $1 LIMIT 1`,
        [patchName],
      );
      if (Array.isArray(existing) && existing.length > 0) {
        return;
      }
      await this.dataSource.query(`
        ALTER TABLE public.users
          ADD COLUMN IF NOT EXISTS email_notify_normal_fault_reports BOOLEAN NOT NULL DEFAULT FALSE;
      `);
      await this.dataSource.query(`
        ALTER TABLE public.users
          ADD COLUMN IF NOT EXISTS email_notify_urgent_fault_reports BOOLEAN NOT NULL DEFAULT FALSE;
      `);
      await this.dataSource.query(`
        ALTER TABLE public.users
          ADD COLUMN IF NOT EXISTS email_notify_new_reports BOOLEAN NOT NULL DEFAULT FALSE;
      `);
      await this.dataSource.query(`
        ALTER TABLE public.users
          ADD COLUMN IF NOT EXISTS email_notify_messages BOOLEAN NOT NULL DEFAULT FALSE;
      `);
      await this.dataSource.query(
        `INSERT INTO public.schema_patches_applied (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
        [patchName],
      );
      this.logger.log('admin email notification preference columns ensured.');
    } catch (e) {
      this.logger.warn(`admin email notification prefs: ${(e as Error).message}`);
    }
  }

  private async applyAdminEmailNotifyTicketsColumn(): Promise<void> {
    const patchName = 'admin_email_notify_tickets_v1';
    try {
      const existing = await this.dataSource.query(
        `SELECT 1 FROM public.schema_patches_applied WHERE name = $1 LIMIT 1`,
        [patchName],
      );
      if (Array.isArray(existing) && existing.length > 0) {
        return;
      }
      await this.dataSource.query(`
        ALTER TABLE public.users
          ADD COLUMN IF NOT EXISTS email_notify_tickets BOOLEAN NOT NULL DEFAULT FALSE;
      `);
      await this.dataSource.query(
        `INSERT INTO public.schema_patches_applied (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
        [patchName],
      );
      this.logger.log('admin email_notify_tickets column ensured.');
    } catch (e) {
      this.logger.warn(`admin email_notify_tickets: ${(e as Error).message}`);
    }
  }

  /** Idempotent: sync visibility.opened_at from legacy row when badge-only rows hid real read state. */
  private async repairCustomerReadStateFromLegacy(): Promise<void> {
    try {
      await this.dataSource.query(`
        UPDATE public.user_task_customer_visibility v
        SET opened_at = ut.customer_opened_at
        FROM public.user_tasks ut
        WHERE v.user_task_id = ut.id
          AND ut.type = 'CUSTOM'
          AND ut.customer_opened_at IS NOT NULL
          AND v.opened_at IS NULL
      `);
      await this.dataSource.query(`
        UPDATE public.report_fault_customer_visibility v
        SET opened_at = rf.customer_opened_at
        FROM public.report_faults rf
        WHERE v.report_fault_id = rf.id
          AND rf.customer_opened_at IS NOT NULL
          AND v.opened_at IS NULL
      `);
      this.logger.log('customer read state repaired from legacy customer_opened_at columns.');
    } catch (e) {
      this.logger.warn(`customer read state repair: ${(e as Error).message}`);
    }
  }

  /** report_template_services: template ↔ Service mapping for New Report filtering. */
  private async ensureReportTemplateServicesTable(): Promise<void> {
    try {
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS public.report_template_services (
          report_template_id INT NOT NULL,
          service_id INT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (report_template_id, service_id)
        );
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_report_template_services_service_id
          ON public.report_template_services (service_id);
      `);
      await this.dataSource.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'fk_rtd_report_template'
          ) THEN
            ALTER TABLE public.report_template_services
              ADD CONSTRAINT fk_rtd_report_template
              FOREIGN KEY (report_template_id)
              REFERENCES public.report_templates(id) ON DELETE CASCADE;
          END IF;
        END$$;
      `);
      await this.dataSource.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'fk_rts_service'
          ) THEN
            ALTER TABLE public.report_template_services
              ADD CONSTRAINT fk_rts_service
              FOREIGN KEY (service_id)
              REFERENCES public.services(id) ON DELETE CASCADE;
          END IF;
        END$$;
      `);
      this.logger.log('report_template_services table ensured');
    } catch (e) {
      this.logger.warn(
        `report_template_services patch: ${(e as Error).message}`,
      );
    }
  }

  /** Rename legacy departments tables/columns to services (migration 027). */
  private async applyRenameDepartmentsToServices(): Promise<void> {
    const patchName = 'rename_departments_to_services_v1';
    try {
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS public.schema_patches_applied (
          name VARCHAR(128) PRIMARY KEY,
          applied_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
      const done = await this.dataSource.query(
        `SELECT 1 FROM public.schema_patches_applied WHERE name = $1 LIMIT 1`,
        [patchName],
      );
      if (done?.length) {
        return;
      }

      const stillLegacy = await this.dataSource.query(`
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'departments'
        LIMIT 1
      `);
      if (!stillLegacy?.length) {
        await this.dataSource.query(
          `INSERT INTO public.schema_patches_applied (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
          [patchName],
        );
        return;
      }

      const candidates = [
        path.join(process.cwd(), 'database', 'migrations', '027_rename_departments_to_services.sql'),
        path.join(__dirname, '..', '..', 'database', 'migrations', '027_rename_departments_to_services.sql'),
      ];
      const sqlPath = candidates.find((p) => fs.existsSync(p));
      if (!sqlPath) {
        this.logger.warn('rename departments→services: migration file not found');
        return;
      }
      const sql = fs.readFileSync(sqlPath, 'utf8');
      await this.dataSource.query(sql);
      await this.dataSource.query(
        `INSERT INTO public.schema_patches_applied (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
        [patchName],
      );
      this.logger.log('departments renamed to services (migration 027 applied)');
    } catch (e) {
      this.logger.warn(`rename departments→services: ${(e as Error).message}`);
    }
  }

  private async ensureDashboardUnreadIndexes(): Promise<void> {
    try {
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_user_tasks_dashboard_badge_admin
          ON public.user_tasks (type, status, staff_id)
          WHERE admin_dashboard_dismissed_at IS NULL AND type = 'CUSTOM' AND staff_id > 0;
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_report_faults_dashboard_badge_admin
          ON public.report_faults (status, staff_id)
          WHERE admin_dashboard_dismissed_at IS NULL AND staff_id > 0;
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_user_tasks_dashboard_badge_customer
          ON public.user_tasks (customer_id, type, status)
          WHERE customer_dashboard_dismissed_at IS NULL AND type = 'CUSTOM' AND staff_id > 0;
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_report_faults_dashboard_badge_customer
          ON public.report_faults (customer_id, status)
          WHERE customer_dashboard_dismissed_at IS NULL AND staff_id > 0;
      `);
      this.logger.log('Dashboard unread indexes ensured.');
    } catch (e) {
      this.logger.warn(`Dashboard unread indexes: ${(e as Error).message}`);
    }

    try {
      await this.dataSource.query(`
        DO $$
        DECLARE r record;
        BEGIN
          FOR r IN
            SELECT c.conname
            FROM pg_constraint c
            JOIN pg_class t ON t.oid = c.conrelid
            JOIN pg_namespace n ON n.oid = t.relnamespace
            WHERE n.nspname = 'public'
              AND t.relname = 'users'
              AND c.contype = 'u'
              AND pg_get_constraintdef(c.oid) ILIKE '%username%'
          LOOP
            EXECUTE format('ALTER TABLE public.users DROP CONSTRAINT IF EXISTS %I', r.conname);
          END LOOP;
        END $$;
      `);
      await this.dataSource.query(`
        DROP INDEX IF EXISTS public.users_username_key;
        DROP INDEX IF EXISTS public."UQ_users_username";
      `);
      this.logger.log('users.username: unique constraints removed');
    } catch (e) {
      this.logger.warn(`users.username unique drop: ${(e as Error).message}`);
    }

    try {
      await this.dataSource.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_active
          ON public.users (LOWER(TRIM(email)))
          WHERE status = 1
            AND email IS NOT NULL
            AND TRIM(email) <> '';
      `);
      this.logger.log('users.email: active-account unique index ensured');
    } catch (e) {
      this.logger.warn(`users.email unique index: ${(e as Error).message}`);
    }

    try {
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS public.customer_companies (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          normalized_name VARCHAR(255) NOT NULL UNIQUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      await this.dataSource.query(`
        ALTER TABLE public.customers
        ADD COLUMN IF NOT EXISTS company_id INT NULL;
      `);
      await this.dataSource.query(`
        UPDATE public.customers
        SET company_name = TRIM(
          REGEXP_REPLACE(COALESCE(company_name, ''), '\\s*\\[C-\\d+\\]\\s*', ' ', 'gi')
        );
      `);
      await this.dataSource.query(`
        INSERT INTO public.customer_companies (name, normalized_name)
        SELECT DISTINCT TRIM(company_name), LOWER(TRIM(company_name))
        FROM public.customers
        WHERE TRIM(COALESCE(company_name, '')) <> ''
        ON CONFLICT (normalized_name) DO NOTHING;
      `);
      await this.dataSource.query(`
        UPDATE public.customers c
        SET company_id = cc.id
        FROM public.customer_companies cc
        WHERE LOWER(TRIM(c.company_name)) = cc.normalized_name
          AND TRIM(COALESCE(c.company_name, '')) <> '';
      `);
      await this.dataSource.query(`
        UPDATE public.users u SET type = 1
        WHERE u.type IS DISTINCT FROM 1 AND u.status != 4
          AND EXISTS (SELECT 1 FROM public.customers c WHERE c.user_id = u.id);
      `);
      await this.dataSource.query(`
        DELETE FROM public.staff s
        USING public.users u
        WHERE s.user_id = u.id AND u.type = 1;
      `);
      this.logger.log('customer_companies + company_id ensured; [C-id] tags removed from names');
    } catch (e) {
      this.logger.warn(`customer_companies patch: ${(e as Error).message}`);
    }

    try {
      await this.dataSource.query(`
        ALTER TABLE public.site_items
        ADD COLUMN IF NOT EXISTS company_id INT NULL;
      `);
      await this.dataSource.query(`
        UPDATE public.site_items si
        SET company_id = c.company_id
        FROM public.customers c
        WHERE c.user_id = si.customer_id
          AND si.company_id IS NULL
          AND c.company_id IS NOT NULL;
      `);
      this.logger.log('site_items.company_id backfilled from customers');
    } catch (e) {
      this.logger.warn(`site_items.company_id patch: ${(e as Error).message}`);
    }

    try {
      await this.dataSource.query(`
        ALTER TABLE public.site_items
        ADD COLUMN IF NOT EXISTS frequency_count INT NULL;
      `);
      await this.dataSource.query(`
        ALTER TABLE public.site_items
        ADD COLUMN IF NOT EXISTS frequency_period VARCHAR(16) NULL;
      `);
      await this.dataSource.query(`
        ALTER TABLE public.site_items
        ADD COLUMN IF NOT EXISTS frequency_times INT NULL;
      `);
      await this.dataSource.query(`
        ALTER TABLE public.site_items
        ADD COLUMN IF NOT EXISTS frequency_mode VARCHAR(16) NULL;
      `);
      this.logger.log('site_items frequency columns ensured');
    } catch (e) {
      this.logger.warn(`site_items frequency patch: ${(e as Error).message}`);
    }

    await this.ensureServiceFrequencyTypeColumn();
    await this.ensureSiteItemFrequencyTypeColumn();
    await this.ensureSiteItemActivityNameColumn();
    await this.ensureGroundMaintenanceScheduleConstraints();
  }

  private async ensureServiceFrequencyTypeColumn(): Promise<void> {
    try {
      await this.dataSource.query(`
        ALTER TABLE public.services
        ADD COLUMN IF NOT EXISTS frequency_type VARCHAR(16) NOT NULL DEFAULT 'simple';
      `);
      await this.dataSource.query(`
        UPDATE public.services SET frequency_type = 'detailed'
        WHERE LOWER(TRIM(name)) = 'ground maintenance'
          AND frequency_type = 'simple';
      `);
      await this.dataSource.query(`
        UPDATE public.services SET frequency_type = 'simple'
        WHERE LOWER(TRIM(name)) IN ('roof and gutter', 'roof and gutter cleaning')
          AND frequency_type <> 'simple';
      `);
      this.logger.log('services.frequency_type ensured');
    } catch (e) {
      this.logger.warn(`services frequency_type patch: ${(e as Error).message}`);
    }
  }

  private async ensureSiteItemFrequencyTypeColumn(): Promise<void> {
    try {
      await this.dataSource.query(`
        ALTER TABLE public.site_items
        ADD COLUMN IF NOT EXISTS frequency_type VARCHAR(16) NULL;
      `);
      this.logger.log('site_items.frequency_type ensured');
    } catch (e) {
      this.logger.warn(`site_items frequency_type patch: ${(e as Error).message}`);
    }
  }

  private async ensureSiteItemActivityNameColumn(): Promise<void> {
    try {
      const table = await this.dataSource.query(`
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'site_item_activity_schedules'
        LIMIT 1
      `);
      if (!table?.length) return;

      await this.dataSource.query(`
        ALTER TABLE public.site_item_activity_schedules
        ADD COLUMN IF NOT EXISTS activity_name VARCHAR(255) NULL;
      `);
      await this.dataSource.query(`
        UPDATE public.site_item_activity_schedules s
        SET activity_name = a.name
        FROM public.service_activities a
        WHERE a.id = s.activity_id
          AND (s.activity_name IS NULL OR TRIM(s.activity_name) = '');
      `);
      await this.dataSource.query(`
        ALTER TABLE public.site_item_activity_schedules
        DROP CONSTRAINT IF EXISTS uq_site_item_activity_schedules;
      `);
      await this.dataSource.query(`
        ALTER TABLE public.site_item_activity_schedules
        ALTER COLUMN activity_id DROP NOT NULL;
      `);
      await this.dataSource.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_sias_site_item_activity_name
        ON public.site_item_activity_schedules (site_item_id, LOWER(TRIM(activity_name)))
        WHERE activity_name IS NOT NULL AND TRIM(activity_name) <> '';
      `);
      this.logger.log('site_item_activity_schedules.activity_name ensured');
    } catch (e) {
      this.logger.warn(`site item activity_name patch: ${(e as Error).message}`);
    }
  }

  /** weekly/monthly/fortnight/daily month cells — replaces legacy once-only checks. */
  private async ensureGroundMaintenanceScheduleConstraints(): Promise<void> {
    try {
      const table = await this.dataSource.query(`
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'site_item_activity_schedules'
        LIMIT 1
      `);
      if (!table?.length) return;

      for (let m = 1; m <= 12; m += 1) {
        const col = String(m).padStart(2, '0');
        await this.dataSource.query(
          `ALTER TABLE public.site_item_activity_schedules DROP CONSTRAINT IF EXISTS chk_sias_month_${col}`,
        );
      }

      await this.dataSource.query(`
        UPDATE public.site_item_activity_schedules SET
          month_01 = CASE month_01 WHEN 'once' THEN 'weekly' ELSE month_01 END,
          month_02 = CASE month_02 WHEN 'once' THEN 'weekly' ELSE month_02 END,
          month_03 = CASE month_03 WHEN 'once' THEN 'weekly' ELSE month_03 END,
          month_04 = CASE month_04 WHEN 'once' THEN 'weekly' ELSE month_04 END,
          month_05 = CASE month_05 WHEN 'once' THEN 'weekly' ELSE month_05 END,
          month_06 = CASE month_06 WHEN 'once' THEN 'weekly' ELSE month_06 END,
          month_07 = CASE month_07 WHEN 'once' THEN 'weekly' ELSE month_07 END,
          month_08 = CASE month_08 WHEN 'once' THEN 'weekly' ELSE month_08 END,
          month_09 = CASE month_09 WHEN 'once' THEN 'weekly' ELSE month_09 END,
          month_10 = CASE month_10 WHEN 'once' THEN 'weekly' ELSE month_10 END,
          month_11 = CASE month_11 WHEN 'once' THEN 'weekly' ELSE month_11 END,
          month_12 = CASE month_12 WHEN 'once' THEN 'weekly' ELSE month_12 END
      `);

      await this.dataSource.query(`
        ALTER TABLE public.site_item_activity_schedules
          ADD CONSTRAINT chk_sias_month_01 CHECK (month_01 IS NULL OR month_01 IN ('weekly', 'monthly', 'fortnight', 'daily')),
          ADD CONSTRAINT chk_sias_month_02 CHECK (month_02 IS NULL OR month_02 IN ('weekly', 'monthly', 'fortnight', 'daily')),
          ADD CONSTRAINT chk_sias_month_03 CHECK (month_03 IS NULL OR month_03 IN ('weekly', 'monthly', 'fortnight', 'daily')),
          ADD CONSTRAINT chk_sias_month_04 CHECK (month_04 IS NULL OR month_04 IN ('weekly', 'monthly', 'fortnight', 'daily')),
          ADD CONSTRAINT chk_sias_month_05 CHECK (month_05 IS NULL OR month_05 IN ('weekly', 'monthly', 'fortnight', 'daily')),
          ADD CONSTRAINT chk_sias_month_06 CHECK (month_06 IS NULL OR month_06 IN ('weekly', 'monthly', 'fortnight', 'daily')),
          ADD CONSTRAINT chk_sias_month_07 CHECK (month_07 IS NULL OR month_07 IN ('weekly', 'monthly', 'fortnight', 'daily')),
          ADD CONSTRAINT chk_sias_month_08 CHECK (month_08 IS NULL OR month_08 IN ('weekly', 'monthly', 'fortnight', 'daily')),
          ADD CONSTRAINT chk_sias_month_09 CHECK (month_09 IS NULL OR month_09 IN ('weekly', 'monthly', 'fortnight', 'daily')),
          ADD CONSTRAINT chk_sias_month_10 CHECK (month_10 IS NULL OR month_10 IN ('weekly', 'monthly', 'fortnight', 'daily')),
          ADD CONSTRAINT chk_sias_month_11 CHECK (month_11 IS NULL OR month_11 IN ('weekly', 'monthly', 'fortnight', 'daily')),
          ADD CONSTRAINT chk_sias_month_12 CHECK (month_12 IS NULL OR month_12 IN ('weekly', 'monthly', 'fortnight', 'daily'))
      `);
      this.logger.log('site_item_activity_schedules month constraints ensured (weekly/monthly/fortnight/daily)');
    } catch (e) {
      this.logger.warn(`ground maintenance schedule constraints patch: ${(e as Error).message}`);
    }
  }

  /** Attach a SERIAL default to id when the table was created without auto-increment. */
  private async ensureIdSequence(table: string): Promise<void> {
    const seqRows = await this.dataSource.query(
      `SELECT pg_get_serial_sequence($1, 'id') AS seq`,
      [`public.${table}`],
    );
    let seq = seqRows?.[0]?.seq ?? seqRows?.[0]?.SEQ;
    if (!seq) {
      const seqName = `${table}_id_seq`;
      await this.dataSource.query(`CREATE SEQUENCE IF NOT EXISTS public.${seqName}`);
      await this.dataSource.query(
        `ALTER TABLE public.${table} ALTER COLUMN id SET DEFAULT nextval('public.${seqName}')`,
      );
      seq = `public.${seqName}`;
      this.logger.log(`${table}.id: created sequence ${seqName}`);
    }
    await this.dataSource.query(
      `SELECT setval($1::regclass, GREATEST((SELECT COALESCE(MAX(id), 0) FROM public.${table}), 1), true)`,
      [String(seq)],
    );
    this.logger.log(`${table}.id sequence synced: ${seq}`);
  }

  /** fault_issues catalog + per-service links for report fault create. */
  private async ensureFaultIssuesTables(): Promise<void> {
    const patchName = 'fault_issues_v1';
    try {
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS public.schema_patches_applied (
          name VARCHAR(120) PRIMARY KEY,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS public.fault_issues (
          id SERIAL PRIMARY KEY,
          label VARCHAR(200) NOT NULL,
          sort_order INT NOT NULL DEFAULT 0,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT uq_fault_issues_label UNIQUE (label)
        );
      `);

      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS public.service_fault_issues (
          service_id INT NOT NULL,
          fault_issue_id INT NOT NULL,
          sort_order INT NOT NULL DEFAULT 0,
          PRIMARY KEY (service_id, fault_issue_id)
        );
      `);

      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_service_fault_issues_service_id
          ON public.service_fault_issues (service_id);
      `);

      await this.dataSource.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'fk_sfi_service'
          ) THEN
            ALTER TABLE public.service_fault_issues
              ADD CONSTRAINT fk_sfi_service
              FOREIGN KEY (service_id)
              REFERENCES public.services(id) ON DELETE CASCADE;
          END IF;
        END$$;
      `);

      await this.dataSource.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'fk_sfi_fault_issue'
          ) THEN
            ALTER TABLE public.service_fault_issues
              ADD CONSTRAINT fk_sfi_fault_issue
              FOREIGN KEY (fault_issue_id)
              REFERENCES public.fault_issues(id) ON DELETE CASCADE;
          END IF;
        END$$;
      `);

      const applied = await this.dataSource.query(
        `SELECT 1 FROM public.schema_patches_applied WHERE name = $1 LIMIT 1`,
        [patchName],
      );
      if (applied?.length) {
        this.logger.log('fault_issues seed already applied');
        return;
      }

      const seedLabels = [
        'Broken Door Locks & Latches',
        'Broken Grab Rails / Accessible Fixtures',
        "Door Won't Open / Stuck Shut",
        'Faulty Flush Mechanisms',
        'Graffiti',
        'Light Bulb Burned Out',
        'No Lights',
        'Paper Towel Dispenser Broken/Damaged',
        'Slippery Floor / Flooding',
        'Soap Dispenser Broken/Damaged',
        'Tap or Urinal Running',
        'Toilet Blockage',
        'Toilet Paper Dispenser Broken/Damaged',
        'Urinal Blockage',
        'Vandalism',
        'Wall Damage',
        'Water Leaks',
        'Other',
      ];

      for (let i = 0; i < seedLabels.length; i++) {
        await this.dataSource.query(
          `INSERT INTO public.fault_issues (label, sort_order, is_active)
           VALUES ($1, $2, true)
           ON CONFLICT (label) DO NOTHING`,
          [seedLabels[i], i],
        );
      }

      const services: { id: number; name: string }[] = await this.dataSource.query(
        `SELECT id, name FROM public.services`,
      );

      const otherRow: { id: number }[] = await this.dataSource.query(
        `SELECT id FROM public.fault_issues WHERE label = 'Other' LIMIT 1`,
      );
      const otherId = otherRow?.[0]?.id;

      for (const service of services ?? []) {
        if (otherId) {
          await this.dataSource.query(
            `INSERT INTO public.service_fault_issues (service_id, fault_issue_id, sort_order)
             VALUES ($1, $2, 9999)
             ON CONFLICT (service_id, fault_issue_id) DO NOTHING`,
            [service.id, otherId],
          );
        }

        if (/public amenities/i.test(String(service.name ?? ''))) {
          const issueRows: { id: number; label: string }[] = await this.dataSource.query(
            `SELECT id, label FROM public.fault_issues WHERE label <> 'Other' ORDER BY sort_order, label`,
          );
          for (let i = 0; i < issueRows.length; i++) {
            await this.dataSource.query(
              `INSERT INTO public.service_fault_issues (service_id, fault_issue_id, sort_order)
               VALUES ($1, $2, $3)
               ON CONFLICT (service_id, fault_issue_id) DO NOTHING`,
              [service.id, issueRows[i].id, i],
            );
          }
        }
      }

      await this.dataSource.query(
        `INSERT INTO public.schema_patches_applied (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
        [patchName],
      );
      this.logger.log('fault_issues tables ensured and seed applied');
    } catch (e) {
      this.logger.warn(`fault_issues patch: ${(e as Error).message}`);
    }
  }

  /** Roof and gutter service fault issues for Report Fault issue dropdowns. */
  private async ensureRoofGutterFaultIssues(): Promise<void> {
    const patchName = 'fault_issues_roof_gutter_v1';
    try {
      const applied = await this.dataSource.query(
        `SELECT 1 FROM public.schema_patches_applied WHERE name = $1 LIMIT 1`,
        [patchName],
      );
      if (applied?.length) {
        this.logger.log('roof gutter fault_issues seed already applied');
        return;
      }

      const seedLabels = [
        'Overhanging branches dropping leaves, twigs, and sap onto the roof',
        'Leaf litter and debris clogging gutters',
        'Leaf litter and debris clogging downpipes',
        'Moss growth on roof tiles from tree shade',
        'Lichen and algae growth trapping moisture',
        'Branches rubbing against tiles, causing wear',
        'Sap and berry residue promoting fungal growth',
        'Tree roots blocking underground downpipes',
        'Falling branches cracking roof tiles',
        'Falling branches denting or splitting gutters',
        'Gutters completely blocked with compacted debris',
        'Downpipes jammed at bends or outlets',
        'Gutters overflowing during rain',
        'Standing water in gutters from poor slope',
        'Sagging gutters from heavy debris weight',
        'Rust in gutters from wet decomposing leaves',
        'Corrosion and holes forming in gutters',
        'Cracked or split gutters from branch impact',
        'Leaking joints from broken sealant',
        'Damaged or missing roof tiles',
        'Lifted or curled tiles from trapped moisture',
        'Rotten fascia boards from water overflow',
        'Rotten soffit boards from water overflow',
        'Downspouts discharging too close to foundation',
        'Tree roots invading stormwater drainage',
      ];

      const catalogBaseSort = 100;
      for (let i = 0; i < seedLabels.length; i++) {
        await this.dataSource.query(
          `INSERT INTO public.fault_issues (label, sort_order, is_active)
           VALUES ($1, $2, true)
           ON CONFLICT (label) DO NOTHING`,
          [seedLabels[i], catalogBaseSort + i],
        );
      }

      const services: { id: number; name: string }[] = await this.dataSource.query(
        `SELECT id, name FROM public.services`,
      );

      const issueRows: { id: number; label: string }[] = await this.dataSource.query(
        `SELECT id, label FROM public.fault_issues
         WHERE label = ANY($1::text[])
         ORDER BY sort_order, label`,
        [seedLabels],
      );

      const otherRow: { id: number }[] = await this.dataSource.query(
        `SELECT id FROM public.fault_issues WHERE label = 'Other' LIMIT 1`,
      );
      const otherId = otherRow?.[0]?.id;

      const isRoofGutterService = (name: string) =>
        /^roof\s*(and|&)\s*gutter/i.test(String(name ?? '').trim());

      for (const service of services ?? []) {
        if (!isRoofGutterService(service.name)) continue;

        if (otherId) {
          await this.dataSource.query(
            `INSERT INTO public.service_fault_issues (service_id, fault_issue_id, sort_order)
             VALUES ($1, $2, 9999)
             ON CONFLICT (service_id, fault_issue_id) DO NOTHING`,
            [service.id, otherId],
          );
        }

        for (let i = 0; i < issueRows.length; i++) {
          await this.dataSource.query(
            `INSERT INTO public.service_fault_issues (service_id, fault_issue_id, sort_order)
             VALUES ($1, $2, $3)
             ON CONFLICT (service_id, fault_issue_id) DO NOTHING`,
            [service.id, issueRows[i].id, i],
          );
        }
      }

      await this.dataSource.query(
        `INSERT INTO public.schema_patches_applied (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
        [patchName],
      );
      this.logger.log('roof gutter fault_issues seed applied');
    } catch (e) {
      this.logger.warn(`roof gutter fault_issues patch: ${(e as Error).message}`);
    }
  }

  /** Ground maintenance service fault issues for Report Fault issue dropdowns. */
  private async ensureGroundMaintenanceFaultIssues(): Promise<void> {
    const patchName = 'fault_issues_ground_maintenance_v1';
    try {
      const applied = await this.dataSource.query(
        `SELECT 1 FROM public.schema_patches_applied WHERE name = $1 LIMIT 1`,
        [patchName],
      );
      if (applied?.length) {
        this.logger.log('ground maintenance fault_issues seed already applied');
        return;
      }

      const seedLabels = [
        'Weeds infesting garden beds and lawns',
        'Dead or dying plants and shrubs needing removal',
        'Overgrown hedges blocking pathways',
        'Overgrown hedges blocking windows',
        'Tree branches hanging low over footpaths',
        'Tree branches hanging low over driveways',
        'Tree roots lifting and cracking paved pathways',
        'Tree roots cracking and damaging retaining walls',
        'Uneven or sunken paving creating trip hazards',
        'Cracked or broken concrete paths',
        'Cracked or broken concrete driveways',
        'Loose or missing paving stones',
        'Mulch depleted or missing from garden beds',
        'Soil erosion on slopes or embankments',
        'Poor drainage causing puddles and boggy areas',
        'Blocked surface drains or grates',
        'Downpipe outlets flooding garden beds',
        'Sprinkler system broken or leaking',
        'Irrigation heads blocked or misaligned',
        'Fences leaning, damaged, or rotting',
        'Gates not closing or latching properly',
        'Rust or corrosion on metal gates and fences',
        'Paint peeling or flaking on fences',
        'Decking boards rotting, warped, or loose',
        'General rubbish and green waste scattered around',
      ];

      const catalogBaseSort = 200;
      for (let i = 0; i < seedLabels.length; i++) {
        await this.dataSource.query(
          `INSERT INTO public.fault_issues (label, sort_order, is_active)
           VALUES ($1, $2, true)
           ON CONFLICT (label) DO NOTHING`,
          [seedLabels[i], catalogBaseSort + i],
        );
      }

      const services: { id: number; name: string }[] = await this.dataSource.query(
        `SELECT id, name FROM public.services`,
      );

      const issueRows: { id: number; label: string }[] = await this.dataSource.query(
        `SELECT id, label FROM public.fault_issues
         WHERE label = ANY($1::text[])
         ORDER BY sort_order, label`,
        [seedLabels],
      );

      const otherRow: { id: number }[] = await this.dataSource.query(
        `SELECT id FROM public.fault_issues WHERE label = 'Other' LIMIT 1`,
      );
      const otherId = otherRow?.[0]?.id;

      const isGroundMaintenanceService = (name: string) =>
        /^ground\s*maintenance$/i.test(String(name ?? '').trim());

      for (const service of services ?? []) {
        if (!isGroundMaintenanceService(service.name)) continue;

        if (otherId) {
          await this.dataSource.query(
            `INSERT INTO public.service_fault_issues (service_id, fault_issue_id, sort_order)
             VALUES ($1, $2, 9999)
             ON CONFLICT (service_id, fault_issue_id) DO NOTHING`,
            [service.id, otherId],
          );
        }

        for (let i = 0; i < issueRows.length; i++) {
          await this.dataSource.query(
            `INSERT INTO public.service_fault_issues (service_id, fault_issue_id, sort_order)
             VALUES ($1, $2, $3)
             ON CONFLICT (service_id, fault_issue_id) DO NOTHING`,
            [service.id, issueRows[i].id, i],
          );
        }
      }

      await this.dataSource.query(
        `INSERT INTO public.schema_patches_applied (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
        [patchName],
      );
      this.logger.log('ground maintenance fault_issues seed applied');
    } catch (e) {
      this.logger.warn(`ground maintenance fault_issues patch: ${(e as Error).message}`);
    }
  }

  private async ensureReportFaultToiletAreaColumn(): Promise<void> {
    try {
      await this.dataSource.query(`
        ALTER TABLE public.report_faults
        ADD COLUMN IF NOT EXISTS toilet_area VARCHAR(64) NULL;
      `);
      this.logger.log('report_faults.toilet_area ensured');
    } catch (e) {
      this.logger.warn(`report_faults toilet_area patch: ${(e as Error).message}`);
    }
  }

  private async ensureCustomerPersonnelAndFaultDelegation(): Promise<void> {
    try {
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS public.customer_personnel (
          id SERIAL PRIMARY KEY,
          company_id INT NOT NULL,
          name VARCHAR(200) NOT NULL,
          email VARCHAR(255) NOT NULL,
          phone VARCHAR(64) NULL,
          role VARCHAR(32) NOT NULL DEFAULT 'personnel',
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_by INT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_customer_personnel_company
          ON public.customer_personnel (company_id);
      `);
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS public.personnel_fault_access_tokens (
          id SERIAL PRIMARY KEY,
          report_fault_id INT NOT NULL REFERENCES public.report_faults(id) ON DELETE CASCADE,
          personnel_id INT NOT NULL REFERENCES public.customer_personnel(id) ON DELETE CASCADE,
          token_hash VARCHAR(64) NOT NULL UNIQUE,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_accessed_at TIMESTAMPTZ NULL
        );
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_pfat_fault_id
          ON public.personnel_fault_access_tokens (report_fault_id);
      `);
      await this.dataSource.query(`
        ALTER TABLE public.report_faults
        ADD COLUMN IF NOT EXISTS delegated_to_type VARCHAR(32) NULL;
      `);
      await this.dataSource.query(`
        ALTER TABLE public.report_faults
        ADD COLUMN IF NOT EXISTS delegated_to_personnel_id INT NULL;
      `);
      await this.dataSource.query(`
        ALTER TABLE public.report_faults
        ADD COLUMN IF NOT EXISTS delegated_until TIMESTAMPTZ NULL;
      `);
      await this.dataSource.query(`
        ALTER TABLE public.report_faults
        ADD COLUMN IF NOT EXISTS delegated_by INT NULL;
      `);
      await this.dataSource.query(`
        ALTER TABLE public.report_faults
        ADD COLUMN IF NOT EXISTS delegated_at TIMESTAMPTZ NULL;
      `);
      await this.dataSource.query(`
        ALTER TABLE public.report_faults
        ADD COLUMN IF NOT EXISTS delegation_note TEXT NULL;
      `);
      await this.dataSource.query(`
        ALTER TABLE public.report_faults
        ADD COLUMN IF NOT EXISTS delegated_acted_at TIMESTAMPTZ NULL;
      `);
      await this.dataSource.query(`
        ALTER TABLE public.report_faults
        ADD COLUMN IF NOT EXISTS delegation_viewed_at TIMESTAMPTZ NULL;
      `);
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS public.customer_personnel_role_types (
          id SERIAL PRIMARY KEY,
          company_id INT NOT NULL,
          label VARCHAR(100) NOT NULL,
          normalized_label VARCHAR(100) NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (company_id, normalized_label)
        );
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_cprt_company_id
          ON public.customer_personnel_role_types (company_id);
      `);
      await this.dataSource.query(`
        ALTER TABLE public.customer_personnel
        ALTER COLUMN role TYPE VARCHAR(100);
      `);
      this.logger.log('customer_personnel and fault delegation ensured');
    } catch (e) {
      this.logger.warn(`customer personnel delegation patch: ${(e as Error).message}`);
    }
  }

  private async ensureAdminPersonnelAndStaffDelegation(): Promise<void> {
    try {
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS public.admin_personnel (
          id SERIAL PRIMARY KEY,
          name VARCHAR(200) NOT NULL,
          email VARCHAR(255) NOT NULL,
          phone VARCHAR(64) NULL,
          role VARCHAR(100) NOT NULL DEFAULT 'Staff',
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_by INT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS public.admin_personnel_role_types (
          id SERIAL PRIMARY KEY,
          label VARCHAR(100) NOT NULL,
          normalized_label VARCHAR(100) NOT NULL UNIQUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      await this.dataSource.query(`
        ALTER TABLE public.report_faults
        ADD COLUMN IF NOT EXISTS delegated_to_staff_id INT NULL;
      `);
      await this.dataSource.query(`
        ALTER TABLE public.personnel_fault_access_tokens
        ADD COLUMN IF NOT EXISTS admin_personnel_id INT NULL;
      `);
      await this.dataSource.query(`
        ALTER TABLE public.personnel_fault_access_tokens
        ALTER COLUMN personnel_id DROP NOT NULL;
      `);
      await this.dataSource.query(`
        UPDATE public.report_faults rf
        SET delegated_to_type = 'admin_personnel'
        WHERE rf.delegated_to_type = 'staff'
          AND rf.delegated_to_staff_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.admin_personnel ap
            WHERE ap.id = rf.delegated_to_staff_id
          );
      `);
      this.logger.log('admin_personnel and staff delegation ensured');
    } catch (e) {
      this.logger.warn(`admin personnel delegation patch: ${(e as Error).message}`);
    }
  }

  private async ensureInvoicesTable(): Promise<void> {
    try {
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS public.invoices (
          id SERIAL PRIMARY KEY,
          customer_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          customer_name VARCHAR(255) NOT NULL DEFAULT '',
          company_name VARCHAR(255) NOT NULL DEFAULT '',
          title VARCHAR(500) NOT NULL,
          notes TEXT NULL,
          attach_files VARCHAR(8000) NOT NULL DEFAULT '[]',
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          created_by INTEGER NULL,
          updated_by INTEGER NULL
        );
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON public.invoices(customer_id);
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at DESC);
      `);
      this.logger.log('invoices table ensured');
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS public.invoice_customer_visibility (
          invoice_id INTEGER NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          opened_at TIMESTAMP NULL,
          PRIMARY KEY (invoice_id, user_id)
        );
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_invoice_customer_visibility_user
        ON public.invoice_customer_visibility(user_id);
      `);
      await this.dataSource.query(`
        ALTER TABLE public.invoices
        ADD COLUMN IF NOT EXISTS admin_deleted_at TIMESTAMP NULL;
      `);
      await this.dataSource.query(`
        ALTER TABLE public.invoice_customer_visibility
        ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMP NULL;
      `);
      await this.dataSource.query(`
        ALTER TABLE public.invoice_customer_visibility
        ADD COLUMN IF NOT EXISTS cleared_at TIMESTAMP NULL;
      `);
    } catch (e) {
      this.logger.warn(`invoices table patch: ${(e as Error).message}`);
    }
  }

  private async ensureAssetsTable(): Promise<void> {
    try {
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS public.assets (
          id SERIAL PRIMARY KEY,
          name VARCHAR(500) NOT NULL,
          asset_tag VARCHAR(120) NULL,
          category VARCHAR(255) NULL,
          status VARCHAR(40) NOT NULL DEFAULT 'active',
          company_id INTEGER NOT NULL REFERENCES public.customer_companies(id) ON DELETE RESTRICT,
          company_name VARCHAR(255) NOT NULL DEFAULT '',
          site_id INTEGER NULL,
          site_name VARCHAR(255) NULL,
          location_detail VARCHAR(500) NULL,
          manufacturer VARCHAR(255) NULL,
          model VARCHAR(255) NULL,
          serial_number VARCHAR(255) NULL,
          install_date DATE NULL,
          warranty_expiry DATE NULL,
          condition VARCHAR(40) NULL,
          notes TEXT NULL,
          attach_files VARCHAR(8000) NOT NULL DEFAULT '[]',
          deleted_at TIMESTAMP NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          created_by INTEGER NULL,
          updated_by INTEGER NULL
        );
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_assets_company_id ON public.assets(company_id);
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_assets_deleted_at ON public.assets(deleted_at);
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_assets_created_at ON public.assets(created_at DESC);
      `);
      this.logger.log('assets table ensured');
    } catch (e) {
      this.logger.warn(`assets table patch: ${(e as Error).message}`);
    }
  }
}
