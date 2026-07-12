-- System-wide audit agent: resumable jobs, typed findings, reversible repairs.
-- All business mutations are executed through the static command registry below.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.system_agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  correlation_id uuid NOT NULL DEFAULT gen_random_uuid(),
  requested_company_id uuid NULL REFERENCES public.companies(id) ON DELETE SET NULL,
  requested_domains text[] NOT NULL,
  mode text NOT NULL CHECK (mode IN ('dry_run', 'apply')),
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'completed', 'partial', 'failed', 'cancelled')),
  trigger_source text NOT NULL DEFAULT 'manual',
  idempotency_key text UNIQUE,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  initiated_by uuid NULL,
  started_at timestamptz NULL,
  finished_at timestamptz NULL,
  error text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.system_agent_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.system_agent_runs(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  domain text NOT NULL CHECK (domain IN (
    'contracts', 'accounting', 'fleet', 'customers', 'inventory', 'legal', 'employees'
  )),
  mode text NOT NULL CHECK (mode IN ('dry_run', 'apply')),
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'retry', 'completed', 'failed', 'cancelled')),
  priority integer NOT NULL DEFAULT 100,
  cursor jsonb NOT NULL DEFAULT '{}'::jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  batch_size integer NOT NULL DEFAULT 100 CHECK (batch_size BETWEEN 1 AND 500),
  processed_batches integer NOT NULL DEFAULT 0,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5 CHECK (max_attempts BETWEEN 1 AND 20),
  lease_token uuid NULL,
  lease_expires_at timestamptz NULL,
  heartbeat_at timestamptz NULL,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_error text NULL,
  started_at timestamptz NULL,
  finished_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, company_id, domain)
);

CREATE TABLE IF NOT EXISTS public.system_agent_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.system_agent_runs(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.system_agent_jobs(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  domain text NOT NULL,
  dedupe_key text NOT NULL,
  code text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  title text NOT NULL,
  details text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence numeric(5,4) NOT NULL DEFAULT 1 CHECK (confidence BETWEEN 0 AND 1),
  repair_command text NULL,
  repair_payload jsonb NULL,
  status text NOT NULL DEFAULT 'detected'
    CHECK (status IN ('detected', 'planned', 'repairing', 'repaired', 'review', 'failed', 'ignored', 'rolled_back')),
  ai_decision jsonb NULL,
  repair_id uuid NULL,
  error text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, dedupe_key)
);

