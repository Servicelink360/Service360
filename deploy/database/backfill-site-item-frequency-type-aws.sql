-- Align each site_item.frequency_type with its service default (per site+service override).

UPDATE public.site_items si
SET frequency_type = s.frequency_type
FROM public.services s
WHERE si.service_id = s.id
  AND s.frequency_type IS NOT NULL
  AND (si.frequency_type IS NULL OR TRIM(si.frequency_type) = '');
