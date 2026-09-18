-- Completes the cross-agent failure-containment layer: mutation budgets,
-- evidence version conflicts, stale OCR quarantine, direct legal-document
-- ownership, secure upload tokens and operational escalation.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $preflight$
BEGIN
  IF to_regclass('public.agent_safety_policies') IS NULL
     OR to_regclass('public.agent_safety_events') IS NULL
     OR to_regclass('public.missing_contract_pdf_requests') IS NULL
     OR to_regclass('public.contract_documents') IS NULL
     OR to_regclass('public.lawsuit_preparations') IS NULL
     OR to_regclass('public.taqadi_filing_jobs') IS NULL
     OR to_regprocedure('public.verify_scheduled_agent_invocation_v2(text,uuid,text,text)') IS NULL
     OR to_regprocedure('public.upsert_agent_operational_alert_task_v1(uuid,text,text,text,text,boolean)') IS NULL
  THEN
    RAISE EXCEPTION 'Agent safety kernel, legal evidence and operational alerts must exist';
  END IF;
END;
$preflight$;

ALTER TABLE public.agent_safety_policies
  ADD COLUMN max_mutations_per_run integer NOT NULL DEFAULT 100
    CHECK (max_mutations_per_run BETWEEN 0 AND 10000),
  ADD COLUMN max_findings_per_run integer NOT NULL DEFAULT 5000
    CHECK (max_findings_per_run BETWEEN 0 AND 100000),
  ADD COLUMN max_attempts integer NOT NULL DEFAULT 5
    CHECK (max_attempts BETWEEN 1 AND 20),
  ADD COLUMN requires_before_after boolean NOT NULL DEFAULT true,
  ADD COLUMN requires_postcondition boolean NOT NULL DEFAULT true,
  ADD COLUMN escalation_after interval NOT NULL DEFAULT interval '1 hour'
    CHECK (escalation_after BETWEEN interval '1 minute' AND interval '30 days'),
  ADD COLUMN data_classification text NOT NULL DEFAULT 'internal'
    CHECK (data_classification IN ('public', 'internal', 'confidential', 'restricted')),
  ADD COLUMN execution_ledger_enabled boolean NOT NULL DEFAULT false;

UPDATE public.agent_safety_policies
SET max_mutations_per_run = CASE agent_id
      WHEN 'system-audit-orchestrator' THEN 100
      WHEN 'daily-invoice-generation' THEN 250
      WHEN 'monthly-contract-invoice-reconciliation' THEN 100
      WHEN 'missing-contract-pdf-agent' THEN 50
      WHEN 'legal-notice-agent' THEN 50
      WHEN 'taqadi-filing-agent' THEN 1
      WHEN 'close-stale-system-audit-reviews' THEN 10000
      ELSE LEAST(max_mutations_per_run, 100)
    END,
    max_attempts = CASE agent_id
      WHEN 'taqadi-filing-agent' THEN 3
      WHEN 'legal-notice-agent' THEN 3
      WHEN 'missing-contract-pdf-agent' THEN 5
      ELSE max_attempts
    END,
    data_classification = CASE
      WHEN risk_level IN ('critical', 'high') THEN 'restricted'
      ELSE 'internal'
    END,
    updated_at = now();

UPDATE public.agent_safety_policies
SET execution_ledger_enabled = true, updated_at = now()
WHERE agent_id IN (
  'missing-contract-pdf-agent',
  'legal-notice-agent',
  'smart-contract-assigner'
);

-- Authenticated/manual and trusted service-role calls must obey the same
-- policy switch and conflict lease as scheduled calls. The Edge function owns
-- the hard-coded agent id; a user cannot select an arbitrary policy.
CREATE OR REPLACE FUNCTION public.begin_trusted_agent_invocation_v1(
  p_agent_id text,
  p_company_id uuid,
  p_request_id text,
  p_actor_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_policy public.agent_safety_policies%ROWTYPE;
  v_request_id text := NULLIF(pg_catalog.left(BTRIM(COALESCE(p_request_id, '')), 200), '');
  v_claimed boolean := false;
BEGIN
  IF p_company_id IS NULL OR v_request_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT * INTO v_policy
  FROM public.agent_safety_policies policy
  WHERE policy.agent_id = p_agent_id;

  -- There is no valid FK target for an unknown agent, so fail closed without
  -- fabricating an audit row under a different identity.
  IF v_policy.agent_id IS NULL THEN
    RETURN false;
  END IF;

  IF p_actor_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.user_roles role
       WHERE role.user_id = p_actor_id AND role.role = 'super_admin'
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.profiles profile
       WHERE profile.user_id = p_actor_id
         AND profile.company_id = p_company_id
         AND profile.is_active = true
     ) THEN
    INSERT INTO public.agent_safety_events (
      company_id, agent_id, request_id, operation, outcome, reason_code, evidence
    ) VALUES (
      p_company_id, p_agent_id, v_request_id, 'trusted_invocation', 'blocked',
      'company_scope_denied', jsonb_build_object('source', 'authenticated_user')
    );
    RETURN false;
  END IF;

  IF NOT v_policy.enabled THEN
    INSERT INTO public.agent_safety_events (
      company_id, agent_id, request_id, operation, outcome, reason_code, evidence
    ) VALUES (
      p_company_id, p_agent_id, v_request_id, 'trusted_invocation', 'blocked',
      'policy_disabled',
      jsonb_build_object('source', CASE WHEN p_actor_id IS NULL THEN 'service_role' ELSE 'authenticated_user' END)
    );
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.agent_invocation_leases lease
    WHERE lease.company_id = p_company_id
      AND lease.conflict_group = v_policy.conflict_group
      AND lease.agent_id = p_agent_id
      AND lease.request_id = v_request_id
      AND lease.expires_at > now()
  ) THEN
    INSERT INTO public.agent_safety_events (
      company_id, agent_id, request_id, operation, outcome, reason_code, evidence
    ) VALUES (
      p_company_id, p_agent_id, v_request_id, 'trusted_invocation', 'duplicate',
      'same_request_already_claimed', '{}'::jsonb
    );
    -- A repeated active request is not a fresh authorization. Returning true
    -- here would let concurrent HTTP replays execute the same manual action.
    RETURN false;
  END IF;

  INSERT INTO public.agent_invocation_leases (
    company_id, conflict_group, agent_id, request_id, expires_at
  ) VALUES (
    p_company_id, v_policy.conflict_group, p_agent_id, v_request_id,
    now() + make_interval(secs => v_policy.max_runtime_seconds)
  )
  ON CONFLICT (company_id, conflict_group) DO UPDATE
  SET agent_id = EXCLUDED.agent_id,
      request_id = EXCLUDED.request_id,
      claimed_at = now(),
      expires_at = EXCLUDED.expires_at
  WHERE public.agent_invocation_leases.expires_at <= now()
  RETURNING true INTO v_claimed;

  INSERT INTO public.agent_safety_events (
    company_id, agent_id, request_id, operation, outcome, reason_code, evidence
  ) VALUES (
    p_company_id, p_agent_id, v_request_id, 'trusted_invocation',
    CASE WHEN v_claimed THEN 'allowed' ELSE 'busy' END,
    CASE WHEN v_claimed THEN 'policy_and_scope_valid' ELSE 'conflict_group_lease_active' END,
    jsonb_build_object('source', CASE WHEN p_actor_id IS NULL THEN 'service_role' ELSE 'authenticated_user' END)
  );

  RETURN v_claimed;
END;
$function$;

REVOKE ALL ON FUNCTION public.begin_trusted_agent_invocation_v1(text,uuid,text,uuid)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.begin_trusted_agent_invocation_v1(text,uuid,text,uuid)
TO service_role;

