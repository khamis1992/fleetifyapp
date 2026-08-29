-- Excel import execution agent: persistent versions, row diffs, and auditable commands.
-- Rollback: drop excel_import_agent_actions, excel_import_version_rows, and
-- excel_import_versions, then delete the excel_import.* registry commands below.

CREATE TABLE IF NOT EXISTS public.excel_import_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE RESTRICT,
  content_hash text NOT NULL CHECK (content_hash ~ '^[0-9a-f]{64}$'),
  file_name text NOT NULL,
  status text NOT NULL DEFAULT 'analyzed'
    CHECK (status IN ('analyzed', 'approved', 'duplicate', 'review', 'failed')),
  previous_version_id uuid NULL REFERENCES public.excel_import_versions(id) ON DELETE SET NULL,
  system_agent_run_id uuid NULL REFERENCES public.system_agent_runs(id) ON DELETE SET NULL,
  system_agent_job_id uuid NULL REFERENCES public.system_agent_jobs(id) ON DELETE SET NULL,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NULL,
  approved_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, contract_id, content_hash)
);
CREATE TABLE IF NOT EXISTS public.excel_import_version_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES public.excel_import_versions(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  row_key text NOT NULL,
  source_row_number integer NOT NULL,
  month_label text NOT NULL,
  month_key text NULL,
  payment_amount numeric(15,3) NOT NULL DEFAULT 0,
  remaining_amount numeric(15,3) NOT NULL DEFAULT 0,
  maintenance_amount numeric(15,3) NOT NULL DEFAULT 0,
  delay_days integer NOT NULL DEFAULT 0,
  delay_value numeric(15,3) NOT NULL DEFAULT 0,
  traffic_amount numeric(15,3) NOT NULL DEFAULT 0,
  source_text text NULL,
  classification jsonb NOT NULL DEFAULT '{}'::jsonb,
  diff_type text NOT NULL DEFAULT 'new'
    CHECK (diff_type IN ('new', 'unchanged', 'increased', 'decreased', 'removed', 'classified')),
  previous_row_id uuid NULL REFERENCES public.excel_import_version_rows(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (version_id, row_key)
);
CREATE TABLE IF NOT EXISTS public.excel_import_agent_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES public.excel_import_versions(id) ON DELETE CASCADE,
  row_id uuid NULL REFERENCES public.excel_import_version_rows(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  finding_id uuid NULL REFERENCES public.system_agent_findings(id) ON DELETE SET NULL,
  command text NOT NULL REFERENCES public.system_agent_command_registry(command) ON DELETE RESTRICT,
  risk_level text NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  approval_required boolean NOT NULL DEFAULT false,
  confidence numeric(5,4) NOT NULL DEFAULT 1 CHECK (confidence BETWEEN 0 AND 1),
  status text NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'approved', 'applied', 'skipped', 'review', 'failed')),
  before_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  proposed_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  execution_result jsonb NOT NULL DEFAULT '{}'::jsonb,
  executed_by uuid NULL,
  executed_at timestamptz NULL,
  error text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_excel_import_versions_contract
  ON public.excel_import_versions(company_id, contract_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_excel_import_rows_version
  ON public.excel_import_version_rows(version_id, row_key);
CREATE INDEX IF NOT EXISTS idx_excel_import_actions_version
  ON public.excel_import_agent_actions(version_id, status, risk_level);
INSERT INTO public.system_agent_command_registry (
  command, domain, description, entity_table, allowed_fields,
  reversible, approval_required, closed_period_policy, min_confidence, enabled
) VALUES
  ('excel_import.create_payment', 'accounting', 'Create a new Excel payment allocation.', 'payments', ARRAY['amount','payment_date','invoice_id','contract_id'], true, false, 'block', 0.99, true),
  ('excel_import.increase_payment', 'accounting', 'Apply only the positive difference from a revised Excel payment.', 'payments', ARRAY['amount','payment_date','invoice_id','contract_id'], true, true, 'block', 0.99, true),
  ('excel_import.reverse_payment', 'accounting', 'Reverse or reduce a previously imported Excel payment.', 'payments', ARRAY['amount','payment_status'], true, true, 'block', 1.0, true),
  ('excel_import.create_late_fee', 'accounting', 'Create an explicit historical late fee from Excel.', 'late_fees', ARRAY['fee_amount','days_overdue','invoice_id','contract_id'], true, false, 'block', 0.99, true),
  ('excel_import.adjust_late_fee', 'accounting', 'Adjust a previously imported historical late fee.', 'late_fees', ARRAY['fee_amount','days_overdue','status'], true, true, 'block', 1.0, true),
  ('excel_import.create_traffic_violation', 'accounting', 'Create an explicit historical traffic violation from Excel.', 'penalties', ARRAY['amount','penalty_date','contract_id','vehicle_id'], true, false, 'not_applicable', 0.99, true),
  ('excel_import.adjust_traffic_violation', 'accounting', 'Adjust a previously imported traffic violation.', 'penalties', ARRAY['amount','status','payment_status'], true, true, 'not_applicable', 1.0, true),
  ('excel_import.create_maintenance', 'fleet', 'Create an explicit historical maintenance event from Excel.', 'vehicle_maintenance', ARRAY['actual_cost','scheduled_date','vehicle_id','status'], true, false, 'not_applicable', 0.99, true),
  ('excel_import.adjust_maintenance', 'fleet', 'Adjust a previously imported maintenance event.', 'vehicle_maintenance', ARRAY['actual_cost','status'], true, true, 'not_applicable', 1.0, true),
  ('excel_import.classify_text', 'accounting', 'Classify an unstructured Excel note before execution.', 'excel_import_version_rows', ARRAY['classification'], true, true, 'not_applicable', 0.95, true),
  ('excel_import.no_change', 'accounting', 'Verify that a previously approved Excel row is unchanged.', 'excel_import_version_rows', ARRAY['diff_type'], true, false, 'not_applicable', 1.0, true)
ON CONFLICT (command) DO UPDATE SET
  domain = EXCLUDED.domain,
  description = EXCLUDED.description,
  entity_table = EXCLUDED.entity_table,
  allowed_fields = EXCLUDED.allowed_fields,
  reversible = EXCLUDED.reversible,
  approval_required = EXCLUDED.approval_required,
  closed_period_policy = EXCLUDED.closed_period_policy,
  min_confidence = EXCLUDED.min_confidence,
  enabled = EXCLUDED.enabled,
  updated_at = now();
ALTER TABLE public.excel_import_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.excel_import_version_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.excel_import_agent_actions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.excel_import_versions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.excel_import_version_rows FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.excel_import_agent_actions FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.excel_import_versions TO service_role;
GRANT ALL ON public.excel_import_version_rows TO service_role;
GRANT ALL ON public.excel_import_agent_actions TO service_role;
COMMENT ON TABLE public.excel_import_versions IS 'Persistent Excel import versions used for cross-session duplicate and revision detection.';
COMMENT ON TABLE public.excel_import_version_rows IS 'Normalized row snapshots and differences between approved Excel versions.';
COMMENT ON TABLE public.excel_import_agent_actions IS 'Allow-listed execution plan produced by the Excel import agent.';
