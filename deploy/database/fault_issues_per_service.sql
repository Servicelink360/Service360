-- fault_issues catalog + per-service links for Report Fault issue dropdowns.
-- Also applied idempotently on API startup via postgres-schema-patch (fault_issues_v1).

CREATE TABLE IF NOT EXISTS public.fault_issues (
  id SERIAL PRIMARY KEY,
  label VARCHAR(200) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_fault_issues_label UNIQUE (label)
);

CREATE TABLE IF NOT EXISTS public.service_fault_issues (
  service_id INT NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  fault_issue_id INT NOT NULL REFERENCES public.fault_issues(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (service_id, fault_issue_id)
);

CREATE INDEX IF NOT EXISTS idx_service_fault_issues_service_id
  ON public.service_fault_issues (service_id);