-- Customer merging moves records across several business tables. Keep the
-- entire accepted proposal in one database transaction so a constraint error
-- cannot leave half the customer's records under each identity.
CREATE OR REPLACE FUNCTION public.apply_customer_merge_proposal_v1(
  p_company_id uuid,
  p_proposal_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_proposal public.customer_merge_proposals%ROWTYPE;
  v_count integer;
  v_contracts integer := 0;
  v_invoices integer := 0;
  v_payments integer := 0;
  v_penalties integer := 0;
  v_communications integer := 0;
  v_legal_cases integer := 0;
BEGIN
  SELECT * INTO v_proposal
  FROM public.customer_merge_proposals proposal
  WHERE proposal.id = p_proposal_id
    AND proposal.company_id = p_company_id
    AND proposal.status = 'pending'
  FOR UPDATE;

  IF v_proposal.id IS NULL THEN
    RAISE EXCEPTION 'CUSTOMER_MERGE_PROPOSAL_NOT_PENDING' USING ERRCODE = 'P0001';
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.customers customer
  WHERE customer.company_id = p_company_id
    AND customer.id IN (
      v_proposal.primary_customer_id,
      v_proposal.duplicate_customer_id
    )
    AND customer.merged_into_customer_id IS NULL;
  IF v_count <> 2 THEN
    RAISE EXCEPTION 'CUSTOMER_MERGE_PARTY_SCOPE_OR_STATE_INVALID' USING ERRCODE = '23514';
  END IF;

  PERFORM customer.id
  FROM public.customers customer
  WHERE customer.company_id = p_company_id
    AND customer.id IN (
      v_proposal.primary_customer_id,
      v_proposal.duplicate_customer_id
    )
  ORDER BY customer.id
  FOR UPDATE;

  UPDATE public.contracts
  SET customer_id = v_proposal.primary_customer_id
  WHERE company_id = p_company_id
    AND customer_id = v_proposal.duplicate_customer_id;
  GET DIAGNOSTICS v_contracts = ROW_COUNT;

  UPDATE public.invoices
  SET customer_id = v_proposal.primary_customer_id
  WHERE company_id = p_company_id
    AND customer_id = v_proposal.duplicate_customer_id;
  GET DIAGNOSTICS v_invoices = ROW_COUNT;

  UPDATE public.payments
  SET customer_id = v_proposal.primary_customer_id
  WHERE company_id = p_company_id
    AND customer_id = v_proposal.duplicate_customer_id;
  GET DIAGNOSTICS v_payments = ROW_COUNT;

  UPDATE public.penalties
  SET customer_id = v_proposal.primary_customer_id
  WHERE company_id = p_company_id
    AND customer_id = v_proposal.duplicate_customer_id;
  GET DIAGNOSTICS v_penalties = ROW_COUNT;

  UPDATE public.customer_communications
  SET customer_id = v_proposal.primary_customer_id
  WHERE company_id = p_company_id
    AND customer_id = v_proposal.duplicate_customer_id;
  GET DIAGNOSTICS v_communications = ROW_COUNT;

  UPDATE public.legal_cases
  SET client_id = v_proposal.primary_customer_id
  WHERE company_id = p_company_id
    AND client_id = v_proposal.duplicate_customer_id;
  GET DIAGNOSTICS v_legal_cases = ROW_COUNT;

  UPDATE public.customers
  SET merged_into_customer_id = v_proposal.primary_customer_id,
      updated_at = now()
  WHERE id = v_proposal.duplicate_customer_id
    AND company_id = p_company_id
    AND merged_into_customer_id IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CUSTOMER_MERGE_DUPLICATE_CHANGED_DURING_APPLY' USING ERRCODE = '40001';
  END IF;

  UPDATE public.customer_merge_proposals
  SET status = 'accepted', reviewed_at = now(), updated_at = now()
  WHERE id = v_proposal.id
    AND company_id = p_company_id
    AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CUSTOMER_MERGE_PROPOSAL_CHANGED_DURING_APPLY' USING ERRCODE = '40001';
  END IF;

  RETURN jsonb_build_object(
    'merged', true,
    'primaryCustomerId', v_proposal.primary_customer_id,
    'duplicateCustomerId', v_proposal.duplicate_customer_id,
    'moved', jsonb_build_object(
      'contracts', v_contracts,
      'invoices', v_invoices,
      'payments', v_payments,
      'penalties', v_penalties,
      'customer_communications', v_communications,
      'legal_cases', v_legal_cases
    )
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.apply_customer_merge_proposal_v1(uuid,uuid)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_customer_merge_proposal_v1(uuid,uuid)
TO service_role;

CREATE TABLE public.agent_execution_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  agent_id text NOT NULL REFERENCES public.agent_safety_policies(agent_id) ON DELETE RESTRICT,
  request_id text NOT NULL,
  status text NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'succeeded', 'failed', 'blocked', 'timed_out')),
  mutation_count integer NOT NULL DEFAULT 0 CHECK (mutation_count >= 0),
  finding_count integer NOT NULL DEFAULT 0 CHECK (finding_count >= 0),
  attempt_count integer NOT NULL DEFAULT 1 CHECK (attempt_count >= 1),
  started_at timestamptz NOT NULL DEFAULT now(),
  heartbeat_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  failure_code text,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (company_id, agent_id, request_id)
);

CREATE TABLE public.agent_execution_mutations (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES public.agent_execution_runs(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  agent_id text NOT NULL REFERENCES public.agent_safety_policies(agent_id) ON DELETE RESTRICT,
  operation text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  idempotency_key text NOT NULL,
  before_state jsonb NOT NULL,
  after_state jsonb NOT NULL,
  postcondition jsonb NOT NULL,
  verified boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, agent_id, idempotency_key),
  CHECK (before_state IS DISTINCT FROM after_state),
  CHECK (jsonb_typeof(postcondition) = 'object')
);

CREATE INDEX agent_execution_runs_active_idx
  ON public.agent_execution_runs(company_id, agent_id, started_at DESC)
  WHERE status = 'running';
CREATE INDEX agent_execution_mutations_run_idx
  ON public.agent_execution_mutations(run_id, created_at);

ALTER TABLE public.agent_execution_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_execution_mutations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.agent_execution_runs, public.agent_execution_mutations
FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.agent_execution_runs TO service_role;
GRANT SELECT, INSERT ON TABLE public.agent_execution_mutations TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.agent_execution_mutations_id_seq TO service_role;

