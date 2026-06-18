-- Roof and gutter fault issues for Report Fault issue dropdowns.
-- Also applied idempotently on API startup via postgres-schema-patch (fault_issues_roof_gutter_v1).

INSERT INTO public.fault_issues (label, sort_order, is_active) VALUES
  ('Overhanging branches dropping leaves, twigs, and sap onto the roof', 100, true),
  ('Leaf litter and debris clogging gutters', 101, true),
  ('Leaf litter and debris clogging downpipes', 102, true),
  ('Moss growth on roof tiles from tree shade', 103, true),
  ('Lichen and algae growth trapping moisture', 104, true),
  ('Branches rubbing against tiles, causing wear', 105, true),
  ('Sap and berry residue promoting fungal growth', 106, true),
  ('Tree roots blocking underground downpipes', 107, true),
  ('Falling branches cracking roof tiles', 108, true),
  ('Falling branches denting or splitting gutters', 109, true),
  ('Gutters completely blocked with compacted debris', 110, true),
  ('Downpipes jammed at bends or outlets', 111, true),
  ('Gutters overflowing during rain', 112, true),
  ('Standing water in gutters from poor slope', 113, true),
  ('Sagging gutters from heavy debris weight', 114, true),
  ('Rust in gutters from wet decomposing leaves', 115, true),
  ('Corrosion and holes forming in gutters', 116, true),
  ('Cracked or split gutters from branch impact', 117, true),
  ('Leaking joints from broken sealant', 118, true),
  ('Damaged or missing roof tiles', 119, true),
  ('Lifted or curled tiles from trapped moisture', 120, true),
  ('Rotten fascia boards from water overflow', 121, true),
  ('Rotten soffit boards from water overflow', 122, true),
  ('Downspouts discharging too close to foundation', 123, true),
  ('Tree roots invading stormwater drainage', 124, true)
ON CONFLICT (label) DO NOTHING;

INSERT INTO public.service_fault_issues (service_id, fault_issue_id, sort_order)
SELECT s.id, fi.id, fi.sort_order - 100
FROM public.services s
CROSS JOIN public.fault_issues fi
WHERE LOWER(TRIM(s.name)) ~ '^roof\s*(and|&)\s*gutter'
  AND fi.label IN (
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
    'Tree roots invading stormwater drainage'
  )
ON CONFLICT (service_id, fault_issue_id) DO NOTHING;

INSERT INTO public.service_fault_issues (service_id, fault_issue_id, sort_order)
SELECT s.id, fi.id, 9999
FROM public.services s
CROSS JOIN public.fault_issues fi
WHERE LOWER(TRIM(s.name)) ~ '^roof\s*(and|&)\s*gutter'
  AND fi.label = 'Other'
ON CONFLICT (service_id, fault_issue_id) DO NOTHING;

INSERT INTO public.schema_patches_applied (name) VALUES ('fault_issues_roof_gutter_v1')
ON CONFLICT (name) DO NOTHING;
