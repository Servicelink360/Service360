-- Ground maintenance fault issues for Report Fault issue dropdowns.
-- Also applied idempotently on API startup via postgres-schema-patch (fault_issues_ground_maintenance_v1).

INSERT INTO public.fault_issues (label, sort_order, is_active) VALUES
  ('Weeds infesting garden beds and lawns', 200, true),
  ('Dead or dying plants and shrubs needing removal', 201, true),
  ('Overgrown hedges blocking pathways', 202, true),
  ('Overgrown hedges blocking windows', 203, true),
  ('Tree branches hanging low over footpaths', 204, true),
  ('Tree branches hanging low over driveways', 205, true),
  ('Tree roots lifting and cracking paved pathways', 206, true),
  ('Tree roots cracking and damaging retaining walls', 207, true),
  ('Uneven or sunken paving creating trip hazards', 208, true),
  ('Cracked or broken concrete paths', 209, true),
  ('Cracked or broken concrete driveways', 210, true),
  ('Loose or missing paving stones', 211, true),
  ('Mulch depleted or missing from garden beds', 212, true),
  ('Soil erosion on slopes or embankments', 213, true),
  ('Poor drainage causing puddles and boggy areas', 214, true),
  ('Blocked surface drains or grates', 215, true),
  ('Downpipe outlets flooding garden beds', 216, true),
  ('Sprinkler system broken or leaking', 217, true),
  ('Irrigation heads blocked or misaligned', 218, true),
  ('Fences leaning, damaged, or rotting', 219, true),
  ('Gates not closing or latching properly', 220, true),
  ('Rust or corrosion on metal gates and fences', 221, true),
  ('Paint peeling or flaking on fences', 222, true),
  ('Decking boards rotting, warped, or loose', 223, true),
  ('General rubbish and green waste scattered around', 224, true)
ON CONFLICT (label) DO NOTHING;

INSERT INTO public.service_fault_issues (service_id, fault_issue_id, sort_order)
SELECT s.id, fi.id, fi.sort_order - 200
FROM public.services s
CROSS JOIN public.fault_issues fi
WHERE LOWER(TRIM(s.name)) = 'ground maintenance'
  AND fi.label IN (
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
    'General rubbish and green waste scattered around'
  )
ON CONFLICT (service_id, fault_issue_id) DO NOTHING;

INSERT INTO public.service_fault_issues (service_id, fault_issue_id, sort_order)
SELECT s.id, fi.id, 9999
FROM public.services s
CROSS JOIN public.fault_issues fi
WHERE LOWER(TRIM(s.name)) = 'ground maintenance'
  AND fi.label = 'Other'
ON CONFLICT (service_id, fault_issue_id) DO NOTHING;

INSERT INTO public.schema_patches_applied (name) VALUES ('fault_issues_ground_maintenance_v1')
ON CONFLICT (name) DO NOTHING;