CREATE OR REPLACE FUNCTION public.record_agent_mutation_v1(
  p_company_id uuid,
  p_agent_id text,
  p_request_id text,
  p_operation text,
  p_entity_type text,
  p_entity_id text,
  p_idempotency_key text,
  p_before_state jsonb,
  p_after_state jsonb,
  p_postcondition jsonb,
  p_verified boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_run public.agent_execution_runs%ROWTYPE;
  v_policy public.agent_safety_policies%ROWTYPE;
  v_mutation public.agent_execution_mutations%ROWTYPE;
BEGIN
  IF NULLIF(BTRIM(COALESCE(p_idempotency_key, '')), '') IS NULL
     OR NULLIF(BTRIM(COALESCE(p_entity_id, '')), '') IS NULL THEN
    RAISE EXCEPTION 'AGENT_MUTATION_IDENTITY_REQUIRED' USING ERRCODE = '23514';
  END IF;

  SELECT run, policy
  INTO v_run, v_policy
  FROM public.agent_execution_runs run
  JOIN public.agent_safety_policies policy ON policy.agent_id = run.agent_id
  WHERE run.company_id = p_company_id
    AND run.agent_id = p_agent_id
    AND run.request_id = p_request_id
    AND run.status = 'running'
    AND policy.enabled = true
  FOR UPDATE OF run;

  IF v_run.id IS NULL THEN
    RAISE EXCEPTION 'AGENT_EXECUTION_RUN_NOT_ACTIVE' USING ERRCODE = 'P0001';
  END IF;
  IF v_run.mutation_count >= v_policy.max_mutations_per_run THEN
    UPDATE public.agent_execution_runs
    SET status = 'blocked', finished_at = now(), failure_code = 'mutation_budget_exhausted'
    WHERE id = v_run.id;
    DELETE FROM public.agent_invocation_leases lease
    WHERE lease.company_id = p_company_id
      AND lease.agent_id = p_agent_id
      AND lease.request_id = p_request_id;
    RETURN jsonb_build_object(
      'recorded', false,
      'blocked', true,
      'reason', 'AGENT_MUTATION_BUDGET_EXHAUSTED',
      'mutationCount', v_run.mutation_count,
      'remaining', 0
    );
  END IF;
  IF v_policy.requires_before_after
     AND (p_before_state IS NULL OR p_after_state IS NULL OR p_before_state = p_after_state) THEN
    RAISE EXCEPTION 'AGENT_BEFORE_AFTER_EVIDENCE_REQUIRED' USING ERRCODE = '23514';
  END IF;
  IF v_policy.requires_postcondition
     AND (NOT COALESCE(p_verified, false) OR p_postcondition IS NULL OR p_postcondition = '{}'::jsonb) THEN
    RAISE EXCEPTION 'AGENT_POSTCONDITION_VERIFICATION_REQUIRED' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.agent_execution_mutations (
    run_id, company_id, agent_id, operation, entity_type, entity_id,
    idempotency_key, before_state, after_state, postcondition, verified
  ) VALUES (
    v_run.id, p_company_id, p_agent_id, p_operation, p_entity_type, p_entity_id,
    p_idempotency_key, p_before_state, p_after_state, p_postcondition, p_verified
  )
  ON CONFLICT (company_id, agent_id, idempotency_key) DO NOTHING
  RETURNING * INTO v_mutation;

  IF v_mutation.id IS NULL THEN
    RETURN jsonb_build_object('recorded', false, 'duplicate', true);
  END IF;

  UPDATE public.agent_execution_runs
  SET mutation_count = mutation_count + 1, heartbeat_at = now()
  WHERE id = v_run.id;

  RETURN jsonb_build_object(
    'recorded', true,
    'mutationId', v_mutation.id,
    'mutationCount', v_run.mutation_count + 1,
    'remaining', v_policy.max_mutations_per_run - v_run.mutation_count - 1
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.record_agent_mutation_v1(uuid,text,text,text,text,text,text,jsonb,jsonb,jsonb,boolean)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_agent_mutation_v1(uuid,text,text,text,text,text,text,jsonb,jsonb,jsonb,boolean)
TO service_role;

CREATE OR REPLACE FUNCTION public.finish_agent_execution_v1(
  p_company_id uuid,
  p_agent_id text,
  p_request_id text,
  p_success boolean,
  p_summary jsonb DEFAULT '{}'::jsonb,
  p_failure_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_run public.agent_execution_runs%ROWTYPE;
BEGIN
  UPDATE public.agent_execution_runs
  SET status = CASE WHEN p_success THEN 'succeeded' ELSE 'failed' END,
      summary = COALESCE(p_summary, '{}'::jsonb),
      failure_code = CASE WHEN p_success THEN NULL ELSE COALESCE(NULLIF(p_failure_code, ''), 'agent_failed') END,
      heartbeat_at = now(),
      finished_at = now()
  WHERE company_id = p_company_id
    AND agent_id = p_agent_id
    AND request_id = p_request_id
    AND status = 'running'
  RETURNING * INTO v_run;
  -- Release the exact lease even when this policy does not use the detailed
  -- execution ledger. This avoids successful review/proposal agents remaining
  -- artificially busy until max_runtime_seconds expires.
  DELETE FROM public.agent_invocation_leases lease
  USING public.agent_safety_policies policy
  WHERE policy.agent_id = p_agent_id
    AND lease.company_id = p_company_id
    AND lease.conflict_group = policy.conflict_group
    AND lease.agent_id = p_agent_id
    AND lease.request_id = p_request_id;
  RETURN COALESCE(to_jsonb(v_run), jsonb_build_object('status', 'already_terminal'));
END;
$function$;

REVOKE ALL ON FUNCTION public.finish_agent_execution_v1(uuid,text,text,boolean,jsonb,text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finish_agent_execution_v1(uuid,text,text,boolean,jsonb,text)
TO service_role;

CREATE OR REPLACE FUNCTION public.timeout_stale_agent_executions_v1(
  p_company_id uuid,
  p_limit integer DEFAULT 100
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_run record;
  v_timed_out integer := 0;
BEGIN
  FOR v_run IN
    SELECT run.id, run.agent_id, run.request_id, run.heartbeat_at
    FROM public.agent_execution_runs run
    JOIN public.agent_safety_policies policy ON policy.agent_id = run.agent_id
    WHERE run.company_id = p_company_id
      AND run.status = 'running'
      AND run.heartbeat_at <= now()
        - pg_catalog.make_interval(secs => policy.max_runtime_seconds + 300)
    ORDER BY run.heartbeat_at, run.id
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500)
    FOR UPDATE OF run SKIP LOCKED
  LOOP
    UPDATE public.agent_execution_runs
    SET status = 'timed_out',
        failure_code = 'execution_heartbeat_expired',
        finished_at = now(),
        summary = summary || jsonb_build_object(
          'timedOutAt', now(),
          'lastHeartbeatAt', v_run.heartbeat_at
        )
    WHERE id = v_run.id;
    DELETE FROM public.agent_invocation_leases lease
    USING public.agent_safety_policies policy
    WHERE policy.agent_id = v_run.agent_id
      AND lease.company_id = p_company_id
      AND lease.conflict_group = policy.conflict_group
      AND lease.agent_id = v_run.agent_id
      AND lease.request_id = v_run.request_id;
    PERFORM public.upsert_agent_operational_alert_task_v1(
      p_company_id,
      'agent-execution-timeout:' || v_run.agent_id || ':' || v_run.request_id,
      'توقف تشغيل الوكيل ' || v_run.agent_id,
      'لم يغلق الوكيل تشغيله ولم يرسل heartbeat ضمن مهلة السياسة. راجع السجل قبل إعادة التشغيل.',
      'high',
      true
    );
    v_timed_out := v_timed_out + 1;
  END LOOP;
  RETURN jsonb_build_object('timedOut', v_timed_out);
END;
$function$;

REVOKE ALL ON FUNCTION public.timeout_stale_agent_executions_v1(uuid,integer)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.timeout_stale_agent_executions_v1(uuid,integer)
TO service_role;

-- Every accepted scheduled invocation receives a durable execution identity.
CREATE OR REPLACE FUNCTION public.guard_agent_execution_run_from_safety_event_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
  IF NEW.operation IN ('scheduled_invocation', 'trusted_invocation')
     AND NEW.outcome = 'allowed'
     AND NEW.company_id IS NOT NULL AND NEW.request_id IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM public.agent_safety_policies policy
       WHERE policy.agent_id = NEW.agent_id
         AND policy.execution_ledger_enabled = true
     ) THEN
    INSERT INTO public.agent_execution_runs (company_id, agent_id, request_id)
    VALUES (NEW.company_id, NEW.agent_id, NEW.request_id)
    ON CONFLICT (company_id, agent_id, request_id) DO UPDATE
    SET attempt_count = public.agent_execution_runs.attempt_count + 1,
        heartbeat_at = now()
    WHERE public.agent_execution_runs.status = 'running';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_agent_execution_run_from_safety_event
AFTER INSERT ON public.agent_safety_events
FOR EACH ROW EXECUTE FUNCTION public.guard_agent_execution_run_from_safety_event_v1();

REVOKE ALL ON FUNCTION public.guard_agent_execution_run_from_safety_event_v1()
FROM PUBLIC, anon, authenticated;

-- System-audit repairs already carry run/job/finding and before/after state.
-- Enforce the central mutation budget at the database boundary as well.
CREATE OR REPLACE FUNCTION public.guard_system_agent_repair_budget_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  v_limit integer;
  v_count integer;
BEGIN
  SELECT policy.max_mutations_per_run INTO v_limit
  FROM public.agent_safety_policies policy
  WHERE policy.agent_id = 'system-audit-orchestrator' AND policy.enabled = true;
  IF v_limit IS NULL THEN
    RAISE EXCEPTION 'SYSTEM_AUDIT_SAFETY_POLICY_DISABLED' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.before_state IS NULL OR NEW.after_state IS NULL
     OR NEW.before_state = NEW.after_state THEN
    RAISE EXCEPTION 'SYSTEM_AGENT_REPAIR_REQUIRES_DISTINCT_BEFORE_AFTER' USING ERRCODE = '23514';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(NEW.run_id::text, 918272)
  );
  SELECT count(*) INTO v_count
  FROM public.system_agent_repairs repair
  WHERE repair.run_id = NEW.run_id AND repair.status = 'applied';
  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'SYSTEM_AGENT_REPAIR_MUTATION_BUDGET_EXHAUSTED' USING ERRCODE = '54000';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_guard_system_agent_repair_budget
BEFORE INSERT ON public.system_agent_repairs
FOR EACH ROW EXECUTE FUNCTION public.guard_system_agent_repair_budget_v1();

REVOKE ALL ON FUNCTION public.guard_system_agent_repair_budget_v1()
FROM PUBLIC, anon, authenticated;

-- Findings are useful only while operators can consume them. Serialize each
-- run's inserts and stop a runaway rule at the configured ceiling instead of
-- allowing another six-figure alert flood.
CREATE OR REPLACE FUNCTION public.guard_system_agent_finding_budget_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  v_limit integer;
  v_count integer;
BEGIN
  SELECT policy.max_findings_per_run INTO v_limit
  FROM public.agent_safety_policies policy
  WHERE policy.agent_id = 'system-audit-orchestrator' AND policy.enabled = true;
  IF v_limit IS NULL THEN
    RAISE EXCEPTION 'SYSTEM_AUDIT_SAFETY_POLICY_DISABLED' USING ERRCODE = 'P0001';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(NEW.run_id::text, 918273)
  );
  SELECT count(*) INTO v_count
  FROM public.system_agent_findings finding
  WHERE finding.run_id = NEW.run_id;
  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'SYSTEM_AGENT_FINDING_BUDGET_EXHAUSTED'
      USING ERRCODE = '54000',
            DETAIL = 'Run finding cap reached; the worker will fail and the operational alert bridge will escalate it.';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_guard_system_agent_finding_budget
BEFORE INSERT ON public.system_agent_findings
FOR EACH ROW EXECUTE FUNCTION public.guard_system_agent_finding_budget_v1();

REVOKE ALL ON FUNCTION public.guard_system_agent_finding_budget_v1()
FROM PUBLIC, anon, authenticated;

-- Signed-contract evidence lifecycle and OCR quality containment.
ALTER TABLE public.contract_documents
  DROP CONSTRAINT IF EXISTS contract_documents_legal_identity_match_status_check;
ALTER TABLE public.contract_documents
  ADD CONSTRAINT contract_documents_legal_identity_match_status_check CHECK (
    legal_identity_match_status IN (
      'pending', 'matched', 'mismatch', 'unverified', 'expired_unverified', 'failed'
    )
  );
ALTER TABLE public.contract_documents
  ADD COLUMN legal_identity_expires_at timestamptz,
  ADD COLUMN legal_evidence_state text NOT NULL DEFAULT 'active'
    CHECK (legal_evidence_state IN ('active', 'superseded', 'quarantined')),
  ADD COLUMN superseded_by_document_id uuid REFERENCES public.contract_documents(id) ON DELETE RESTRICT,
  ADD COLUMN ocr_quality_score numeric CHECK (ocr_quality_score IS NULL OR ocr_quality_score BETWEEN 0 AND 1),
  ADD COLUMN ocr_review_reason text;

CREATE INDEX contract_documents_identity_expiry_idx
  ON public.contract_documents(company_id, legal_identity_expires_at)
  WHERE document_type IN ('signed_contract', 'signed_contract_image')
    AND legal_identity_match_status IN ('pending', 'unverified');
CREATE INDEX contract_documents_active_legal_evidence_idx
  ON public.contract_documents(company_id, contract_id, created_at DESC)
  WHERE document_type IN ('signed_contract', 'signed_contract_image')
    AND legal_evidence_state = 'active';
CREATE UNIQUE INDEX contract_documents_company_contract_id_key
  ON public.contract_documents(company_id, contract_id, id);

CREATE OR REPLACE FUNCTION public.guard_contract_document_lifecycle_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  v_successor public.contract_documents%ROWTYPE;
BEGIN
  IF NEW.document_type NOT IN ('signed_contract', 'signed_contract_image') THEN
    RETURN NEW;
  END IF;
  IF NEW.legal_identity_match_status IN ('pending', 'unverified') THEN
    NEW.legal_identity_expires_at := COALESCE(
      NEW.legal_identity_expires_at,
      NEW.created_at,
      now()
    ) + interval '24 hours';
  ELSE
    NEW.legal_identity_expires_at := NULL;
  END IF;
  IF NEW.legal_identity_match_status = 'matched'
     AND COALESCE(NEW.ocr_quality_score, 1) < 0.70
     AND NULLIF(pg_catalog.regexp_replace(COALESCE(NEW.legal_identity_extracted_id, ''), '[^0-9]', '', 'g'), '') IS NULL THEN
    RAISE EXCEPTION 'LOW_OCR_QUALITY_REQUIRES_EXACT_ID_EVIDENCE' USING ERRCODE = '23514';
  END IF;
  IF NEW.legal_evidence_state = 'active' AND NEW.superseded_by_document_id IS NOT NULL THEN
    RAISE EXCEPTION 'ACTIVE_EVIDENCE_CANNOT_HAVE_SUCCESSOR' USING ERRCODE = '23514';
  END IF;
  IF NEW.legal_evidence_state = 'superseded' THEN
    IF NEW.superseded_by_document_id IS NULL THEN
      RAISE EXCEPTION 'SUPERSEDED_EVIDENCE_REQUIRES_SUCCESSOR' USING ERRCODE = '23514';
    END IF;
    SELECT document.* INTO v_successor
    FROM public.contract_documents document
    WHERE document.id = NEW.superseded_by_document_id
      AND document.company_id = NEW.company_id
      AND document.contract_id = NEW.contract_id
      AND document.document_type IN ('signed_contract', 'signed_contract_image')
      AND document.legal_identity_match_status = 'matched'
      AND document.legal_evidence_state = 'active';
    IF v_successor.id IS NULL OR v_successor.id = NEW.id THEN
      RAISE EXCEPTION 'SUPERSEDED_EVIDENCE_SUCCESSOR_INVALID' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF NEW.legal_evidence_state = 'quarantined'
     AND NULLIF(BTRIM(COALESCE(NEW.ocr_review_reason, NEW.legal_identity_match_reason, '')), '') IS NULL THEN
    RAISE EXCEPTION 'QUARANTINED_EVIDENCE_REQUIRES_REASON' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_guard_contract_document_lifecycle
BEFORE INSERT OR UPDATE OF document_type, legal_identity_match_status,
  legal_identity_expires_at, legal_evidence_state, superseded_by_document_id,
  ocr_quality_score, ocr_review_reason
ON public.contract_documents
FOR EACH ROW EXECUTE FUNCTION public.guard_contract_document_lifecycle_v1();

REVOKE ALL ON FUNCTION public.guard_contract_document_lifecycle_v1()
FROM PUBLIC, anon, authenticated;

-- Prevent replacement or deletion of the storage bytes behind an already
-- identity-matched signed-contract row. A replacement must use a new path and
-- a new row so it receives its own verification lifecycle.
DROP POLICY IF EXISTS "Users can update contract documents in their company"
ON storage.objects;
CREATE POLICY "Users can update contract documents in their company"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'contract-documents'
  AND EXISTS (
    SELECT 1
    FROM public.contract_documents document
    JOIN public.contracts contract ON contract.id = document.contract_id
    WHERE document.file_path = storage.objects.name
      AND contract.company_id = public.get_user_company(auth.uid())
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.contract_documents evidence
    WHERE evidence.file_path = storage.objects.name
      AND evidence.document_type IN ('signed_contract', 'signed_contract_image')
      AND evidence.legal_identity_match_status = 'matched'
  )
)
WITH CHECK (
  bucket_id = 'contract-documents'
  AND EXISTS (
    SELECT 1
    FROM public.contract_documents document
    JOIN public.contracts contract ON contract.id = document.contract_id
    WHERE document.file_path = storage.objects.name
      AND contract.company_id = public.get_user_company(auth.uid())
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.contract_documents evidence
    WHERE evidence.file_path = storage.objects.name
      AND evidence.document_type IN ('signed_contract', 'signed_contract_image')
      AND evidence.legal_identity_match_status = 'matched'
  )
);

