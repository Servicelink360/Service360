-- Ground Maintenance schedule tables (idempotent). Safe on RDS — CREATE IF NOT EXISTS only.

CREATE TABLE IF NOT EXISTS public.service_activities (
  id SERIAL PRIMARY KEY,
  service_id INT NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT uq_service_activities_service_name UNIQUE (service_id, name)
);

CREATE TABLE IF NOT EXISTS public.site_item_activity_schedules (
  id SERIAL PRIMARY KEY,
  site_item_id INT NOT NULL REFERENCES public.site_items(id) ON DELETE CASCADE,
  activity_id INT NULL REFERENCES public.service_activities(id) ON DELETE CASCADE,
  activity_name VARCHAR(255) NULL,
  access_window VARCHAR(255) NULL,
  month_01 VARCHAR(16) NULL,
  month_02 VARCHAR(16) NULL,
  month_03 VARCHAR(16) NULL,
  month_04 VARCHAR(16) NULL,
  month_05 VARCHAR(16) NULL,
  month_06 VARCHAR(16) NULL,
  month_07 VARCHAR(16) NULL,
  month_08 VARCHAR(16) NULL,
  month_09 VARCHAR(16) NULL,
  month_10 VARCHAR(16) NULL,
  month_11 VARCHAR(16) NULL,
  month_12 VARCHAR(16) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sias_site_item_id
  ON public.site_item_activity_schedules (site_item_id);

ALTER TABLE public.site_item_activity_schedules
  DROP CONSTRAINT IF EXISTS uq_site_item_activity_schedules;

ALTER TABLE public.site_item_activity_schedules
  ALTER COLUMN activity_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sias_site_item_activity_name
  ON public.site_item_activity_schedules (site_item_id, LOWER(TRIM(activity_name)))
  WHERE activity_name IS NOT NULL AND TRIM(activity_name) <> '';

DO $$
DECLARE
  m INT;
  col TEXT;
BEGIN
  FOR m IN 1..12 LOOP
    col := 'chk_sias_month_' || LPAD(m::text, 2, '0');
    EXECUTE format(
      'ALTER TABLE public.site_item_activity_schedules DROP CONSTRAINT IF EXISTS %I',
      col
    );
    EXECUTE format(
      'ALTER TABLE public.site_item_activity_schedules ADD CONSTRAINT %I CHECK (month_%s IS NULL OR month_%s IN (''weekly'', ''monthly'', ''fortnight'', ''daily''))',
      col,
      LPAD(m::text, 2, '0'),
      LPAD(m::text, 2, '0')
    );
  END LOOP;
END $$;
