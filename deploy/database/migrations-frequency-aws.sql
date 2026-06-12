-- Frequency system (services + per site_item). Safe to re-run (IF NOT EXISTS / idempotent).

-- 1) Service default: simple | detailed
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS frequency_type VARCHAR(16) NOT NULL DEFAULT 'simple';

UPDATE public.services SET frequency_type = 'detailed'
WHERE LOWER(TRIM(name)) = 'ground maintenance'
  AND frequency_type = 'simple';

UPDATE public.services SET frequency_type = 'simple'
WHERE LOWER(TRIM(name)) IN ('roof and gutter', 'roof and gutter cleaning')
  AND frequency_type <> 'simple';

-- 2) Per site+service override (NULL = inherit service default)
ALTER TABLE public.site_items
  ADD COLUMN IF NOT EXISTS frequency_type VARCHAR(16) NULL;

-- 3) Per-site activity names on schedule rows
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'site_item_activity_schedules'
  ) THEN
    ALTER TABLE public.site_item_activity_schedules
      ADD COLUMN IF NOT EXISTS activity_name VARCHAR(255) NULL;

    UPDATE public.site_item_activity_schedules s
    SET activity_name = a.name
    FROM public.service_activities a
    WHERE a.id = s.activity_id
      AND (s.activity_name IS NULL OR TRIM(s.activity_name) = '');

    ALTER TABLE public.site_item_activity_schedules
      DROP CONSTRAINT IF EXISTS uq_site_item_activity_schedules;

    ALTER TABLE public.site_item_activity_schedules
      ALTER COLUMN activity_id DROP NOT NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS uq_sias_site_item_activity_name
      ON public.site_item_activity_schedules (site_item_id, LOWER(TRIM(activity_name)))
      WHERE activity_name IS NOT NULL AND TRIM(activity_name) <> '';
  END IF;
END $$;