DROP POLICY IF EXISTS "Users can delete contract documents in their company"
ON storage.objects;
CREATE POLICY "Users can delete contract documents in their company"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'contract-documents'
  AND EXISTS (
    SELECT 1
    FROM public.contract_documents document
    JOIN public.contracts contract ON contract.id = document.contract_id
    WHERE document.file_path = storage.objects.name
      AND contract.company_id = public.get_user_company(auth.uid())
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.contract_documents evidence
    WHERE evidence.file_path = storage.objects.name
      AND evidence.document_type IN ('signed_contract', 'signed_contract_image')
      AND evidence.legal_identity_match_status = 'matched'
  )
);

UPDATE public.contract_documents
SET legal_identity_expires_at = COALESCE(created_at, now()) + interval '24 hours'
WHERE document_type IN ('signed_contract', 'signed_contract_image')
  AND legal_identity_match_status IN ('pending', 'unverified')
  AND legal_identity_expires_at IS NULL;

CREATE OR REPLACE FUNCTION public.expire_unverified_signed_contracts_v1(
  p_company_id uuid,
  p_limit integer DEFAULT 100
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_document record;
  v_expired integer := 0;
BEGIN
  FOR v_document IN
    SELECT document.id, document.contract_id
    FROM public.contract_documents document
    WHERE document.company_id = p_company_id
      AND document.document_type IN ('signed_contract', 'signed_contract_image')
      AND document.legal_identity_match_status IN ('pending', 'unverified')
      AND document.legal_identity_expires_at <= now()
    ORDER BY document.legal_identity_expires_at, document.id
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500)
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.contract_documents
    SET legal_identity_match_status = 'expired_unverified',
        legal_evidence_state = 'quarantined',
        ocr_review_reason = COALESCE(
          NULLIF(ocr_review_reason, ''),
          'Identity verification did not complete within 24 hours'
        ),
        legal_identity_match_reason = COALESCE(
          NULLIF(legal_identity_match_reason, ''),
          'Identity verification expired after 24 hours'
        ),
        legal_identity_checked_at = COALESCE(legal_identity_checked_at, now()),
        updated_at = now()
    WHERE id = v_document.id;
    PERFORM public.enqueue_missing_contract_pdf_request_v1(
      p_company_id, v_document.contract_id, 'identity_mismatch', NULL
    );
    v_expired := v_expired + 1;
  END LOOP;
  RETURN jsonb_build_object('expired', v_expired);
