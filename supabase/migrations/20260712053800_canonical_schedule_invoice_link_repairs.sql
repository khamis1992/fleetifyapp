-- Canonical single-schedule linking with invoice-date priority and due-date fallback.

INSERT INTO public.system_agent_command_registry (
  command, domain, description, entity_table, allowed_fields,
  reversible, approval_required, closed_period_policy, min_confidence, enabled
) VALUES (
  'schedule.link_invoice_by_billing_month', 'contracts',
  'Link an unlinked schedule to its unique issue-month invoice, or due-month invoice when no issue-month invoice exists.',
  'contract_payment_schedules', ARRAY['invoice_id'],
  true, false, 'allow_derived', 1.0, true
)
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

CREATE OR REPLACE FUNCTION public.system_agent_apply_schedule_invoice_link_repair_v1(
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
  v_schedule public.contract_payment_schedules%ROWTYPE;
  v_contract public.contracts%ROWTYPE;
  v_invoice public.invoices%ROWTYPE;
  v_schedule_id uuid;
  v_month date;
  v_issue_count integer := 0;
  v_due_count integer := 0;
  v_candidate_id uuid;
  v_before jsonb;
  v_after jsonb;
  v_repair_id uuid := gen_random_uuid();
  v_rollback_metadata jsonb := COALESCE(p_metadata, '{}'::jsonb)
    || jsonb_build_object('handler_version', 'schedule_invoice_link_v1');
BEGIN
  IF p_command <> 'schedule.link_invoice_by_billing_month' THEN
    RAISE EXCEPTION 'Schedule invoice-link gateway received an unsupported command';
  END IF;
  IF COALESCE(p_values, '{}'::jsonb) <> '{}'::jsonb THEN
    RAISE EXCEPTION 'Schedule invoice-link gateway derives its target invoice internally';
  END IF;

  v_schedule_id := p_entity_id::uuid;

  SELECT * INTO v_job
  FROM public.system_agent_jobs job
  WHERE job.id = p_job_id
    AND job.run_id = p_run_id
    AND job.company_id = p_company_id
  FOR UPDATE;
  IF v_job.id IS NULL OR v_job.status <> 'running' OR v_job.mode <> 'apply' OR v_job.domain <> 'contracts' THEN
    RAISE EXCEPTION 'System agent job is not an active contract apply job';
  END IF;

  SELECT * INTO v_finding
  FROM public.system_agent_findings finding
  WHERE finding.id = p_finding_id
    AND finding.run_id = p_run_id
    AND finding.job_id = p_job_id
    AND finding.company_id = p_company_id
  FOR UPDATE;
  IF v_finding.id IS NULL
     OR v_finding.repair_command IS DISTINCT FROM p_command
     OR v_finding.entity_id IS DISTINCT FROM p_entity_id
     OR v_finding.status IN ('repaired', 'rolled_back')
  THEN
    RAISE EXCEPTION 'Schedule invoice-link finding is invalid, mismatched, or already processed';
  END IF;

  SELECT * INTO v_registry
  FROM public.system_agent_command_registry registry
  WHERE registry.command = p_command
    AND registry.domain = 'contracts'
    AND registry.enabled
    AND registry.reversible
    AND NOT registry.approval_required;
  IF v_registry.command IS NULL OR v_finding.confidence < v_registry.min_confidence THEN
    RAISE EXCEPTION 'Schedule invoice-link command is disabled or below its confidence threshold';
  END IF;

  SELECT * INTO v_schedule
  FROM public.contract_payment_schedules schedule
  WHERE schedule.id = v_schedule_id AND schedule.company_id = p_company_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Schedule is outside the active company'; END IF;

  SELECT * INTO v_contract
  FROM public.contracts contract
  WHERE contract.id = v_schedule.contract_id AND contract.company_id = p_company_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Schedule contract is outside the active company'; END IF;

  IF lower(COALESCE(v_schedule.status, '')) IN (
       'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
     )
     OR lower(COALESCE(v_contract.status::text, '')) NOT IN ('active', 'under_legal_procedure')
     OR v_contract.start_date IS NULL OR v_contract.end_date IS NULL
     OR v_schedule.due_date < v_contract.start_date
     OR v_schedule.due_date > v_contract.end_date
     OR COALESCE(v_schedule.amount, 0) <= 0.01
  THEN
    RAISE EXCEPTION 'Schedule and contract lifecycle do not permit automatic invoice linking';
  END IF;

  v_before := public.system_agent_pick_fields(to_jsonb(v_schedule), v_registry.allowed_fields);
  IF COALESCE(p_expected_before, '{}'::jsonb) <> '{}'::jsonb
     AND NOT (v_before @> p_expected_before)
  THEN
    RAISE EXCEPTION 'Schedule changed after invoice-link detection';
  END IF;
  IF v_schedule.invoice_id IS NOT NULL THEN
    RAISE EXCEPTION 'Only an unlinked schedule can use the canonical invoice-link gateway';
  END IF;

  v_month := date_trunc('month', v_schedule.due_date)::date;
  SELECT count(*)::integer, (array_agg(invoice.id ORDER BY invoice.id))[1]
  INTO v_issue_count, v_candidate_id
  FROM public.invoices invoice
  WHERE invoice.company_id = p_company_id
    AND invoice.contract_id = v_contract.id
    AND date_trunc('month', invoice.invoice_date)::date = v_month
    AND lower(COALESCE(invoice.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted'
    )
    AND lower(COALESCE(invoice.payment_status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided'
    );

  IF v_issue_count > 1 THEN
    RAISE EXCEPTION 'Schedule has multiple active issue-month invoice candidates';
  ELSIF v_issue_count = 0 THEN
    SELECT count(*)::integer, (array_agg(invoice.id ORDER BY invoice.id))[1]
    INTO v_due_count, v_candidate_id
    FROM public.invoices invoice
    WHERE invoice.company_id = p_company_id
      AND invoice.contract_id = v_contract.id
      AND date_trunc('month', invoice.due_date)::date = v_month
      AND lower(COALESCE(invoice.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted'
      )
      AND lower(COALESCE(invoice.payment_status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided'
      );
    IF v_due_count <> 1 THEN
      RAISE EXCEPTION 'Schedule does not have one unambiguous active billing-month invoice';
    END IF;
  END IF;

  SELECT * INTO v_invoice
  FROM public.invoices invoice
  WHERE invoice.id = v_candidate_id
    AND invoice.company_id = p_company_id
    AND invoice.contract_id = v_contract.id
  FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Canonical schedule invoice failed verification'; END IF;

  IF EXISTS (
    SELECT 1
    FROM public.contract_payment_schedules other_schedule
    WHERE other_schedule.company_id = p_company_id
      AND other_schedule.id <> v_schedule.id
      AND other_schedule.invoice_id = v_candidate_id
      AND lower(COALESCE(other_schedule.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
  ) THEN
    RAISE EXCEPTION 'Canonical invoice is already linked to another active schedule';
  END IF;

  UPDATE public.contract_payment_schedules schedule
  SET invoice_id = v_candidate_id, updated_at = now()
  WHERE schedule.id = v_schedule.id AND schedule.company_id = p_company_id;

  SELECT * INTO v_schedule
  FROM public.contract_payment_schedules schedule
  WHERE schedule.id = v_schedule_id;
  v_after := public.system_agent_pick_fields(to_jsonb(v_schedule), v_registry.allowed_fields);
  IF v_schedule.invoice_id IS DISTINCT FROM v_candidate_id THEN
    RAISE EXCEPTION 'Schedule invoice-link repair failed postcondition verification';
  END IF;

  v_rollback_metadata := v_rollback_metadata || jsonb_build_object(
    'contract_id', v_contract.id,
    'candidate_invoice_id', v_candidate_id,
    'invoice_month', v_month
  );

  INSERT INTO public.system_agent_repairs (
    id, run_id, job_id, finding_id, company_id, domain, command,
    entity_table, entity_id, before_state, after_state, rollback_metadata
  ) VALUES (
    v_repair_id, p_run_id, p_job_id, p_finding_id, p_company_id,
    'contracts', p_command, v_registry.entity_table, p_entity_id,
    v_before, v_after, v_rollback_metadata
  );

  UPDATE public.system_agent_findings finding
  SET status = 'repaired', repair_id = v_repair_id, error = NULL, updated_at = now()
  WHERE finding.id = p_finding_id;

  RETURN jsonb_build_object(
    'status', 'repaired', 'repair_id', v_repair_id, 'command', p_command,
    'entity_id', p_entity_id, 'before', v_before, 'after', v_after
  );
END;
$$;

REVOKE ALL ON FUNCTION public.system_agent_apply_schedule_invoice_link_repair_v1(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_apply_schedule_invoice_link_repair_v1(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb)
  TO service_role;

DO $$
BEGIN
  IF to_regprocedure('public.system_agent_rollback_repair_before_schedule_invoice_link_v1(uuid,text)') IS NULL THEN
    ALTER FUNCTION public.system_agent_rollback_repair(uuid, text)
      RENAME TO system_agent_rollback_repair_before_schedule_invoice_link_v1;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.system_agent_rollback_repair_before_schedule_invoice_link_v1(uuid,text)
  FROM PUBLIC, anon, authenticated;

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
  v_current jsonb;
BEGIN
  SELECT * INTO v_repair
  FROM public.system_agent_repairs repair
  WHERE repair.id = p_repair_id
  FOR UPDATE;
  IF v_repair.id IS NULL THEN RAISE EXCEPTION 'Repair was not found'; END IF;

  IF COALESCE(v_repair.rollback_metadata ->> 'handler_version', '') <> 'schedule_invoice_link_v1' THEN
    RETURN public.system_agent_rollback_repair_before_schedule_invoice_link_v1(p_repair_id, p_reason);
  END IF;
  IF v_repair.status <> 'applied' THEN RAISE EXCEPTION 'Repair is not in an applied state'; END IF;

  SELECT public.system_agent_pick_fields(to_jsonb(schedule), ARRAY['invoice_id'])
  INTO v_current
  FROM public.contract_payment_schedules schedule
  WHERE schedule.id = v_repair.entity_id::uuid AND schedule.company_id = v_repair.company_id
  FOR UPDATE;
  IF v_current IS NULL OR v_current IS DISTINCT FROM v_repair.after_state THEN
    RAISE EXCEPTION 'Schedule invoice link changed after repair; rollback was safely aborted';
  END IF;

  UPDATE public.contract_payment_schedules schedule
  SET invoice_id = NULLIF(v_repair.before_state ->> 'invoice_id', '')::uuid,
      updated_at = now()
  WHERE schedule.id = v_repair.entity_id::uuid AND schedule.company_id = v_repair.company_id;

  SELECT public.system_agent_pick_fields(to_jsonb(schedule), ARRAY['invoice_id'])
  INTO v_current
  FROM public.contract_payment_schedules schedule
  WHERE schedule.id = v_repair.entity_id::uuid AND schedule.company_id = v_repair.company_id;
  IF v_current IS DISTINCT FROM v_repair.before_state THEN
    RAISE EXCEPTION 'Schedule invoice-link rollback failed verification';
  END IF;

  UPDATE public.system_agent_repairs repair
  SET status = 'rolled_back', rolled_back_at = now(),
      rollback_reason = left(COALESCE(NULLIF(BTRIM(p_reason), ''), 'System agent rollback'), 1000),
      error = NULL, updated_at = now()
  WHERE repair.id = p_repair_id;

  UPDATE public.system_agent_findings finding
  SET status = 'rolled_back', error = NULL, updated_at = now()
  WHERE finding.id = v_repair.finding_id;

  RETURN jsonb_build_object('repair_id', p_repair_id, 'status', 'rolled_back');
END;
$$;

REVOKE ALL ON FUNCTION public.system_agent_rollback_repair(uuid,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_rollback_repair(uuid,text)
  TO service_role;

COMMENT ON FUNCTION public.system_agent_apply_schedule_invoice_link_repair_v1(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb) IS
'Canonical unlinked-schedule invoice gateway with issue-month priority, due-month fallback, audited state, and rollback.';