CREATE TABLE IF NOT EXISTS public.system_agent_repairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.system_agent_runs(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.system_agent_jobs(id) ON DELETE CASCADE,
  finding_id uuid NOT NULL UNIQUE REFERENCES public.system_agent_findings(id) ON DELETE RESTRICT,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  domain text NOT NULL,
  command text NOT NULL,
  entity_table text NOT NULL,
  entity_id text NOT NULL,
  status text NOT NULL DEFAULT 'applied'
    CHECK (status IN ('applied', 'failed', 'rolled_back', 'rollback_failed')),
  before_state jsonb NOT NULL,
  after_state jsonb NOT NULL,
  rollback_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  applied_at timestamptz NOT NULL DEFAULT now(),
  rolled_back_at timestamptz NULL,
  rollback_reason text NULL,
  error text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_agent_findings
  DROP CONSTRAINT IF EXISTS system_agent_findings_repair_id_fkey;
ALTER TABLE public.system_agent_findings
  ADD CONSTRAINT system_agent_findings_repair_id_fkey
  FOREIGN KEY (repair_id) REFERENCES public.system_agent_repairs(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.system_agent_command_registry (
  command text PRIMARY KEY,
  domain text NOT NULL,
  description text NOT NULL,
  entity_table text NOT NULL,
  allowed_fields text[] NOT NULL,
  reversible boolean NOT NULL DEFAULT true,
  approval_required boolean NOT NULL DEFAULT false,
  closed_period_policy text NOT NULL DEFAULT 'allow_derived'
    CHECK (closed_period_policy IN ('block', 'allow_derived', 'not_applicable')),
  min_confidence numeric(5,4) NOT NULL DEFAULT 0.99,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.system_agent_command_registry (
  command, domain, description, entity_table, allowed_fields, closed_period_policy, min_confidence
) VALUES
  ('contract.recalculate_totals', 'contracts', 'Recalculate stored contract payment totals.', 'contracts', ARRAY['total_paid','balance_due','payment_status'], 'allow_derived', 0.999),
  ('invoice.recalculate_balance', 'contracts', 'Recalculate an invoice balance from completed receipts.', 'invoices', ARRAY['paid_amount','balance_due','payment_status'], 'allow_derived', 0.999),
  ('invoice.sync_zero_impact_amount', 'contracts', 'Align a zero-impact invoice amount with its payment schedule.', 'invoices', ARRAY['subtotal','total_amount','balance_due','payment_status'], 'block', 1.0),
  ('invoice.cancel_zero_safe', 'contracts', 'Soft-cancel a zero-impact duplicate or invalid invoice.', 'invoices', ARRAY['status','payment_status','balance_due'], 'block', 1.0),
  ('schedule.sync_payment_state', 'contracts', 'Synchronize a schedule paid amount and state.', 'contract_payment_schedules', ARRAY['paid_amount','status','paid_date'], 'allow_derived', 0.999),
  ('schedule.link_invoice', 'contracts', 'Link a schedule to the one unambiguous same-month invoice.', 'contract_payment_schedules', ARRAY['invoice_id'], 'block', 1.0),
  ('contract.generate_missing_invoice', 'contracts', 'Generate and link a missing monthly invoice.', 'contract_payment_schedules', ARRAY['invoice_id'], 'block', 1.0),
  ('payment.correct_uncompleted_date', 'contracts', 'Clamp a non-completed payment date to its contract period.', 'payments', ARRAY['payment_date'], 'block', 1.0),
  ('payment.link_clear_invoice', 'contracts', 'Link an unlinked receipt to its one clear same-month invoice.', 'payments', ARRAY['invoice_id','journal_entry_id'], 'block', 1.0),
  ('accounting.sync_draft_journal_totals', 'accounting', 'Synchronize totals on a draft journal entry.', 'journal_entries', ARRAY['total_debit','total_credit'], 'block', 1.0),
  ('vehicle.sync_status', 'fleet', 'Synchronize vehicle availability with contracts, reservations, and maintenance.', 'vehicles', ARRAY['status'], 'not_applicable', 0.999),
  ('vehicle.sync_mileage', 'fleet', 'Synchronize vehicle mileage from its latest odometer reading.', 'vehicles', ARRAY['current_mileage','odometer_reading'], 'not_applicable', 0.999),
  ('customer.sync_balance', 'customers', 'Synchronize the customer balance summary from invoices and receipts.', 'customer_balances', ARRAY['current_balance','overdue_amount','days_overdue','last_payment_amount','last_payment_date'], 'allow_derived', 0.999),
  ('inventory.sync_stock_level', 'inventory', 'Rebuild an existing stock level from inventory movements.', 'inventory_stock_levels', ARRAY['quantity_on_hand','quantity_available','last_movement_at'], 'not_applicable', 1.0),
  ('inventory.create_stock_level', 'inventory', 'Create a missing derived stock-level row.', 'inventory_stock_levels', ARRAY['exists','item_id','warehouse_id','quantity_on_hand','quantity_reserved','quantity_available','last_movement_at'], 'not_applicable', 1.0),
  ('legal.sync_case_costs', 'legal', 'Synchronize the derived total legal case cost.', 'legal_cases', ARRAY['total_costs'], 'not_applicable', 1.0),
  ('employee.sync_active_status', 'employees', 'Deactivate an employee whose termination date has passed.', 'employees', ARRAY['is_active','account_status'], 'not_applicable', 1.0),
  ('employee.sync_attendance_hours', 'employees', 'Recalculate an unapproved attendance duration.', 'attendance_records', ARRAY['total_hours'], 'not_applicable', 1.0),
  ('employee.sync_leave_balance', 'employees', 'Synchronize used and remaining leave days.', 'leave_balances', ARRAY['used_days','remaining_days'], 'not_applicable', 1.0),
  ('employee.sync_payroll_net', 'employees', 'Recalculate an unposted payroll net amount.', 'payroll', ARRAY['net_amount'], 'block', 1.0)
ON CONFLICT (command) DO UPDATE SET
  domain = EXCLUDED.domain,
  description = EXCLUDED.description,
  entity_table = EXCLUDED.entity_table,
  allowed_fields = EXCLUDED.allowed_fields,
  closed_period_policy = EXCLUDED.closed_period_policy,
  min_confidence = EXCLUDED.min_confidence,
  updated_at = now();

CREATE INDEX IF NOT EXISTS idx_system_agent_runs_status
  ON public.system_agent_runs(status, created_at);
CREATE INDEX IF NOT EXISTS idx_system_agent_jobs_dispatch
  ON public.system_agent_jobs(status, next_attempt_at, priority, created_at);
CREATE INDEX IF NOT EXISTS idx_system_agent_jobs_run
  ON public.system_agent_jobs(run_id, company_id, domain);
CREATE INDEX IF NOT EXISTS idx_system_agent_findings_job
  ON public.system_agent_findings(job_id, status, severity);
CREATE INDEX IF NOT EXISTS idx_system_agent_repairs_company
  ON public.system_agent_repairs(company_id, applied_at DESC);

ALTER TABLE public.system_agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_agent_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_agent_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_agent_repairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_agent_command_registry ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.system_agent_runs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.system_agent_jobs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.system_agent_findings FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.system_agent_repairs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.system_agent_command_registry FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.system_agent_runs TO service_role;
GRANT ALL ON public.system_agent_jobs TO service_role;
GRANT ALL ON public.system_agent_findings TO service_role;
GRANT ALL ON public.system_agent_repairs TO service_role;
GRANT SELECT ON public.system_agent_command_registry TO service_role;

CREATE OR REPLACE FUNCTION public.system_agent_pick_fields(p_source jsonb, p_fields text[])
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(jsonb_object_agg(field_name, p_source -> field_name), '{}'::jsonb)
  FROM unnest(p_fields) AS field_name;
$$;

CREATE OR REPLACE FUNCTION public.system_agent_date_in_closed_period(p_company_id uuid, p_date date)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.accounting_periods ap
    WHERE ap.company_id = p_company_id
      AND p_date BETWEEN ap.start_date AND ap.end_date
      AND lower(COALESCE(ap.status, '')) IN ('closed', 'locked', 'finalized')
  );
$$;

CREATE OR REPLACE FUNCTION public.system_agent_create_run(
  p_mode text DEFAULT 'dry_run',
  p_domains text[] DEFAULT ARRAY['contracts','accounting','fleet','customers','inventory','legal','employees'],
  p_company_id uuid DEFAULT NULL,
  p_batch_size integer DEFAULT 100,
  p_max_companies integer DEFAULT 20,
  p_trigger_source text DEFAULT 'manual',
  p_idempotency_key text DEFAULT NULL,
  p_settings jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run_id uuid;
  v_job_count integer;
  v_allowed constant text[] := ARRAY['contracts','accounting','fleet','customers','inventory','legal','employees'];
BEGIN
  IF p_mode NOT IN ('dry_run', 'apply') THEN
    RAISE EXCEPTION 'Unsupported system agent mode: %', p_mode;
  END IF;
  IF p_domains IS NULL OR cardinality(p_domains) = 0 OR EXISTS (
    SELECT 1
    FROM unnest(p_domains) AS supplied_domain(domain_name)
    WHERE NOT (supplied_domain.domain_name = ANY(v_allowed))
  ) THEN
    RAISE EXCEPTION 'Unsupported system agent domain list';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_run_id
    FROM public.system_agent_runs
    WHERE idempotency_key = p_idempotency_key;
    IF v_run_id IS NOT NULL THEN
      SELECT count(*) INTO v_job_count FROM public.system_agent_jobs WHERE run_id = v_run_id;
      RETURN jsonb_build_object('run_id', v_run_id, 'jobs', v_job_count, 'existing', true);
    END IF;
  END IF;

  INSERT INTO public.system_agent_runs (
    requested_company_id, requested_domains, mode, status, trigger_source,
    idempotency_key, settings, initiated_by, started_at
  ) VALUES (
    p_company_id, p_domains, p_mode, 'running', p_trigger_source,
    p_idempotency_key, COALESCE(p_settings, '{}'::jsonb), auth.uid(), now()
  ) RETURNING id INTO v_run_id;

  INSERT INTO public.system_agent_jobs (
    run_id, company_id, domain, mode, status, batch_size, settings
  )
  SELECT
    v_run_id,
    company_scope.id,
    requested_domain.domain_name,
    p_mode,
    'queued',
    LEAST(500, GREATEST(1, COALESCE(p_batch_size, 100))),
    COALESCE(p_settings, '{}'::jsonb)
  FROM (
    SELECT c.id
    FROM public.companies c
    WHERE (p_company_id IS NULL OR c.id = p_company_id)
      AND (
        p_company_id IS NOT NULL
        OR lower(COALESCE(c.subscription_status, 'active')) IN ('active', 'trial', '')
      )
    ORDER BY c.created_at, c.id
    LIMIT LEAST(100, GREATEST(1, COALESCE(p_max_companies, 20)))
  ) AS company_scope
  CROSS JOIN unnest(p_domains) AS requested_domain(domain_name);

  GET DIAGNOSTICS v_job_count = ROW_COUNT;
  IF v_job_count = 0 THEN
    UPDATE public.system_agent_runs
    SET status = 'failed', finished_at = now(), error = 'No companies matched the requested scope', updated_at = now()
    WHERE id = v_run_id;
    RAISE EXCEPTION 'No companies matched the requested system agent scope';
  END IF;

  RETURN jsonb_build_object('run_id', v_run_id, 'jobs', v_job_count, 'existing', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.system_agent_claim_job(p_job_id uuid, p_lease_seconds integer DEFAULT 90)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token uuid := gen_random_uuid();
  v_job public.system_agent_jobs%ROWTYPE;
BEGIN
  UPDATE public.system_agent_jobs
  SET status = 'running',
      lease_token = v_token,
      lease_expires_at = now() + make_interval(secs => LEAST(300, GREATEST(30, p_lease_seconds))),
      heartbeat_at = now(),
      started_at = COALESCE(started_at, now()),
      processed_batches = processed_batches + 1,
      updated_at = now()
  WHERE id = p_job_id
    AND attempts < max_attempts
    AND (
      (status IN ('queued', 'retry') AND next_attempt_at <= now())
      OR (status = 'running' AND lease_expires_at < now())
    )
  RETURNING * INTO v_job;

  IF v_job.id IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN to_jsonb(v_job);
END;
$$;

CREATE OR REPLACE FUNCTION public.system_agent_refresh_run(p_run_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer;
  v_completed integer;
  v_failed integer;
  v_active integer;
  v_status text;
  v_summary jsonb;
BEGIN
  SELECT
    count(*),
    count(*) FILTER (WHERE status = 'completed'),
    count(*) FILTER (WHERE status = 'failed'),
    count(*) FILTER (WHERE status IN ('queued', 'running', 'retry'))
  INTO v_total, v_completed, v_failed, v_active
  FROM public.system_agent_jobs
  WHERE run_id = p_run_id;

  v_status := CASE
    WHEN v_active > 0 THEN 'running'
    WHEN v_failed = 0 AND v_completed = v_total THEN 'completed'
    WHEN v_completed > 0 THEN 'partial'
    ELSE 'failed'
  END;

  SELECT jsonb_build_object(
    'jobs', jsonb_build_object('total', v_total, 'completed', v_completed, 'failed', v_failed, 'active', v_active),
    'findings', jsonb_build_object(
      'total', count(*),
      'repaired', count(*) FILTER (WHERE status = 'repaired'),
      'review', count(*) FILTER (WHERE status = 'review'),
      'failed', count(*) FILTER (WHERE status = 'failed'),
      'planned', count(*) FILTER (WHERE status IN ('detected', 'planned'))
    )
  ) INTO v_summary
  FROM public.system_agent_findings
  WHERE run_id = p_run_id;

  UPDATE public.system_agent_runs
  SET status = v_status,
      summary = v_summary,
      finished_at = CASE WHEN v_active = 0 THEN now() ELSE NULL END,
      updated_at = now()
  WHERE id = p_run_id;

  RETURN jsonb_build_object('status', v_status, 'summary', v_summary);
END;
$$;

CREATE OR REPLACE FUNCTION public.system_agent_finish_job(
  p_job_id uuid,
  p_lease_token uuid,
  p_success boolean,
  p_has_more boolean DEFAULT false,
  p_cursor jsonb DEFAULT '{}'::jsonb,
  p_stats jsonb DEFAULT '{}'::jsonb,
  p_error text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job public.system_agent_jobs%ROWTYPE;
BEGIN
  UPDATE public.system_agent_jobs
  SET status = CASE
        WHEN p_success AND p_has_more THEN 'queued'
        WHEN p_success THEN 'completed'
        WHEN attempts + 1 < max_attempts THEN 'retry'
        ELSE 'failed'
      END,
      attempts = CASE WHEN p_success THEN attempts ELSE attempts + 1 END,
      cursor = COALESCE(p_cursor, cursor),
      stats = COALESCE(p_stats, stats),
      last_error = CASE WHEN p_success THEN NULL ELSE left(COALESCE(p_error, 'Unknown worker failure'), 4000) END,
      next_attempt_at = CASE WHEN p_success THEN now() ELSE now() + interval '30 seconds' END,
      finished_at = CASE WHEN p_success AND NOT p_has_more THEN now() WHEN NOT p_success AND attempts + 1 >= max_attempts THEN now() ELSE NULL END,
      lease_token = NULL,
      lease_expires_at = NULL,
      heartbeat_at = now(),
      updated_at = now()
  WHERE id = p_job_id
    AND status = 'running'
    AND lease_token = p_lease_token
  RETURNING * INTO v_job;

  IF v_job.id IS NULL THEN
    RAISE EXCEPTION 'System agent job lease is no longer valid';
  END IF;

  PERFORM public.system_agent_refresh_run(v_job.run_id);
  RETURN to_jsonb(v_job);
END;
$$;

REVOKE ALL ON FUNCTION public.system_agent_create_run(text,text[],uuid,integer,integer,text,text,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.system_agent_claim_job(uuid,integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.system_agent_refresh_run(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.system_agent_finish_job(uuid,uuid,boolean,boolean,jsonb,jsonb,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_create_run(text,text[],uuid,integer,integer,text,text,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.system_agent_claim_job(uuid,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.system_agent_refresh_run(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.system_agent_finish_job(uuid,uuid,boolean,boolean,jsonb,jsonb,text) TO service_role;

CREATE OR REPLACE FUNCTION public.system_agent_apply_repair(
  p_run_id uuid,
  p_job_id uuid,
  p_finding_id uuid,
  p_command text,
  p_company_id uuid,
  p_entity_id text,
  p_expected_before jsonb DEFAULT '{}'::jsonb,
  p_values jsonb DEFAULT '{}'::jsonb,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job public.system_agent_jobs%ROWTYPE;
  v_finding public.system_agent_findings%ROWTYPE;
  v_registry public.system_agent_command_registry%ROWTYPE;
  v_before jsonb;
  v_after jsonb;
  v_before_values jsonb;
  v_after_values jsonb;
  v_effective_date date;
  v_repair_id uuid := gen_random_uuid();
  v_created_id uuid;
  v_repair_entity_id text := p_entity_id;
  v_rollback_metadata jsonb := COALESCE(p_metadata, '{}'::jsonb);
BEGIN
  SELECT * INTO v_job
  FROM public.system_agent_jobs
  WHERE id = p_job_id AND run_id = p_run_id AND company_id = p_company_id
  FOR UPDATE;
  IF v_job.id IS NULL OR v_job.status <> 'running' OR v_job.mode <> 'apply' THEN
    RAISE EXCEPTION 'System agent job is not an active apply job';
  END IF;

  SELECT * INTO v_finding
  FROM public.system_agent_findings
  WHERE id = p_finding_id
    AND run_id = p_run_id
    AND job_id = p_job_id
    AND company_id = p_company_id
  FOR UPDATE;
  IF v_finding.id IS NULL THEN
    RAISE EXCEPTION 'System agent finding is outside the active job scope';
  END IF;
  IF v_finding.status IN ('repaired', 'rolled_back') THEN
    RAISE EXCEPTION 'System agent finding has already been processed';
  END IF;
  IF v_finding.repair_command IS DISTINCT FROM p_command THEN
    RAISE EXCEPTION 'Repair command does not match the finding plan';
  END IF;

  SELECT * INTO v_registry
  FROM public.system_agent_command_registry
  WHERE command = p_command AND enabled AND reversible AND NOT approval_required;
  IF v_registry.command IS NULL OR v_registry.domain <> v_job.domain THEN
    RAISE EXCEPTION 'Repair command is disabled or not registered for this worker';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM jsonb_object_keys(COALESCE(p_values, '{}'::jsonb)) AS supplied(supplied_field)
    WHERE NOT (supplied.supplied_field = ANY(v_registry.allowed_fields))
  ) THEN
    RAISE EXCEPTION 'Repair payload contains a field outside the command registry';
  END IF;
  IF v_finding.confidence < v_registry.min_confidence THEN
    RAISE EXCEPTION 'Finding confidence is below the registered command threshold';
  END IF;

  IF p_command = 'contract.recalculate_totals' THEN
    SELECT to_jsonb(c), c.contract_date INTO v_before, v_effective_date
    FROM public.contracts c
    WHERE c.id = p_entity_id::uuid AND c.company_id = p_company_id
    FOR UPDATE;
  ELSIF p_command IN ('invoice.recalculate_balance', 'invoice.sync_zero_impact_amount', 'invoice.cancel_zero_safe') THEN
    SELECT to_jsonb(i), i.invoice_date INTO v_before, v_effective_date
    FROM public.invoices i
    WHERE i.id = p_entity_id::uuid AND i.company_id = p_company_id
    FOR UPDATE;
  ELSIF p_command IN ('schedule.sync_payment_state', 'schedule.link_invoice', 'contract.generate_missing_invoice') THEN
    SELECT to_jsonb(s), s.due_date INTO v_before, v_effective_date
    FROM public.contract_payment_schedules s
    WHERE s.id = p_entity_id::uuid AND s.company_id = p_company_id
    FOR UPDATE;
  ELSIF p_command IN ('payment.correct_uncompleted_date', 'payment.link_clear_invoice') THEN
    SELECT to_jsonb(p), p.payment_date INTO v_before, v_effective_date
    FROM public.payments p
    WHERE p.id = p_entity_id::uuid AND p.company_id = p_company_id
    FOR UPDATE;
  ELSIF p_command = 'accounting.sync_draft_journal_totals' THEN
    SELECT to_jsonb(j), j.entry_date INTO v_before, v_effective_date
    FROM public.journal_entries j
    WHERE j.id = p_entity_id::uuid AND j.company_id = p_company_id
    FOR UPDATE;
  ELSIF p_command IN ('vehicle.sync_status', 'vehicle.sync_mileage') THEN
    SELECT to_jsonb(v) INTO v_before
    FROM public.vehicles v
    WHERE v.id = p_entity_id::uuid AND v.company_id = p_company_id
    FOR UPDATE;
  ELSIF p_command = 'customer.sync_balance' THEN
    SELECT to_jsonb(cb) INTO v_before
    FROM public.customer_balances cb
    WHERE cb.id = p_entity_id::uuid AND cb.company_id = p_company_id
    FOR UPDATE;
  ELSIF p_command = 'inventory.sync_stock_level' THEN
    SELECT to_jsonb(sl) INTO v_before
    FROM public.inventory_stock_levels sl
    WHERE sl.id = p_entity_id::uuid AND sl.company_id = p_company_id
    FOR UPDATE;
  ELSIF p_command = 'inventory.create_stock_level' THEN
    IF NOT (p_values ? 'item_id') OR NOT (p_values ? 'warehouse_id') THEN
      RAISE EXCEPTION 'Missing item_id or warehouse_id for stock-level creation';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.inventory_stock_levels sl
      WHERE sl.company_id = p_company_id
        AND sl.item_id = (p_values ->> 'item_id')::uuid
        AND sl.warehouse_id = (p_values ->> 'warehouse_id')::uuid
    ) THEN
      RAISE EXCEPTION 'Stock level was created after this finding was detected';
    END IF;
    v_before := jsonb_build_object('exists', false);
  ELSIF p_command = 'legal.sync_case_costs' THEN
    SELECT to_jsonb(lc) INTO v_before
    FROM public.legal_cases lc
    WHERE lc.id = p_entity_id::uuid AND lc.company_id = p_company_id
    FOR UPDATE;
  ELSIF p_command = 'employee.sync_active_status' THEN
    SELECT to_jsonb(e) INTO v_before
    FROM public.employees e
    WHERE e.id = p_entity_id::uuid AND e.company_id = p_company_id
    FOR UPDATE;
  ELSIF p_command = 'employee.sync_attendance_hours' THEN
    SELECT to_jsonb(a) INTO v_before
    FROM public.attendance_records a
    JOIN public.employees e ON e.id = a.employee_id
    WHERE a.id = p_entity_id::uuid AND e.company_id = p_company_id
    FOR UPDATE OF a;
  ELSIF p_command = 'employee.sync_leave_balance' THEN
    SELECT to_jsonb(lb) INTO v_before
    FROM public.leave_balances lb
    JOIN public.employees e ON e.id = lb.employee_id
    WHERE lb.id = p_entity_id::uuid AND e.company_id = p_company_id
    FOR UPDATE OF lb;
  ELSIF p_command = 'employee.sync_payroll_net' THEN
    SELECT to_jsonb(pr), pr.payroll_date INTO v_before, v_effective_date
    FROM public.payroll pr
    WHERE pr.id = p_entity_id::uuid AND pr.company_id = p_company_id
    FOR UPDATE;
  ELSE
    RAISE EXCEPTION 'Repair command has no static implementation: %', p_command;
  END IF;

  IF v_before IS NULL THEN
    RAISE EXCEPTION 'Repair entity was not found in the requested company';
  END IF;

  v_before_values := public.system_agent_pick_fields(v_before, v_registry.allowed_fields);
  IF COALESCE(p_expected_before, '{}'::jsonb) <> '{}'::jsonb
     AND NOT (v_before_values @> p_expected_before)
  THEN
    RAISE EXCEPTION 'Entity changed after detection; repair was safely aborted';
  END IF;

  IF v_registry.closed_period_policy = 'block'
     AND v_effective_date IS NOT NULL
     AND public.system_agent_date_in_closed_period(p_company_id, v_effective_date)
  THEN
    RAISE EXCEPTION 'Repair is blocked because the effective date is in a closed accounting period';
  END IF;

  IF p_command = 'contract.recalculate_totals' THEN
    IF (p_values ->> 'total_paid')::numeric < 0 OR (p_values ->> 'balance_due')::numeric < 0
       OR (p_values ->> 'payment_status') NOT IN ('unpaid', 'partial', 'paid') THEN
      RAISE EXCEPTION 'Invalid contract financial totals';
    END IF;
    UPDATE public.contracts SET
      total_paid = (p_values ->> 'total_paid')::numeric,
      balance_due = (p_values ->> 'balance_due')::numeric,
      payment_status = p_values ->> 'payment_status',
      updated_at = now()
    WHERE id = p_entity_id::uuid AND company_id = p_company_id;
  ELSIF p_command = 'invoice.recalculate_balance' THEN
    IF (p_values ->> 'paid_amount')::numeric < 0 OR (p_values ->> 'balance_due')::numeric < 0
       OR (p_values ->> 'payment_status') NOT IN ('unpaid', 'partial', 'paid') THEN
      RAISE EXCEPTION 'Invalid invoice balance values';
    END IF;
    UPDATE public.invoices SET
      paid_amount = (p_values ->> 'paid_amount')::numeric,
      balance_due = (p_values ->> 'balance_due')::numeric,
      payment_status = p_values ->> 'payment_status',
      updated_at = now()
    WHERE id = p_entity_id::uuid AND company_id = p_company_id;
  ELSIF p_command = 'invoice.sync_zero_impact_amount' THEN
    IF (p_values ->> 'total_amount')::numeric < 0
       OR (p_values ->> 'subtotal')::numeric < 0
       OR (p_values ->> 'balance_due')::numeric < 0
       OR (p_values ->> 'payment_status') NOT IN ('unpaid', 'paid')
       OR (v_before ->> 'journal_entry_id') IS NOT NULL
       OR abs(COALESCE((v_before ->> 'paid_amount')::numeric, 0)) > 0.01
       OR EXISTS (
         SELECT 1 FROM public.payments p
         WHERE p.company_id = p_company_id AND p.invoice_id = p_entity_id::uuid
           AND lower(COALESCE(p.payment_status, '')) NOT IN ('cancelled','canceled','void','voided','failed','reversed','refunded')
       )
    THEN
      RAISE EXCEPTION 'Invoice amount gained financial impact and cannot be synchronized automatically';
    END IF;
    UPDATE public.invoices SET
      subtotal = (p_values ->> 'subtotal')::numeric,
      total_amount = (p_values ->> 'total_amount')::numeric,
      balance_due = (p_values ->> 'balance_due')::numeric,
      payment_status = p_values ->> 'payment_status',
      updated_at = now()
    WHERE id = p_entity_id::uuid AND company_id = p_company_id;
  ELSIF p_command = 'invoice.cancel_zero_safe' THEN
    IF abs(COALESCE((v_before ->> 'total_amount')::numeric, 0)) > 0.01
       OR abs(COALESCE((v_before ->> 'paid_amount')::numeric, 0)) > 0.01
       OR abs(COALESCE((v_before ->> 'balance_due')::numeric, 0)) > 0.01
       OR (v_before ->> 'journal_entry_id') IS NOT NULL
       OR EXISTS (
         SELECT 1 FROM public.payments p
         WHERE p.company_id = p_company_id AND p.invoice_id = p_entity_id::uuid
           AND lower(COALESCE(p.payment_status, '')) NOT IN ('cancelled','canceled','void','voided','failed','reversed','refunded')
       )
    THEN
      RAISE EXCEPTION 'Invoice gained financial impact and cannot be auto-cancelled';
    END IF;
    UPDATE public.invoices SET
      status = 'cancelled', payment_status = 'cancelled', balance_due = 0, updated_at = now()
    WHERE id = p_entity_id::uuid AND company_id = p_company_id;
  ELSIF p_command = 'schedule.sync_payment_state' THEN
    IF (p_values ->> 'paid_amount')::numeric < 0
       OR (p_values ->> 'paid_amount')::numeric > COALESCE((v_before ->> 'amount')::numeric, 0) + 0.01
       OR (p_values ->> 'status') NOT IN ('pending','partial','paid','overdue') THEN
      RAISE EXCEPTION 'Invalid schedule payment state';
    END IF;
    UPDATE public.contract_payment_schedules SET
      paid_amount = (p_values ->> 'paid_amount')::numeric,
      status = p_values ->> 'status',
      paid_date = CASE WHEN p_values ->> 'paid_date' IS NULL THEN NULL ELSE (p_values ->> 'paid_date')::date END,
      updated_at = now()
    WHERE id = p_entity_id::uuid AND company_id = p_company_id;
  ELSIF p_command = 'schedule.link_invoice' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.invoices i
      WHERE i.id = (p_values ->> 'invoice_id')::uuid
        AND i.company_id = p_company_id
        AND i.contract_id = (v_before ->> 'contract_id')::uuid
        AND date_trunc('month', COALESCE(i.due_date, i.invoice_date))::date =
            date_trunc('month', (v_before ->> 'due_date')::date)::date
        AND lower(COALESCE(i.status, '')) NOT IN ('cancelled', 'canceled')
    ) THEN
      RAISE EXCEPTION 'Invoice is not an active same-contract same-month candidate';
    END IF;
    UPDATE public.contract_payment_schedules SET
      invoice_id = (p_values ->> 'invoice_id')::uuid, updated_at = now()
    WHERE id = p_entity_id::uuid AND company_id = p_company_id;
  ELSIF p_command = 'contract.generate_missing_invoice' THEN
    IF (v_before ->> 'invoice_id') IS NOT NULL THEN
      RAISE EXCEPTION 'Schedule already has an invoice';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.company_id = p_company_id
        AND i.contract_id = (v_before ->> 'contract_id')::uuid
        AND date_trunc('month', COALESCE(i.due_date, i.invoice_date))::date =
            date_trunc('month', (v_before ->> 'due_date')::date)::date
        AND lower(COALESCE(i.status, '')) NOT IN ('cancelled','canceled')
    ) THEN
      RAISE EXCEPTION 'An active invoice now exists for the schedule month';
    END IF;
    v_created_id := public.generate_invoice_for_contract_month(
      (v_before ->> 'contract_id')::uuid,
      date_trunc('month', (v_before ->> 'due_date')::date)::date
    );
    IF v_created_id IS NULL THEN
      RAISE EXCEPTION 'Invoice generator did not create an invoice';
    END IF;
    UPDATE public.contract_payment_schedules SET invoice_id = v_created_id, updated_at = now()
    WHERE id = p_entity_id::uuid AND company_id = p_company_id;
    v_rollback_metadata := v_rollback_metadata || jsonb_build_object('created_invoice_id', v_created_id);
  ELSIF p_command = 'payment.correct_uncompleted_date' THEN
    IF lower(COALESCE(v_before ->> 'payment_status', '')) IN ('completed','paid','success','succeeded') THEN
      RAISE EXCEPTION 'Completed payment dates require reversal and approval';
    END IF;
    UPDATE public.payments SET payment_date = (p_values ->> 'payment_date')::date, updated_at = now()
    WHERE id = p_entity_id::uuid AND company_id = p_company_id;
  ELSIF p_command = 'payment.link_clear_invoice' THEN
    IF (v_before ->> 'invoice_id') IS NOT NULL OR NOT EXISTS (
      SELECT 1
      FROM public.invoices i
      WHERE i.id = (p_values ->> 'invoice_id')::uuid
        AND i.company_id = p_company_id
        AND i.contract_id = (v_before ->> 'contract_id')::uuid
        AND date_trunc('month', COALESCE(i.due_date, i.invoice_date))::date =
            date_trunc('month', (v_before ->> 'payment_date')::date)::date
        AND lower(COALESCE(i.status, '')) NOT IN ('cancelled','canceled','void','voided')
        AND COALESCE(i.balance_due, i.total_amount, 0) + 1 >= COALESCE((v_before ->> 'amount')::numeric, 0)
    ) OR 1 <> (
      SELECT count(*)
      FROM public.invoices i
      WHERE i.company_id = p_company_id
        AND i.contract_id = (v_before ->> 'contract_id')::uuid
        AND date_trunc('month', COALESCE(i.due_date, i.invoice_date))::date =
            date_trunc('month', (v_before ->> 'payment_date')::date)::date
        AND lower(COALESCE(i.status, '')) NOT IN ('cancelled','canceled','void','voided')
        AND COALESCE(i.balance_due, i.total_amount, 0) > 0
        AND COALESCE(i.balance_due, i.total_amount, 0) + 1 >= COALESCE((v_before ->> 'amount')::numeric, 0)
    ) THEN
      RAISE EXCEPTION 'Payment no longer has one clear same-month invoice candidate';
    END IF;
    UPDATE public.payments SET invoice_id = (p_values ->> 'invoice_id')::uuid, updated_at = now()
    WHERE id = p_entity_id::uuid AND company_id = p_company_id;
  ELSIF p_command = 'accounting.sync_draft_journal_totals' THEN
    IF lower(COALESCE(v_before ->> 'status', '')) NOT IN ('draft','pending')
       OR (p_values ->> 'total_debit')::numeric < 0
       OR (p_values ->> 'total_credit')::numeric < 0
       OR abs((p_values ->> 'total_debit')::numeric - (p_values ->> 'total_credit')::numeric) > 0.01 THEN
      RAISE EXCEPTION 'Only balanced draft journal totals can be repaired';
    END IF;
    UPDATE public.journal_entries SET
      total_debit = (p_values ->> 'total_debit')::numeric,
      total_credit = (p_values ->> 'total_credit')::numeric,
      updated_at = now()
    WHERE id = p_entity_id::uuid AND company_id = p_company_id;
  ELSIF p_command = 'vehicle.sync_status' THEN
    IF lower(COALESCE(v_before ->> 'status', '')) IN (
      'maintenance','out_of_service','accident','stolen','police_station','reserved_employee','municipality'
    ) OR (p_values ->> 'status') NOT IN ('available','rented','maintenance','out_of_service','street_52') THEN
      RAISE EXCEPTION 'Invalid vehicle status';
    END IF;
    UPDATE public.vehicles SET status = (p_values ->> 'status')::public.vehicle_status, updated_at = now()
    WHERE id = p_entity_id::uuid AND company_id = p_company_id;
  ELSIF p_command = 'vehicle.sync_mileage' THEN
    IF (p_values ->> 'current_mileage')::numeric < 0 OR (p_values ->> 'odometer_reading')::numeric < 0 THEN
      RAISE EXCEPTION 'Vehicle mileage cannot be negative';
    END IF;
    UPDATE public.vehicles SET
      current_mileage = (p_values ->> 'current_mileage')::numeric,
      odometer_reading = (p_values ->> 'odometer_reading')::numeric,
      updated_at = now()
    WHERE id = p_entity_id::uuid AND company_id = p_company_id;
  ELSIF p_command = 'customer.sync_balance' THEN
    UPDATE public.customer_balances SET
      current_balance = (p_values ->> 'current_balance')::numeric,
      overdue_amount = (p_values ->> 'overdue_amount')::numeric,
      days_overdue = (p_values ->> 'days_overdue')::integer,
      last_payment_amount = CASE WHEN p_values ->> 'last_payment_amount' IS NULL THEN NULL ELSE (p_values ->> 'last_payment_amount')::numeric END,
      last_payment_date = CASE WHEN p_values ->> 'last_payment_date' IS NULL THEN NULL ELSE (p_values ->> 'last_payment_date')::date END,
      updated_at = now()
    WHERE id = p_entity_id::uuid AND company_id = p_company_id;
  ELSIF p_command = 'inventory.sync_stock_level' THEN
    UPDATE public.inventory_stock_levels SET
      quantity_on_hand = (p_values ->> 'quantity_on_hand')::numeric,
      quantity_available = (p_values ->> 'quantity_available')::numeric,
      last_movement_at = CASE WHEN p_values ->> 'last_movement_at' IS NULL THEN NULL ELSE (p_values ->> 'last_movement_at')::timestamptz END,
      updated_at = now()
    WHERE id = p_entity_id::uuid AND company_id = p_company_id;
  ELSIF p_command = 'inventory.create_stock_level' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.inventory_items item
      WHERE item.id = (p_values ->> 'item_id')::uuid AND item.company_id = p_company_id
    ) OR NOT EXISTS (
      SELECT 1 FROM public.inventory_warehouses warehouse
      WHERE warehouse.id = (p_values ->> 'warehouse_id')::uuid AND warehouse.company_id = p_company_id
    ) THEN
      RAISE EXCEPTION 'Inventory item or warehouse is outside the active company';
    END IF;
    INSERT INTO public.inventory_stock_levels (
      company_id, item_id, warehouse_id, quantity_on_hand, quantity_reserved,
      quantity_available, last_movement_at, updated_at
    ) VALUES (
      p_company_id,
      (p_values ->> 'item_id')::uuid,
      (p_values ->> 'warehouse_id')::uuid,
      (p_values ->> 'quantity_on_hand')::numeric,
      COALESCE((p_values ->> 'quantity_reserved')::numeric, 0),
      (p_values ->> 'quantity_available')::numeric,
      CASE WHEN p_values ->> 'last_movement_at' IS NULL THEN NULL ELSE (p_values ->> 'last_movement_at')::timestamptz END,
      now()
    ) RETURNING id INTO v_created_id;
    v_repair_entity_id := v_created_id::text;
    v_rollback_metadata := v_rollback_metadata || jsonb_build_object('created_stock_level_id', v_created_id);
  ELSIF p_command = 'legal.sync_case_costs' THEN
    IF (p_values ->> 'total_costs')::numeric < 0 THEN RAISE EXCEPTION 'Legal case costs cannot be negative'; END IF;
    UPDATE public.legal_cases SET total_costs = (p_values ->> 'total_costs')::numeric, updated_at = now()
    WHERE id = p_entity_id::uuid AND company_id = p_company_id;
  ELSIF p_command = 'employee.sync_active_status' THEN
    IF (v_before ->> 'termination_date') IS NULL OR (v_before ->> 'termination_date')::date > current_date
       OR COALESCE((p_values ->> 'is_active')::boolean, true) THEN
      RAISE EXCEPTION 'Employee cannot be automatically deactivated from the supplied evidence';
    END IF;
    UPDATE public.employees SET
      is_active = false,
      account_status = COALESCE(p_values ->> 'account_status', 'inactive'),
      updated_at = now()
    WHERE id = p_entity_id::uuid AND company_id = p_company_id;
  ELSIF p_command = 'employee.sync_attendance_hours' THEN
    IF COALESCE((v_before ->> 'is_approved')::boolean, false)
       OR (p_values ->> 'total_hours')::numeric < 0 THEN
      RAISE EXCEPTION 'Approved or invalid attendance cannot be auto-repaired';
    END IF;
    UPDATE public.attendance_records SET total_hours = (p_values ->> 'total_hours')::numeric, updated_at = now()
    WHERE id = p_entity_id::uuid;
  ELSIF p_command = 'employee.sync_leave_balance' THEN
    IF (p_values ->> 'used_days')::numeric < 0 OR (p_values ->> 'remaining_days')::numeric < 0 THEN
      RAISE EXCEPTION 'Invalid leave balance';
    END IF;
    UPDATE public.leave_balances SET
      used_days = (p_values ->> 'used_days')::numeric,
      remaining_days = (p_values ->> 'remaining_days')::numeric,
      updated_at = now()
    WHERE id = p_entity_id::uuid;
  ELSIF p_command = 'employee.sync_payroll_net' THEN
    IF lower(COALESCE(v_before ->> 'status', '')) IN ('paid','posted','approved','completed')
       OR (p_values ->> 'net_amount')::numeric < 0 THEN
      RAISE EXCEPTION 'Posted payroll cannot be auto-repaired';
    END IF;
    UPDATE public.payroll SET net_amount = (p_values ->> 'net_amount')::numeric, updated_at = now()
    WHERE id = p_entity_id::uuid AND company_id = p_company_id;
  END IF;

  IF p_command = 'contract.recalculate_totals' THEN
    SELECT to_jsonb(c) INTO v_after FROM public.contracts c WHERE c.id = p_entity_id::uuid;
  ELSIF p_command IN ('invoice.recalculate_balance', 'invoice.sync_zero_impact_amount', 'invoice.cancel_zero_safe') THEN
    SELECT to_jsonb(i) INTO v_after FROM public.invoices i WHERE i.id = p_entity_id::uuid;
  ELSIF p_command IN ('schedule.sync_payment_state', 'schedule.link_invoice', 'contract.generate_missing_invoice') THEN
    SELECT to_jsonb(s) INTO v_after FROM public.contract_payment_schedules s WHERE s.id = p_entity_id::uuid;
  ELSIF p_command IN ('payment.correct_uncompleted_date', 'payment.link_clear_invoice') THEN
    SELECT to_jsonb(p) INTO v_after FROM public.payments p WHERE p.id = p_entity_id::uuid;
  ELSIF p_command = 'accounting.sync_draft_journal_totals' THEN
    SELECT to_jsonb(j) INTO v_after FROM public.journal_entries j WHERE j.id = p_entity_id::uuid;
  ELSIF p_command IN ('vehicle.sync_status', 'vehicle.sync_mileage') THEN
    SELECT to_jsonb(v) INTO v_after FROM public.vehicles v WHERE v.id = p_entity_id::uuid;
  ELSIF p_command = 'customer.sync_balance' THEN
    SELECT to_jsonb(cb) INTO v_after FROM public.customer_balances cb WHERE cb.id = p_entity_id::uuid;
  ELSIF p_command IN ('inventory.sync_stock_level', 'inventory.create_stock_level') THEN
    SELECT to_jsonb(sl) INTO v_after FROM public.inventory_stock_levels sl WHERE sl.id = COALESCE(v_created_id, p_entity_id::uuid);
  ELSIF p_command = 'legal.sync_case_costs' THEN
    SELECT to_jsonb(lc) INTO v_after FROM public.legal_cases lc WHERE lc.id = p_entity_id::uuid;
  ELSIF p_command = 'employee.sync_active_status' THEN
    SELECT to_jsonb(e) INTO v_after FROM public.employees e WHERE e.id = p_entity_id::uuid;
  ELSIF p_command = 'employee.sync_attendance_hours' THEN
    SELECT to_jsonb(a) INTO v_after FROM public.attendance_records a WHERE a.id = p_entity_id::uuid;
  ELSIF p_command = 'employee.sync_leave_balance' THEN
    SELECT to_jsonb(lb) INTO v_after FROM public.leave_balances lb WHERE lb.id = p_entity_id::uuid;
  ELSIF p_command = 'employee.sync_payroll_net' THEN
    SELECT to_jsonb(pr) INTO v_after FROM public.payroll pr WHERE pr.id = p_entity_id::uuid;
  END IF;

  IF p_command = 'inventory.create_stock_level' THEN
    v_before_values := jsonb_build_object('exists', false);
    v_after_values := jsonb_build_object(
      'exists', true,
      'quantity_on_hand', v_after -> 'quantity_on_hand',
      'quantity_available', v_after -> 'quantity_available',
      'last_movement_at', v_after -> 'last_movement_at'
    );
  ELSE
    v_after_values := public.system_agent_pick_fields(v_after, v_registry.allowed_fields);
  END IF;

  INSERT INTO public.system_agent_repairs (
    id, run_id, job_id, finding_id, company_id, domain, command,
    entity_table, entity_id, before_state, after_state, rollback_metadata
  ) VALUES (
    v_repair_id, p_run_id, p_job_id, p_finding_id, p_company_id, v_job.domain, p_command,
    v_registry.entity_table, v_repair_entity_id, v_before_values, v_after_values, v_rollback_metadata
  );

  UPDATE public.system_agent_findings
  SET status = 'repaired', repair_id = v_repair_id, error = NULL, updated_at = now()
  WHERE id = p_finding_id;

  RETURN jsonb_build_object(
    'repair_id', v_repair_id,
    'command', p_command,
    'entity_id', v_repair_entity_id,
    'before', v_before_values,
    'after', v_after_values
  );
END;
$$;

REVOKE ALL ON FUNCTION public.system_agent_apply_repair(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_apply_repair(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb)
  TO service_role;

CREATE OR REPLACE FUNCTION public.system_agent_rollback_repair(
  p_repair_id uuid,
  p_reason text DEFAULT 'System agent rollback'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_repair public.system_agent_repairs%ROWTYPE;
  v_registry public.system_agent_command_registry%ROWTYPE;
  v_current jsonb;
  v_current_values jsonb;
  v_effective_date date;
  v_created_invoice_id uuid;
BEGIN
  SELECT * INTO v_repair
  FROM public.system_agent_repairs
  WHERE id = p_repair_id
  FOR UPDATE;
  IF v_repair.id IS NULL OR v_repair.status <> 'applied' THEN
    RAISE EXCEPTION 'Repair is not in an applied state';
  END IF;

  SELECT * INTO v_registry
  FROM public.system_agent_command_registry
  WHERE command = v_repair.command AND reversible;
  IF v_registry.command IS NULL THEN
    RAISE EXCEPTION 'Repair command is no longer reversible';
  END IF;

  IF v_repair.command = 'contract.recalculate_totals' THEN
    SELECT to_jsonb(c), c.contract_date INTO v_current, v_effective_date
    FROM public.contracts c
    WHERE c.id = v_repair.entity_id::uuid AND c.company_id = v_repair.company_id
    FOR UPDATE;
  ELSIF v_repair.command IN ('invoice.recalculate_balance', 'invoice.sync_zero_impact_amount', 'invoice.cancel_zero_safe') THEN
    SELECT to_jsonb(i), i.invoice_date INTO v_current, v_effective_date
    FROM public.invoices i
    WHERE i.id = v_repair.entity_id::uuid AND i.company_id = v_repair.company_id
    FOR UPDATE;
  ELSIF v_repair.command IN ('schedule.sync_payment_state', 'schedule.link_invoice', 'contract.generate_missing_invoice') THEN
    SELECT to_jsonb(s), s.due_date INTO v_current, v_effective_date
    FROM public.contract_payment_schedules s
    WHERE s.id = v_repair.entity_id::uuid AND s.company_id = v_repair.company_id
    FOR UPDATE;
  ELSIF v_repair.command IN ('payment.correct_uncompleted_date', 'payment.link_clear_invoice') THEN
    SELECT to_jsonb(p), p.payment_date INTO v_current, v_effective_date
    FROM public.payments p
    WHERE p.id = v_repair.entity_id::uuid AND p.company_id = v_repair.company_id
    FOR UPDATE;
  ELSIF v_repair.command = 'accounting.sync_draft_journal_totals' THEN
    SELECT to_jsonb(j), j.entry_date INTO v_current, v_effective_date
    FROM public.journal_entries j
    WHERE j.id = v_repair.entity_id::uuid AND j.company_id = v_repair.company_id
    FOR UPDATE;
  ELSIF v_repair.command IN ('vehicle.sync_status', 'vehicle.sync_mileage') THEN
    SELECT to_jsonb(v) INTO v_current
    FROM public.vehicles v
    WHERE v.id = v_repair.entity_id::uuid AND v.company_id = v_repair.company_id
    FOR UPDATE;
  ELSIF v_repair.command = 'customer.sync_balance' THEN
    SELECT to_jsonb(cb) INTO v_current
    FROM public.customer_balances cb
    WHERE cb.id = v_repair.entity_id::uuid AND cb.company_id = v_repair.company_id
    FOR UPDATE;
  ELSIF v_repair.command IN ('inventory.sync_stock_level', 'inventory.create_stock_level') THEN
    SELECT to_jsonb(sl) INTO v_current
    FROM public.inventory_stock_levels sl
    WHERE sl.id = v_repair.entity_id::uuid AND sl.company_id = v_repair.company_id
    FOR UPDATE;
  ELSIF v_repair.command = 'legal.sync_case_costs' THEN
    SELECT to_jsonb(lc) INTO v_current
    FROM public.legal_cases lc
    WHERE lc.id = v_repair.entity_id::uuid AND lc.company_id = v_repair.company_id
    FOR UPDATE;
  ELSIF v_repair.command = 'employee.sync_active_status' THEN
    SELECT to_jsonb(e) INTO v_current
    FROM public.employees e
    WHERE e.id = v_repair.entity_id::uuid AND e.company_id = v_repair.company_id
    FOR UPDATE;
  ELSIF v_repair.command = 'employee.sync_attendance_hours' THEN
    SELECT to_jsonb(a) INTO v_current
    FROM public.attendance_records a
    JOIN public.employees e ON e.id = a.employee_id
    WHERE a.id = v_repair.entity_id::uuid AND e.company_id = v_repair.company_id
    FOR UPDATE OF a;
  ELSIF v_repair.command = 'employee.sync_leave_balance' THEN
    SELECT to_jsonb(lb) INTO v_current
    FROM public.leave_balances lb
    JOIN public.employees e ON e.id = lb.employee_id
    WHERE lb.id = v_repair.entity_id::uuid AND e.company_id = v_repair.company_id
    FOR UPDATE OF lb;
  ELSIF v_repair.command = 'employee.sync_payroll_net' THEN
    SELECT to_jsonb(pr), pr.payroll_date INTO v_current, v_effective_date
    FROM public.payroll pr
    WHERE pr.id = v_repair.entity_id::uuid AND pr.company_id = v_repair.company_id
    FOR UPDATE;
  ELSE
    RAISE EXCEPTION 'Rollback command has no static implementation';
  END IF;

  IF v_current IS NULL THEN
    RAISE EXCEPTION 'Repaired entity no longer exists';
  END IF;

  IF v_repair.command = 'inventory.create_stock_level' THEN
    v_current_values := jsonb_build_object(
      'exists', true,
      'quantity_on_hand', v_current -> 'quantity_on_hand',
      'quantity_available', v_current -> 'quantity_available',
      'last_movement_at', v_current -> 'last_movement_at'
    );
  ELSE
    v_current_values := public.system_agent_pick_fields(v_current, v_registry.allowed_fields);
  END IF;

  IF v_current_values IS DISTINCT FROM v_repair.after_state THEN
    RAISE EXCEPTION 'Entity changed after repair; rollback was safely aborted';
  END IF;
  IF v_registry.closed_period_policy = 'block'
     AND v_effective_date IS NOT NULL
     AND public.system_agent_date_in_closed_period(v_repair.company_id, v_effective_date)
  THEN
    RAISE EXCEPTION 'Rollback is blocked because the effective date is in a closed accounting period';
  END IF;

  IF v_repair.command = 'contract.recalculate_totals' THEN
    UPDATE public.contracts SET
      total_paid = (v_repair.before_state ->> 'total_paid')::numeric,
      balance_due = (v_repair.before_state ->> 'balance_due')::numeric,
      payment_status = v_repair.before_state ->> 'payment_status',
      updated_at = now()
    WHERE id = v_repair.entity_id::uuid AND company_id = v_repair.company_id;
  ELSIF v_repair.command = 'invoice.recalculate_balance' THEN
    UPDATE public.invoices SET
      paid_amount = (v_repair.before_state ->> 'paid_amount')::numeric,
      balance_due = (v_repair.before_state ->> 'balance_due')::numeric,
      payment_status = v_repair.before_state ->> 'payment_status',
      updated_at = now()
    WHERE id = v_repair.entity_id::uuid AND company_id = v_repair.company_id;
  ELSIF v_repair.command = 'invoice.sync_zero_impact_amount' THEN
    UPDATE public.invoices SET
      subtotal = (v_repair.before_state ->> 'subtotal')::numeric,
      total_amount = (v_repair.before_state ->> 'total_amount')::numeric,
      balance_due = (v_repair.before_state ->> 'balance_due')::numeric,
      payment_status = v_repair.before_state ->> 'payment_status',
      updated_at = now()
    WHERE id = v_repair.entity_id::uuid AND company_id = v_repair.company_id;
  ELSIF v_repair.command = 'invoice.cancel_zero_safe' THEN
    UPDATE public.invoices SET
      status = v_repair.before_state ->> 'status',
      payment_status = v_repair.before_state ->> 'payment_status',
      balance_due = (v_repair.before_state ->> 'balance_due')::numeric,
      updated_at = now()
    WHERE id = v_repair.entity_id::uuid AND company_id = v_repair.company_id;
  ELSIF v_repair.command = 'schedule.sync_payment_state' THEN
    UPDATE public.contract_payment_schedules SET
      paid_amount = (v_repair.before_state ->> 'paid_amount')::numeric,
      status = v_repair.before_state ->> 'status',
      paid_date = CASE WHEN v_repair.before_state ->> 'paid_date' IS NULL THEN NULL ELSE (v_repair.before_state ->> 'paid_date')::date END,
      updated_at = now()
    WHERE id = v_repair.entity_id::uuid AND company_id = v_repair.company_id;
  ELSIF v_repair.command = 'schedule.link_invoice' THEN
    UPDATE public.contract_payment_schedules SET
      invoice_id = CASE WHEN v_repair.before_state ->> 'invoice_id' IS NULL THEN NULL ELSE (v_repair.before_state ->> 'invoice_id')::uuid END,
      updated_at = now()
    WHERE id = v_repair.entity_id::uuid AND company_id = v_repair.company_id;
  ELSIF v_repair.command = 'contract.generate_missing_invoice' THEN
    v_created_invoice_id := (v_repair.rollback_metadata ->> 'created_invoice_id')::uuid;
    IF v_created_invoice_id IS NULL
       OR (v_current ->> 'invoice_id')::uuid IS DISTINCT FROM v_created_invoice_id
       OR EXISTS (
         SELECT 1 FROM public.payments p
         WHERE p.company_id = v_repair.company_id AND p.invoice_id = v_created_invoice_id
           AND lower(COALESCE(p.payment_status, '')) NOT IN ('cancelled','canceled','void','voided','failed','reversed','refunded')
       )
       OR EXISTS (
         SELECT 1 FROM public.invoices i
         WHERE i.id = v_created_invoice_id
           AND abs(COALESCE(i.paid_amount, 0)) > 0.01
       )
    THEN
      RAISE EXCEPTION 'Generated invoice gained financial impact and cannot be rolled back automatically';
    END IF;
    UPDATE public.contract_payment_schedules SET
      invoice_id = CASE WHEN v_repair.before_state ->> 'invoice_id' IS NULL THEN NULL ELSE (v_repair.before_state ->> 'invoice_id')::uuid END,
      updated_at = now()
    WHERE id = v_repair.entity_id::uuid AND company_id = v_repair.company_id;
    PERFORM public.cancel_invoice_with_reversal(
      v_created_invoice_id,
      v_repair.company_id,
      'Rollback of system-agent generated invoice'
    );
  ELSIF v_repair.command = 'payment.correct_uncompleted_date' THEN
    IF lower(COALESCE(v_current ->> 'payment_status', '')) IN ('completed','paid','success','succeeded') THEN
      RAISE EXCEPTION 'Payment was completed after repair and cannot be rolled back automatically';
    END IF;
    UPDATE public.payments SET payment_date = (v_repair.before_state ->> 'payment_date')::date, updated_at = now()
    WHERE id = v_repair.entity_id::uuid AND company_id = v_repair.company_id;
  ELSIF v_repair.command = 'payment.link_clear_invoice' THEN
    IF (v_current ->> 'journal_entry_id') IS DISTINCT FROM (v_repair.after_state ->> 'journal_entry_id') THEN
      RAISE EXCEPTION 'Payment journal changed after repair';
    END IF;
    UPDATE public.payments SET
      invoice_id = CASE WHEN v_repair.before_state ->> 'invoice_id' IS NULL THEN NULL ELSE (v_repair.before_state ->> 'invoice_id')::uuid END,
      updated_at = now()
    WHERE id = v_repair.entity_id::uuid AND company_id = v_repair.company_id;
  ELSIF v_repair.command = 'accounting.sync_draft_journal_totals' THEN
    IF lower(COALESCE(v_current ->> 'status', '')) NOT IN ('draft','pending') THEN
      RAISE EXCEPTION 'Journal entry was posted after repair';
    END IF;
    UPDATE public.journal_entries SET
      total_debit = (v_repair.before_state ->> 'total_debit')::numeric,
      total_credit = (v_repair.before_state ->> 'total_credit')::numeric,
      updated_at = now()
    WHERE id = v_repair.entity_id::uuid AND company_id = v_repair.company_id;
  ELSIF v_repair.command = 'vehicle.sync_status' THEN
    UPDATE public.vehicles SET status = (v_repair.before_state ->> 'status')::public.vehicle_status, updated_at = now()
    WHERE id = v_repair.entity_id::uuid AND company_id = v_repair.company_id;
  ELSIF v_repair.command = 'vehicle.sync_mileage' THEN
    UPDATE public.vehicles SET
      current_mileage = (v_repair.before_state ->> 'current_mileage')::numeric,
      odometer_reading = (v_repair.before_state ->> 'odometer_reading')::numeric,
      updated_at = now()
    WHERE id = v_repair.entity_id::uuid AND company_id = v_repair.company_id;
  ELSIF v_repair.command = 'customer.sync_balance' THEN
    UPDATE public.customer_balances SET
      current_balance = (v_repair.before_state ->> 'current_balance')::numeric,
      overdue_amount = (v_repair.before_state ->> 'overdue_amount')::numeric,
      days_overdue = (v_repair.before_state ->> 'days_overdue')::integer,
      last_payment_amount = CASE WHEN v_repair.before_state ->> 'last_payment_amount' IS NULL THEN NULL ELSE (v_repair.before_state ->> 'last_payment_amount')::numeric END,
      last_payment_date = CASE WHEN v_repair.before_state ->> 'last_payment_date' IS NULL THEN NULL ELSE (v_repair.before_state ->> 'last_payment_date')::date END,
      updated_at = now()
    WHERE id = v_repair.entity_id::uuid AND company_id = v_repair.company_id;
  ELSIF v_repair.command = 'inventory.sync_stock_level' THEN
    UPDATE public.inventory_stock_levels SET
      quantity_on_hand = (v_repair.before_state ->> 'quantity_on_hand')::numeric,
      quantity_available = (v_repair.before_state ->> 'quantity_available')::numeric,
      last_movement_at = CASE WHEN v_repair.before_state ->> 'last_movement_at' IS NULL THEN NULL ELSE (v_repair.before_state ->> 'last_movement_at')::timestamptz END,
      updated_at = now()
    WHERE id = v_repair.entity_id::uuid AND company_id = v_repair.company_id;
  ELSIF v_repair.command = 'inventory.create_stock_level' THEN
    DELETE FROM public.inventory_stock_levels
    WHERE id = v_repair.entity_id::uuid AND company_id = v_repair.company_id;
  ELSIF v_repair.command = 'legal.sync_case_costs' THEN
    UPDATE public.legal_cases SET total_costs = (v_repair.before_state ->> 'total_costs')::numeric, updated_at = now()
    WHERE id = v_repair.entity_id::uuid AND company_id = v_repair.company_id;
  ELSIF v_repair.command = 'employee.sync_active_status' THEN
    UPDATE public.employees SET
      is_active = (v_repair.before_state ->> 'is_active')::boolean,
      account_status = v_repair.before_state ->> 'account_status',
      updated_at = now()
    WHERE id = v_repair.entity_id::uuid AND company_id = v_repair.company_id;
  ELSIF v_repair.command = 'employee.sync_attendance_hours' THEN
    IF COALESCE((v_current ->> 'is_approved')::boolean, false) THEN
      RAISE EXCEPTION 'Attendance was approved after repair';
    END IF;
    UPDATE public.attendance_records SET
      total_hours = (v_repair.before_state ->> 'total_hours')::numeric,
      updated_at = now()
    WHERE id = v_repair.entity_id::uuid;
  ELSIF v_repair.command = 'employee.sync_leave_balance' THEN
    UPDATE public.leave_balances SET
      used_days = (v_repair.before_state ->> 'used_days')::numeric,
      remaining_days = (v_repair.before_state ->> 'remaining_days')::numeric,
      updated_at = now()
    WHERE id = v_repair.entity_id::uuid;
  ELSIF v_repair.command = 'employee.sync_payroll_net' THEN
    IF lower(COALESCE(v_current ->> 'status', '')) IN ('paid','posted','approved','completed') THEN
      RAISE EXCEPTION 'Payroll was posted after repair';
    END IF;
    UPDATE public.payroll SET net_amount = (v_repair.before_state ->> 'net_amount')::numeric, updated_at = now()
    WHERE id = v_repair.entity_id::uuid AND company_id = v_repair.company_id;
  END IF;

  UPDATE public.system_agent_repairs
  SET status = 'rolled_back', rolled_back_at = now(), rollback_reason = left(COALESCE(p_reason, 'System agent rollback'), 1000), updated_at = now()
  WHERE id = p_repair_id;
  UPDATE public.system_agent_findings
  SET status = 'rolled_back', updated_at = now()
  WHERE id = v_repair.finding_id;

  RETURN jsonb_build_object('repair_id', p_repair_id, 'status', 'rolled_back');
END;
$$;

REVOKE ALL ON FUNCTION public.system_agent_rollback_repair(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_rollback_repair(uuid,text) TO service_role;

COMMENT ON TABLE public.system_agent_runs IS 'Top-level executions for the resumable system-wide audit agent.';
COMMENT ON TABLE public.system_agent_jobs IS 'Company/domain jobs with leases, cursors, and retries.';
COMMENT ON TABLE public.system_agent_findings IS 'Typed invariant violations detected by specialized workers.';
COMMENT ON TABLE public.system_agent_repairs IS 'Before/after repair records and rollback metadata.';
COMMENT ON FUNCTION public.system_agent_apply_repair(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb) IS
'Only mutation gateway for the system audit agent. Commands are static, company-scoped, optimistic, and reversible.';