END;
$function$;

REVOKE ALL ON FUNCTION public.expire_unverified_signed_contracts_v1(uuid,integer)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_unverified_signed_contracts_v1(uuid,integer)
TO service_role;

-- Multiple active matched copies are explicitly ambiguous. Legal filing must
-- stop until older evidence is marked superseded.
CREATE OR REPLACE FUNCTION public.get_direct_signed_contract_evidence_state_v1(
  p_company_id uuid,
  p_contract_id uuid
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO ''
AS $function$
  SELECT jsonb_build_object(
    'ready', count(*) FILTER (
      WHERE document.legal_identity_match_status = 'matched'
        AND document.legal_evidence_state = 'active'
    ) = 1,
    'activeMatchedCount', count(*) FILTER (
      WHERE document.legal_identity_match_status = 'matched'
        AND document.legal_evidence_state = 'active'
    ),
    'pendingCount', count(*) FILTER (
      WHERE document.legal_identity_match_status IN ('pending', 'unverified')
        AND document.legal_evidence_state = 'active'
    ),
    'quarantinedCount', count(*) FILTER (
      WHERE document.legal_evidence_state = 'quarantined'
    ),
    'documentId', (array_agg(document.id ORDER BY document.created_at DESC, document.id) FILTER (
      WHERE document.legal_identity_match_status = 'matched'
        AND document.legal_evidence_state = 'active'
    ))[1],
    'reason', CASE
      WHEN count(*) FILTER (
        WHERE document.legal_identity_match_status = 'matched'
          AND document.legal_evidence_state = 'active'
      ) = 1 THEN 'one_direct_active_identity_matched_document'
      WHEN count(*) FILTER (
        WHERE document.legal_identity_match_status = 'matched'
          AND document.legal_evidence_state = 'active'
      ) > 1 THEN 'ambiguous_multiple_active_matched_documents'
      ELSE 'missing_active_identity_matched_document'
    END
  )
  FROM public.contract_documents document
  WHERE document.company_id = p_company_id
    AND document.contract_id = p_contract_id
    AND document.document_type IN ('signed_contract', 'signed_contract_image')
    AND NULLIF(BTRIM(document.file_path), '') IS NOT NULL;
$function$;

REVOKE ALL ON FUNCTION public.get_direct_signed_contract_evidence_state_v1(uuid,uuid)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_direct_signed_contract_evidence_state_v1(uuid,uuid)
TO authenticated, service_role;

ALTER FUNCTION public.get_legal_transfer_readiness_v1(uuid,uuid)
  RENAME TO get_legal_transfer_readiness_v1_pre_failure_containment;

CREATE FUNCTION public.get_legal_transfer_readiness_v1(
  p_company_id uuid,
  p_contract_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_result jsonb;
  v_evidence jsonb;
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.user_roles role
       WHERE role.user_id = auth.uid() AND role.role = 'super_admin'
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.profiles profile
       WHERE profile.user_id = auth.uid()
         AND profile.company_id = p_company_id
         AND profile.is_active = true
     ) THEN
    RAISE EXCEPTION 'COMPANY_SCOPE_DENIED' USING ERRCODE = '42501';
  END IF;
  v_result := public.get_legal_transfer_readiness_v1_pre_failure_containment(
    p_company_id, p_contract_id
  );
  v_evidence := public.get_direct_signed_contract_evidence_state_v1(
    p_company_id, p_contract_id
  );
  IF COALESCE((v_evidence ->> 'activeMatchedCount')::integer, 0) > 1 THEN
    PERFORM public.upsert_agent_operational_alert_task_v1(
      p_company_id,
      'ambiguous-contract-evidence:' || p_contract_id::text,
      'تعارض نسخ العقد الموقعة',
      'يوجد أكثر من مستند عقد موقّع مطابق وفعال. يجب تحديد النسخة الحالية ووضع النسخ الأقدم كمنسوخة superseded قبل رفع الدعوى.',
      'high',
      true
    );
  ELSE
    PERFORM public.upsert_agent_operational_alert_task_v1(
      p_company_id,
      'ambiguous-contract-evidence:' || p_contract_id::text,
      'تعارض نسخ العقد الموقعة',
      'لا يوجد تعارض حالي في نسخة العقد.',
      'low',
      false
    );
  END IF;
  RETURN v_result || jsonb_build_object(
    'signed_contract_ready', COALESCE((v_evidence ->> 'ready')::boolean, false),
    'signed_contract_evidence', v_evidence,
    'signed_contract_block_code', CASE
      WHEN COALESCE((v_evidence ->> 'ready')::boolean, false) THEN NULL
      ELSE v_evidence ->> 'reason'
    END
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_legal_transfer_readiness_v1(uuid,uuid)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_legal_transfer_readiness_v1(uuid,uuid)
TO authenticated, service_role;

ALTER FUNCTION public.complete_legal_transfer_readiness_v1(uuid,uuid,jsonb,uuid)
  RENAME TO complete_legal_transfer_readiness_v1_pre_failure_containment;

CREATE FUNCTION public.complete_legal_transfer_readiness_v1(
  p_company_id uuid,
  p_contract_id uuid,
  p_payload jsonb,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_evidence jsonb;
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.user_roles role
       WHERE role.user_id = auth.uid() AND role.role = 'super_admin'
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.profiles profile
       WHERE profile.user_id = auth.uid()
         AND profile.company_id = p_company_id
         AND profile.is_active = true
     ) THEN
    RAISE EXCEPTION 'COMPANY_SCOPE_DENIED' USING ERRCODE = '42501';
  END IF;
  v_evidence := public.get_direct_signed_contract_evidence_state_v1(
    p_company_id, p_contract_id
  );
  IF COALESCE((v_evidence ->> 'activeMatchedCount')::integer, 0) > 1 THEN
    RETURN jsonb_build_object(
      'success', false,
      'blocked', true,
      'code', 'ambiguous_multiple_active_matched_documents',
      'message_ar', 'توجد أكثر من نسخة عقد مطابقة وفعالة. يجب اعتماد نسخة واحدة ووضع البقية كنسخ مستبدلة قبل المتابعة.',
      'signed_contract_evidence', v_evidence
    );
  END IF;
  RETURN public.complete_legal_transfer_readiness_v1_pre_failure_containment(
    p_company_id, p_contract_id, p_payload, p_actor_id
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.complete_legal_transfer_readiness_v1(uuid,uuid,jsonb,uuid)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_legal_transfer_readiness_v1(uuid,uuid,jsonb,uuid)
TO authenticated, service_role;

ALTER FUNCTION public.convert_contract_to_legal_v1(
  uuid,uuid,text,text,text,boolean,uuid
) RENAME TO convert_contract_to_legal_v1_pre_failure_containment;

CREATE FUNCTION public.convert_contract_to_legal_v1(
  p_company_id uuid,
  p_contract_id uuid,
  p_notes text,
  p_priority text,
  p_case_type text,
  p_vehicle_returned boolean,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_evidence jsonb;
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.user_roles role
       WHERE role.user_id = auth.uid() AND role.role = 'super_admin'
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.profiles profile
       WHERE profile.user_id = auth.uid()
         AND profile.company_id = p_company_id
         AND profile.is_active = true
     ) THEN
    RAISE EXCEPTION 'COMPANY_SCOPE_DENIED' USING ERRCODE = '42501';
  END IF;
  v_evidence := public.get_direct_signed_contract_evidence_state_v1(
    p_company_id, p_contract_id
  );
  IF COALESCE((v_evidence ->> 'activeMatchedCount')::integer, 0) > 1 THEN
    RETURN jsonb_build_object(
      'success', false,
      'blocked', true,
      'code', 'ambiguous_multiple_active_matched_documents',
      'message_ar', 'توجد عدة نسخ عقود مطابقة وفعالة؛ أوقف النظام إنشاء القضية حتى حسم النسخة القانونية الحالية.',
      'signed_contract_evidence', v_evidence
    );
  END IF;
  RETURN public.convert_contract_to_legal_v1_pre_failure_containment(
    p_company_id, p_contract_id, p_notes, p_priority, p_case_type,
    p_vehicle_returned, p_actor_id
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.convert_contract_to_legal_v1(
  uuid,uuid,text,text,text,boolean,uuid
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.convert_contract_to_legal_v1(
  uuid,uuid,text,text,text,boolean,uuid
) TO authenticated, service_role;

-- Structural ownership: a filed preparation's source document must belong to
-- the same company and contract. Draft rows remain nullable for compatibility.
ALTER TABLE public.lawsuit_preparations
  ADD COLUMN source_document_id uuid;
ALTER TABLE public.lawsuit_preparations
  ADD CONSTRAINT lawsuit_preparations_direct_source_document_fkey
  FOREIGN KEY (company_id, contract_id, source_document_id)
  REFERENCES public.contract_documents(company_id, contract_id, id)
  ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION public.guard_lawsuit_preparation_source_document_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  v_source uuid;
BEGIN
  IF NEW.status NOT IN ('submitted', 'registered') THEN RETURN NEW; END IF;
  v_source := NEW.source_document_id;
  IF v_source IS NULL THEN
    SELECT CASE
      WHEN COALESCE(document ->> 'sourceDocumentId', '')
        ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      THEN (document ->> 'sourceDocumentId')::uuid
      ELSE NULL
    END
    INTO v_source
    FROM public.taqadi_filing_jobs job
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(job.payload -> 'documents', '[]'::jsonb)) document
    WHERE job.company_id = NEW.company_id
      AND job.contract_id = NEW.contract_id
      AND (NEW.legal_case_id IS NULL OR job.legal_case_id = NEW.legal_case_id)
      AND document ->> 'key' = 'contract'
      AND NULLIF(document ->> 'sourceDocumentId', '') IS NOT NULL
    ORDER BY job.created_at DESC
    LIMIT 1;
    NEW.source_document_id := v_source;
  END IF;
  IF v_source IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.contract_documents document
    WHERE document.id = v_source
      AND document.company_id = NEW.company_id
      AND document.contract_id = NEW.contract_id
      AND document.document_type IN ('signed_contract', 'signed_contract_image')
      AND document.legal_identity_match_status = 'matched'
      AND document.legal_evidence_state = 'active'
      AND NULLIF(BTRIM(document.file_path), '') IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'LAWSUIT_SOURCE_DOCUMENT_NOT_DIRECT_ACTIVE_MATCH' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_guard_lawsuit_preparation_source_document
BEFORE INSERT OR UPDATE OF status, company_id, contract_id, source_document_id
ON public.lawsuit_preparations
FOR EACH ROW EXECUTE FUNCTION public.guard_lawsuit_preparation_source_document_v1();

REVOKE ALL ON FUNCTION public.guard_lawsuit_preparation_source_document_v1()
FROM PUBLIC, anon, authenticated;

-- Validate the actual source document embedded in the frozen Taqadi payload.
ALTER FUNCTION public.validate_taqadi_filing_payload_v1(uuid,uuid,jsonb)
  RENAME TO validate_taqadi_filing_payload_v1_pre_failure_containment;

CREATE FUNCTION public.validate_taqadi_filing_payload_v1(
  p_company_id uuid,
  p_contract_id uuid,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_result jsonb;
  v_source_document_id uuid;
  v_evidence_state jsonb;
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.user_roles role
       WHERE role.user_id = auth.uid() AND role.role = 'super_admin'
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.profiles profile
       WHERE profile.user_id = auth.uid()
         AND profile.company_id = p_company_id
         AND profile.is_active = true
     ) THEN
    RAISE EXCEPTION 'COMPANY_SCOPE_DENIED' USING ERRCODE = '42501';
  END IF;
  v_result := public.validate_taqadi_filing_payload_v1_pre_failure_containment(
    p_company_id, p_contract_id, p_payload
  );
  SELECT CASE
    WHEN COALESCE(document ->> 'sourceDocumentId', '')
      ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    THEN (document ->> 'sourceDocumentId')::uuid
    ELSE NULL
  END
  INTO v_source_document_id
  FROM jsonb_array_elements(COALESCE(p_payload -> 'documents', '[]'::jsonb)) document
  WHERE document ->> 'key' = 'contract'
  LIMIT 1;
  v_evidence_state := public.get_direct_signed_contract_evidence_state_v1(
    p_company_id, p_contract_id
  );
  IF v_source_document_id IS NULL OR COALESCE((v_evidence_state ->> 'ready')::boolean, false) = false
     OR NOT EXISTS (
       SELECT 1 FROM public.contract_documents document
       WHERE document.id = v_source_document_id
         AND document.company_id = p_company_id
         AND document.contract_id = p_contract_id
         AND document.legal_identity_match_status = 'matched'
         AND document.legal_evidence_state = 'active'
         AND document.document_type IN ('signed_contract', 'signed_contract_image')
     ) THEN
    v_result := jsonb_set(v_result, '{ready}', 'false'::jsonb, true);
    v_result := jsonb_set(
      v_result,
      '{missing}',
      COALESCE(v_result -> 'missing', '[]'::jsonb)
        || jsonb_build_array('documents.contract.sourceDocumentId:' || COALESCE(v_evidence_state ->> 'reason', 'missing')),
      true
    );
  END IF;
  RETURN v_result || jsonb_build_object('contractEvidence', v_evidence_state);
END;
$function$;

REVOKE ALL ON FUNCTION public.validate_taqadi_filing_payload_v1(uuid,uuid,jsonb)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validate_taqadi_filing_payload_v1(uuid,uuid,jsonb)
TO authenticated, service_role;

-- Secure, one-use upload links. The public endpoint receives only an opaque
-- random token; company/customer/contract identifiers never appear in the URL.
CREATE TABLE public.missing_contract_pdf_upload_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.missing_contract_pdf_requests(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  uploaded_document_id uuid REFERENCES public.contract_documents(id) ON DELETE SET NULL,
  claimed_at timestamptz,
  claim_nonce text,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at),
  CHECK (used_at IS NULL OR uploaded_document_id IS NOT NULL)
);

CREATE INDEX missing_contract_pdf_upload_tokens_request_idx
  ON public.missing_contract_pdf_upload_tokens(request_id, expires_at DESC);
ALTER TABLE public.missing_contract_pdf_upload_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.missing_contract_pdf_upload_tokens
FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.missing_contract_pdf_upload_tokens TO service_role;

CREATE OR REPLACE FUNCTION public.issue_missing_contract_pdf_upload_token_v1(
  p_request_id uuid,
  p_ttl interval DEFAULT interval '7 days'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_request public.missing_contract_pdf_requests%ROWTYPE;
  v_raw_token text;
  v_token public.missing_contract_pdf_upload_tokens%ROWTYPE;
BEGIN
  IF p_ttl < interval '15 minutes' OR p_ttl > interval '14 days' THEN
    RAISE EXCEPTION 'Upload token TTL is outside the safe range' USING ERRCODE = '22023';
  END IF;
  SELECT request.* INTO v_request
  FROM public.missing_contract_pdf_requests request
  WHERE request.id = p_request_id
    AND request.status NOT IN ('fulfilled', 'cancelled')
  FOR UPDATE;
  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'Open PDF request not found' USING ERRCODE = 'P0001';
  END IF;
  v_raw_token := encode(extensions.gen_random_bytes(32), 'hex');
  INSERT INTO public.missing_contract_pdf_upload_tokens (
    request_id, company_id, contract_id, token_hash, expires_at
  ) VALUES (
    v_request.id, v_request.company_id, v_request.contract_id,
    encode(extensions.digest(v_raw_token, 'sha256'), 'hex'), now() + p_ttl
  ) RETURNING * INTO v_token;
  RETURN jsonb_build_object(
    'token', v_raw_token,
    'expiresAt', v_token.expires_at,
    'requestId', v_request.id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.resolve_missing_contract_pdf_upload_token_v1(
  p_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_token public.missing_contract_pdf_upload_tokens%ROWTYPE;
  v_request public.missing_contract_pdf_requests%ROWTYPE;
BEGIN
  SELECT token.* INTO v_token
  FROM public.missing_contract_pdf_upload_tokens token
  WHERE token.token_hash = encode(extensions.digest(COALESCE(p_token, ''), 'sha256'), 'hex');
  IF v_token.id IS NULL OR v_token.revoked_at IS NOT NULL OR v_token.expires_at <= now() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'invalid_or_expired');
  END IF;
  SELECT request.* INTO v_request
  FROM public.missing_contract_pdf_requests request
  WHERE request.id = v_token.request_id;
  IF v_token.used_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'valid', false, 'reason', 'already_used', 'documentId', v_token.uploaded_document_id
    );
  END IF;
  IF v_request.status IN ('fulfilled', 'cancelled') THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'request_closed');
  END IF;
  RETURN jsonb_build_object(
    'valid', true,
    'tokenId', v_token.id,
    'requestId', v_request.id,
    'companyId', v_token.company_id,
    'contractId', v_token.contract_id,
    'contractNumber', v_request.contract_number,
    'reason', v_request.reason,
    'expiresAt', v_token.expires_at
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.consume_missing_contract_pdf_upload_token_v1(
  p_token text,
  p_claim_nonce text,
  p_document_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_token public.missing_contract_pdf_upload_tokens%ROWTYPE;
BEGIN
  SELECT token.* INTO v_token
  FROM public.missing_contract_pdf_upload_tokens token
  WHERE token.token_hash = encode(extensions.digest(COALESCE(p_token, ''), 'sha256'), 'hex')
  FOR UPDATE;
  IF v_token.id IS NULL OR v_token.revoked_at IS NOT NULL OR v_token.expires_at <= now()
     OR v_token.used_at IS NOT NULL THEN
    RAISE EXCEPTION 'UPLOAD_TOKEN_NOT_USABLE' USING ERRCODE = 'P0001';
  END IF;
  IF v_token.claim_nonce IS DISTINCT FROM NULLIF(BTRIM(COALESCE(p_claim_nonce, '')), '')
     OR v_token.claimed_at IS NULL
     OR v_token.claimed_at <= now() - interval '10 minutes' THEN
    RAISE EXCEPTION 'UPLOAD_TOKEN_CLAIM_LOST' USING ERRCODE = 'P0001';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.contract_documents document
    WHERE document.id = p_document_id
      AND document.company_id = v_token.company_id
      AND document.contract_id = v_token.contract_id
      AND document.document_type = 'signed_contract'
      AND document.legal_identity_match_status = 'pending'
  ) THEN
    RAISE EXCEPTION 'UPLOAD_DOCUMENT_NOT_DIRECT_PENDING_CONTRACT' USING ERRCODE = '23514';
  END IF;
  UPDATE public.missing_contract_pdf_upload_tokens
  SET used_at = now(), uploaded_document_id = p_document_id,
      claim_nonce = NULL, claimed_at = NULL
  WHERE id = v_token.id;
  RETURN jsonb_build_object('consumed', true, 'documentId', p_document_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.release_missing_contract_pdf_upload_token_claim_v1(
  p_token text,
  p_claim_nonce text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_released boolean := false;
BEGIN
  UPDATE public.missing_contract_pdf_upload_tokens token
  SET claimed_at = NULL, claim_nonce = NULL
  WHERE token.token_hash = encode(extensions.digest(COALESCE(p_token, ''), 'sha256'), 'hex')
    AND token.used_at IS NULL
    AND token.revoked_at IS NULL
    AND token.claim_nonce = NULLIF(BTRIM(COALESCE(p_claim_nonce, '')), '')
  RETURNING true INTO v_released;
  RETURN COALESCE(v_released, false);
END;
$function$;

CREATE OR REPLACE FUNCTION public.claim_missing_contract_pdf_upload_token_v1(
  p_token text,
  p_claim_nonce text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_token public.missing_contract_pdf_upload_tokens%ROWTYPE;
  v_nonce text := NULLIF(BTRIM(COALESCE(p_claim_nonce, '')), '');
BEGIN
  IF v_nonce IS NULL OR length(v_nonce) < 16 THEN
    RAISE EXCEPTION 'UPLOAD_CLAIM_NONCE_REQUIRED' USING ERRCODE = '22023';
  END IF;
  SELECT token.* INTO v_token
  FROM public.missing_contract_pdf_upload_tokens token
  WHERE token.token_hash = encode(extensions.digest(COALESCE(p_token, ''), 'sha256'), 'hex')
  FOR UPDATE;
  IF v_token.id IS NULL OR v_token.revoked_at IS NOT NULL OR v_token.expires_at <= now()
     OR v_token.used_at IS NOT NULL THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'invalid_expired_or_used');
  END IF;
  IF v_token.claimed_at IS NOT NULL
     AND v_token.claimed_at > now() - interval '10 minutes'
     AND v_token.claim_nonce IS DISTINCT FROM v_nonce THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'upload_already_in_progress');
  END IF;
  UPDATE public.missing_contract_pdf_upload_tokens
  SET claimed_at = now(), claim_nonce = v_nonce
  WHERE id = v_token.id;
  RETURN public.resolve_missing_contract_pdf_upload_token_v1(p_token)
    || jsonb_build_object('claimed', true, 'claimNonce', v_nonce);
END;
$function$;

REVOKE ALL ON FUNCTION public.issue_missing_contract_pdf_upload_token_v1(uuid,interval)
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.resolve_missing_contract_pdf_upload_token_v1(text)
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_missing_contract_pdf_upload_token_v1(text,text,uuid)
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_missing_contract_pdf_upload_token_claim_v1(text,text)
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_missing_contract_pdf_upload_token_v1(text,text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_missing_contract_pdf_upload_token_v1(uuid,interval),
  public.resolve_missing_contract_pdf_upload_token_v1(text),
  public.claim_missing_contract_pdf_upload_token_v1(text,text),
  public.release_missing_contract_pdf_upload_token_claim_v1(text,text),
  public.consume_missing_contract_pdf_upload_token_v1(text,text,uuid)
TO service_role;

-- Dead requests are escalated once into the existing deduplicated task bridge.
ALTER TABLE public.missing_contract_pdf_requests
  ADD COLUMN escalation_due_at timestamptz,
  ADD COLUMN first_escalated_at timestamptz,
  ADD COLUMN last_escalated_at timestamptz,
  ADD COLUMN escalation_closed_at timestamptz,
  ADD COLUMN escalation_count integer NOT NULL DEFAULT 0 CHECK (escalation_count BETWEEN 0 AND 10),
  ADD COLUMN mismatch_upload_count integer NOT NULL DEFAULT 0 CHECK (mismatch_upload_count BETWEEN 0 AND 20),
  ADD COLUMN review_cooldown_until timestamptz;

UPDATE public.missing_contract_pdf_requests
SET escalation_due_at = first_requested_at + interval '48 hours'
WHERE escalation_due_at IS NULL AND status NOT IN ('fulfilled', 'cancelled');

CREATE OR REPLACE FUNCTION public.escalate_stale_missing_contract_pdf_requests_v1(
  p_company_id uuid,
  p_limit integer DEFAULT 100
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_request record;
  v_escalated integer := 0;
BEGIN
  FOR v_request IN
    SELECT request.id, request.contract_id, request.contract_number,
      request.reason, request.status, request.first_requested_at
    FROM public.missing_contract_pdf_requests request
    WHERE request.company_id = p_company_id
      AND request.status NOT IN ('fulfilled', 'cancelled')
      AND COALESCE(request.escalation_due_at, request.first_requested_at + interval '48 hours') <= now()
      AND request.escalation_count < 3
      AND (request.last_escalated_at IS NULL OR request.last_escalated_at <= now() - interval '48 hours')
    ORDER BY request.first_requested_at, request.id
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 500)
    FOR UPDATE SKIP LOCKED
  LOOP
    PERFORM public.upsert_agent_operational_alert_task_v1(
      p_company_id,
      'missing-contract-pdf:' || v_request.id::text,
      'تصعيد: نسخة عقد صحيحة مطلوبة للعقد ' || v_request.contract_number,
      'لم تصل نسخة عقد مطابقة خلال 48 ساعة. السبب: ' || v_request.reason
        || '. الطلب مفتوح منذ ' || v_request.first_requested_at::text
        || '. يمنع النظام رفع الدعوى حتى وصول نسخة مطابقة.',
      'high',
      true
    );
    UPDATE public.missing_contract_pdf_requests
    SET first_escalated_at = COALESCE(first_escalated_at, now()),
        last_escalated_at = now(),
        escalation_count = escalation_count + 1,
        escalation_due_at = now() + interval '48 hours',
        updated_at = now()
    WHERE id = v_request.id;
    v_escalated := v_escalated + 1;
  END LOOP;

  FOR v_request IN
    SELECT request.id
    FROM public.missing_contract_pdf_requests request
    WHERE request.company_id = p_company_id
      AND request.status IN ('fulfilled', 'cancelled')
      AND request.first_escalated_at IS NOT NULL
      AND request.escalation_closed_at IS NULL
    FOR UPDATE SKIP LOCKED
  LOOP
    PERFORM public.upsert_agent_operational_alert_task_v1(
      p_company_id,
      'missing-contract-pdf:' || v_request.id::text,
      'طلب نسخة عقد مكتمل',
      'أُغلق الطلب بعد استلام نسخة مطابقة.',
      'low',
      false
    );
    UPDATE public.missing_contract_pdf_requests
    SET escalation_closed_at = now(), updated_at = now()
    WHERE id = v_request.id;
  END LOOP;
  RETURN jsonb_build_object('escalated', v_escalated);
END;
$function$;

REVOKE ALL ON FUNCTION public.escalate_stale_missing_contract_pdf_requests_v1(uuid,integer)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.escalate_stale_missing_contract_pdf_requests_v1(uuid,integer)
TO service_role;

-- Quarantine repeated mismatches and introduce a cooldown, avoiding a
-- WhatsApp -> bad upload -> WhatsApp loop.
CREATE OR REPLACE FUNCTION public.track_missing_contract_pdf_mismatch_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
  IF NEW.document_type IN ('signed_contract', 'signed_contract_image')
     AND NEW.legal_identity_match_status IN ('mismatch', 'failed')
     AND (TG_OP = 'INSERT' OR OLD.legal_identity_match_status IS DISTINCT FROM NEW.legal_identity_match_status) THEN
    UPDATE public.missing_contract_pdf_requests request
    SET mismatch_upload_count = LEAST(request.mismatch_upload_count + 1, 20),
        review_cooldown_until = CASE
          WHEN request.mismatch_upload_count + 1 >= 3 THEN now() + interval '24 hours'
          ELSE now() + interval '2 hours'
        END,
        updated_at = now()
    WHERE request.company_id = NEW.company_id
      AND request.contract_id = NEW.contract_id
      AND request.status NOT IN ('fulfilled', 'cancelled');
    IF EXISTS (
      SELECT 1 FROM public.missing_contract_pdf_requests request
      WHERE request.company_id = NEW.company_id
        AND request.contract_id = NEW.contract_id
        AND request.mismatch_upload_count >= 3
        AND request.status NOT IN ('fulfilled', 'cancelled')
    ) THEN
      PERFORM public.upsert_agent_operational_alert_task_v1(
        NEW.company_id,
        'contract-pdf-repeated-mismatch:' || NEW.contract_id::text,
        'مراجعة يدوية: تكرار رفع عقد غير مطابق',
        'أوقف النظام إعادة الإرسال الفوري بعد ثلاث نسخ غير مطابقة. يلزم فحص مصدر الملف وهوية العميل.',
        'urgent',
        true
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_track_missing_contract_pdf_mismatch
AFTER INSERT OR UPDATE OF legal_identity_match_status ON public.contract_documents
FOR EACH ROW EXECUTE FUNCTION public.track_missing_contract_pdf_mismatch_v1();

REVOKE ALL ON FUNCTION public.track_missing_contract_pdf_mismatch_v1()
FROM PUBLIC, anon, authenticated;

-- Service-only aggregate health check. Sensitive identity values and storage
-- paths never leave PostgreSQL; callers receive violation counts only.
CREATE OR REPLACE FUNCTION public.get_agent_safety_data_health_v1()
RETURNS TABLE(metric text, violation_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT
    'active_matched_evidence_ambiguous_contracts'::text,
    count(*)::bigint
  FROM (
    SELECT 1
    FROM public.contract_documents document
    WHERE document.document_type IN ('signed_contract', 'signed_contract_image')
      AND document.legal_identity_match_status = 'matched'
      AND document.legal_evidence_state = 'active'
    GROUP BY document.company_id, document.contract_id
    HAVING count(*) > 1
  ) ambiguous_contracts
  UNION ALL
  SELECT
    'active_matched_evidence_reused_paths'::text,
    count(*)::bigint
  FROM (
    SELECT 1
    FROM public.contract_documents document
    WHERE document.document_type IN ('signed_contract', 'signed_contract_image')
      AND document.legal_identity_match_status = 'matched'
      AND document.legal_evidence_state = 'active'
      AND NULLIF(pg_catalog.btrim(document.file_path), '') IS NOT NULL
    GROUP BY document.company_id, document.file_path
    HAVING count(DISTINCT document.contract_id) > 1
  ) reused_paths
  UNION ALL
  SELECT
    'normalized_national_id_duplicate_groups'::text,
    count(*)::bigint
  FROM (
    SELECT 1
    FROM public.customers customer
    WHERE public.normalize_national_id(customer.national_id) <> ''
    GROUP BY customer.company_id,
             public.normalize_national_id(customer.national_id)
    HAVING count(*) > 1
  ) duplicate_national_ids;
$function$;

REVOKE ALL ON FUNCTION public.get_agent_safety_data_health_v1()
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_agent_safety_data_health_v1()
TO service_role;

-- Schedules call service-only RPCs; no external write is introduced here.
SELECT cron.unschedule(job.jobid)
FROM cron.job job
WHERE job.jobname IN (
  'expire-unverified-signed-contracts-v1',
  'escalate-missing-contract-pdf-v1',
  'timeout-stale-agent-executions-v1'
);

SELECT cron.schedule(
  'expire-unverified-signed-contracts-v1',
  '*/15 * * * *',
  $$SELECT public.expire_unverified_signed_contracts_v1(
    '24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid, 100
  );$$
);

SELECT cron.schedule(
  'escalate-missing-contract-pdf-v1',
  '15 * * * *',
  $$SELECT public.escalate_stale_missing_contract_pdf_requests_v1(
    '24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid, 100
  );$$
);

SELECT cron.schedule(
  'timeout-stale-agent-executions-v1',
  '*/10 * * * *',
  $$SELECT public.timeout_stale_agent_executions_v1(
    '24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid, 100
  );$$
);

COMMENT ON TABLE public.agent_execution_mutations IS
  'Immutable before/after/postcondition evidence for execution-ledger-enabled autonomous writers.';
COMMENT ON COLUMN public.contract_documents.legal_evidence_state IS
  'Only one active identity-matched signed contract may be used for legal filing; older copies must be explicitly superseded.';
COMMENT ON TABLE public.missing_contract_pdf_upload_tokens IS
  'Hashed one-use tokens for anonymous PDF upload; tokens never encode company, customer or contract identifiers.';

COMMIT;
