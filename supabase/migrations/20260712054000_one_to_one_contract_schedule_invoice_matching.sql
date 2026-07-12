-- Validate and apply a complete one-to-one schedule and invoice matching proposed by the worker.

INSERT INTO public.system_agent_command_registry (
  command, domain, description, entity_table, allowed_fields,
  reversible, approval_required, closed_period_policy, min_confidence, enabled
) VALUES (
  'schedule.realign_contract_invoice_links_v2', 'contracts',
  'Apply a database-validated one-to-one matching across every active linked schedule in one contract.',
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

CREATE OR REPLACE FUNCTION public.system_agent_apply_contract_schedule_matching_repair_v2(
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
  v_contract public.contracts%ROWTYPE;
  v_contract_id uuid;
  v_assignments jsonb;
  v_assignment_count integer := 0;
  v_active_schedule_count integer := 0;
  v_active_linked_schedule_count integer := 0;
  v_changed_link_count integer := 0;
  v_before jsonb;
  v_after jsonb;
  v_repair_id uuid := gen_random_uuid();
  v_rollback_metadata jsonb := COALESCE(p_metadata, '{}'::jsonb)
    || jsonb_build_object('handler_version', 'contract_schedule_matching_v2');
BEGIN
  IF p_command <> 'schedule.realign_contract_invoice_links_v2' THEN
    RAISE EXCEPTION 'Contract schedule matching gateway received an unsupported command';
  END IF;
  IF jsonb_typeof(COALESCE(p_values, '{}'::jsonb)) <> 'object'
     OR COALESCE(p_values, '{}'::jsonb) - 'assignments' <> '{}'::jsonb
     OR jsonb_typeof(p_values -> 'assignments') <> 'array'
  THEN
    RAISE EXCEPTION 'Contract schedule matching values must contain only an assignments array';
  END IF;

  v_contract_id := p_entity_id::uuid;
  v_assignments := p_values -> 'assignments';
  v_assignment_count := jsonb_array_length(v_assignments);
  IF v_assignment_count = 0 THEN
    RAISE EXCEPTION 'Contract schedule matching requires at least one assignment';
  END IF;

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
    RAISE EXCEPTION 'Contract schedule matching finding is invalid, mismatched, or already processed';
  END IF;

  SELECT * INTO v_registry
  FROM public.system_agent_command_registry registry
  WHERE registry.command = p_command
    AND registry.domain = 'contracts'
    AND registry.enabled
    AND registry.reversible
    AND NOT registry.approval_required;
  IF v_registry.command IS NULL OR v_finding.confidence < v_registry.min_confidence THEN
    RAISE EXCEPTION 'Contract schedule matching command is disabled or below its confidence threshold';
  END IF;

  SELECT * INTO v_contract
  FROM public.contracts contract
  WHERE contract.id = v_contract_id AND contract.company_id = p_company_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contract is outside the active company'; END IF;
  IF lower(COALESCE(v_contract.status::text, '')) NOT IN ('active', 'under_legal_procedure')
     OR v_contract.start_date IS NULL OR v_contract.end_date IS NULL
  THEN
    RAISE EXCEPTION 'Contract lifecycle does not permit schedule invoice matching';
  END IF;

  PERFORM 1
  FROM public.contract_payment_schedules schedule
  WHERE schedule.contract_id = v_contract_id AND schedule.company_id = p_company_id
  ORDER BY schedule.id
  FOR UPDATE;

  PERFORM 1
  FROM public.invoices invoice
  WHERE invoice.contract_id = v_contract_id AND invoice.company_id = p_company_id
  ORDER BY invoice.id
  FOR UPDATE;

  SELECT count(*)::integer INTO v_active_schedule_count
  FROM public.contract_payment_schedules schedule
  WHERE schedule.contract_id = v_contract_id
    AND schedule.company_id = p_company_id
    AND lower(COALESCE(schedule.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    );

  SELECT count(*)::integer INTO v_active_linked_schedule_count
  FROM public.contract_payment_schedules schedule
  WHERE schedule.contract_id = v_contract_id
    AND schedule.company_id = p_company_id
    AND schedule.invoice_id IS NOT NULL
    AND lower(COALESCE(schedule.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    );

  IF COALESCE((p_expected_before ->> 'active_schedule_count')::integer, v_active_schedule_count)
       IS DISTINCT FROM v_active_schedule_count
     OR COALESCE((p_expected_before ->> 'active_linked_schedule_count')::integer, v_active_linked_schedule_count)
       IS DISTINCT FROM v_active_linked_schedule_count
     OR v_assignment_count IS DISTINCT FROM v_active_linked_schedule_count
  THEN
    RAISE EXCEPTION 'Contract schedule collection changed after matching detection';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(v_assignments) AS proposed(
      schedule_id uuid, expected_invoice_id uuid, invoice_id uuid
    )
    WHERE proposed.schedule_id IS NULL
       OR proposed.expected_invoice_id IS NULL
       OR proposed.invoice_id IS NULL
  ) OR EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(v_assignments) AS proposed(
      schedule_id uuid, expected_invoice_id uuid, invoice_id uuid
    )
    GROUP BY proposed.schedule_id
    HAVING count(*) > 1
  ) OR EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(v_assignments) AS proposed(
      schedule_id uuid, expected_invoice_id uuid, invoice_id uuid
    )
    GROUP BY proposed.invoice_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Contract schedule matching is incomplete or not one-to-one';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.contract_payment_schedules schedule
    WHERE schedule.contract_id = v_contract_id
      AND schedule.company_id = p_company_id
      AND schedule.invoice_id IS NOT NULL
      AND lower(COALESCE(schedule.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_to_recordset(v_assignments) AS proposed(
          schedule_id uuid, expected_invoice_id uuid, invoice_id uuid
        )
        WHERE proposed.schedule_id = schedule.id
      )
  ) OR EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(v_assignments) AS proposed(
      schedule_id uuid, expected_invoice_id uuid, invoice_id uuid
    )
    LEFT JOIN public.contract_payment_schedules schedule ON schedule.id = proposed.schedule_id
    WHERE schedule.id IS NULL
       OR schedule.company_id <> p_company_id
       OR schedule.contract_id <> v_contract_id
       OR schedule.invoice_id IS NULL
       OR lower(COALESCE(schedule.status, '')) IN (
         'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
       )
       OR schedule.invoice_id IS DISTINCT FROM proposed.expected_invoice_id
  ) THEN
    RAISE EXCEPTION 'Contract schedule matching does not cover the current linked schedule graph';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(v_assignments) AS proposed(
      schedule_id uuid, expected_invoice_id uuid, invoice_id uuid
    )
    JOIN public.contract_payment_schedules schedule ON schedule.id = proposed.schedule_id
    LEFT JOIN public.invoices invoice ON invoice.id = proposed.invoice_id
    WHERE invoice.id IS NULL
       OR invoice.company_id <> p_company_id
       OR invoice.contract_id <> v_contract_id
       OR lower(COALESCE(invoice.status, '')) IN (
         'cancelled', 'canceled', 'void', 'voided', 'deleted'
       )
       OR lower(COALESCE(invoice.payment_status, '')) IN (
         'cancelled', 'canceled', 'void', 'voided'
       )
       OR NOT (
         date_trunc('month', invoice.invoice_date)::date = date_trunc('month', schedule.due_date)::date
         OR date_trunc('month', invoice.due_date)::date = date_trunc('month', schedule.due_date)::date
       )
       OR schedule.due_date < v_contract.start_date
       OR schedule.due_date > v_contract.end_date
       OR COALESCE(schedule.amount, 0) <= 0.01
  ) THEN
    RAISE EXCEPTION 'Contract schedule matching contains an invalid schedule or invoice candidate';
  END IF;

  SELECT count(*)::integer INTO v_changed_link_count
  FROM jsonb_to_recordset(v_assignments) AS proposed(
    schedule_id uuid, expected_invoice_id uuid, invoice_id uuid
  )
  WHERE proposed.expected_invoice_id IS DISTINCT FROM proposed.invoice_id;

  IF v_changed_link_count = 0
     OR COALESCE((p_expected_before ->> 'changed_link_count')::integer, v_changed_link_count)
       IS DISTINCT FROM v_changed_link_count
  THEN
    RAISE EXCEPTION 'Contract schedule matching has no current deterministic changes';
  END IF;

  v_before := public.system_agent_contract_schedule_state(v_contract_id);

  UPDATE public.contract_payment_schedules schedule
  SET invoice_id = NULL, updated_at = now()
  FROM jsonb_to_recordset(v_assignments) AS proposed(
    schedule_id uuid, expected_invoice_id uuid, invoice_id uuid
  )
  WHERE schedule.id = proposed.schedule_id
    AND schedule.company_id = p_company_id
    AND proposed.expected_invoice_id IS DISTINCT FROM proposed.invoice_id;

  UPDATE public.contract_payment_schedules schedule
  SET invoice_id = proposed.invoice_id, updated_at = now()
  FROM jsonb_to_recordset(v_assignments) AS proposed(
    schedule_id uuid, expected_invoice_id uuid, invoice_id uuid
  )
  WHERE schedule.id = proposed.schedule_id
    AND schedule.company_id = p_company_id
    AND proposed.expected_invoice_id IS DISTINCT FROM proposed.invoice_id;

  IF EXISTS (
    SELECT 1
    FROM public.contract_payment_schedules schedule
    WHERE schedule.contract_id = v_contract_id
      AND schedule.company_id = p_company_id
      AND schedule.invoice_id IS NOT NULL
      AND lower(COALESCE(schedule.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
    GROUP BY schedule.invoice_id
    HAVING count(*) > 1
  ) OR EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(v_assignments) AS proposed(
      schedule_id uuid, expected_invoice_id uuid, invoice_id uuid
    )
    JOIN public.contract_payment_schedules schedule ON schedule.id = proposed.schedule_id
    WHERE schedule.invoice_id IS DISTINCT FROM proposed.invoice_id
  ) THEN
    RAISE EXCEPTION 'Contract schedule matching failed postcondition verification';
  END IF;

  v_after := public.system_agent_contract_schedule_state(v_contract_id);
  v_rollback_metadata := v_rollback_metadata || jsonb_build_object(
    'contract_id', v_contract_id,
    'active_schedule_count_before', v_active_schedule_count,
    'active_linked_schedule_count_before', v_active_linked_schedule_count,
    'changed_link_count', v_changed_link_count,
    'assignments', v_assignments
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

REVOKE ALL ON FUNCTION public.system_agent_apply_contract_schedule_matching_repair_v2(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_apply_contract_schedule_matching_repair_v2(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb)
  TO service_role;

DO $$
BEGIN
  IF to_regprocedure('public.system_agent_rollback_repair_before_contract_schedule_matching_v2(uuid,text)') IS NULL THEN
    ALTER FUNCTION public.system_agent_rollback_repair(uuid, text)
      RENAME TO system_agent_rollback_repair_before_contract_schedule_matching_v2;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.system_agent_rollback_repair_before_contract_schedule_matching_v2(uuid,text)
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
  v_contract_id uuid;
  v_current jsonb;
BEGIN
  SELECT * INTO v_repair
  FROM public.system_agent_repairs repair
  WHERE repair.id = p_repair_id
  FOR UPDATE;
  IF v_repair.id IS NULL THEN RAISE EXCEPTION 'Repair was not found'; END IF;

  IF COALESCE(v_repair.rollback_metadata ->> 'handler_version', '') <> 'contract_schedule_matching_v2' THEN
    RETURN public.system_agent_rollback_repair_before_contract_schedule_matching_v2(p_repair_id, p_reason);
  END IF;
  IF v_repair.status <> 'applied' THEN RAISE EXCEPTION 'Repair is not in an applied state'; END IF;

  v_contract_id := (v_repair.rollback_metadata ->> 'contract_id')::uuid;
  v_current := public.system_agent_contract_schedule_state(v_contract_id);
  IF v_current IS DISTINCT FROM v_repair.after_state THEN
    RAISE EXCEPTION 'Contract schedules changed after matching repair; rollback was safely aborted';
  END IF;

  UPDATE public.contract_payment_schedules schedule
  SET
    status = previous.status,
    invoice_id = previous.invoice_id,
    installment_number = previous.installment_number,
    amount = previous.amount,
    paid_amount = previous.paid_amount,
    paid_date = previous.paid_date,
    due_date = previous.due_date,
    updated_at = now()
  FROM jsonb_to_recordset(v_repair.before_state -> 'schedules') AS previous(
    id uuid,
    status text,
    invoice_id uuid,
    installment_number integer,
    amount numeric,
    paid_amount numeric,
    paid_date date,
    due_date date
  )
  WHERE schedule.id = previous.id AND schedule.company_id = v_repair.company_id;

  IF public.system_agent_contract_schedule_state(v_contract_id) IS DISTINCT FROM v_repair.before_state THEN
    RAISE EXCEPTION 'Contract schedule matching rollback failed verification';
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

COMMENT ON FUNCTION public.system_agent_apply_contract_schedule_matching_repair_v2(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb) IS
'Canonical database-validated one-to-one contract schedule invoice matching with full-state rollback.';
