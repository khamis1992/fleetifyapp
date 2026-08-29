-- Canonical, auditable repairs for missing payroll accrual and payment journals.

INSERT INTO public.system_agent_command_registry (
  command, domain, description, entity_table, allowed_fields,
  reversible, approval_required, closed_period_policy, min_confidence, enabled
) VALUES
  (
    'payroll.ensure_accrual', 'employees',
    'Create or relink the one canonical posted payroll accrual.',
    'payroll', ARRAY['status', 'journal_entry_id'],
    true, false, 'block', 1.0, true
  ),
  (
    'payroll.ensure_payment', 'employees',
    'Create the missing canonical payment journal for paid payroll.',
    'payroll', ARRAY['status', 'journal_entry_id'],
    true, false, 'block', 1.0, true
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
CREATE OR REPLACE FUNCTION public.system_agent_payroll_accounting_state_v1(
  p_company_id uuid,
  p_payroll_id uuid
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'status', payroll.status,
    'journal_entry_id', payroll.journal_entry_id,
    'active_accrual_journals', COALESCE((
      SELECT jsonb_agg(entry.id ORDER BY entry.created_at, entry.id)
      FROM public.journal_entries entry
      WHERE entry.company_id = payroll.company_id
        AND entry.reference_type = 'payroll'
        AND entry.reference_id = payroll.id
        AND lower(COALESCE(entry.status, '')) <> 'reversed'
        AND entry.reversal_entry_id IS NULL
    ), '[]'::jsonb),
    'active_payment_journals', COALESCE((
      SELECT jsonb_agg(entry.id ORDER BY entry.created_at, entry.id)
      FROM public.journal_entries entry
      WHERE entry.company_id = payroll.company_id
        AND entry.reference_type = 'payroll_payment'
        AND entry.reference_id = payroll.id
        AND lower(COALESCE(entry.status, '')) <> 'reversed'
        AND entry.reversal_entry_id IS NULL
    ), '[]'::jsonb)
  )
  FROM public.payroll payroll
  WHERE payroll.id = p_payroll_id
    AND payroll.company_id = p_company_id;
$$;
REVOKE ALL ON FUNCTION public.system_agent_payroll_accounting_state_v1(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_payroll_accounting_state_v1(uuid, uuid)
  TO service_role;
CREATE OR REPLACE FUNCTION public.system_agent_apply_payroll_repair_v1(
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
  v_payroll public.payroll%ROWTYPE;
  v_before jsonb;
  v_after jsonb;
  v_before_accrual uuid;
  v_after_accrual uuid;
  v_before_payment uuid;
  v_after_payment uuid;
  v_created_accrual uuid;
  v_created_payment uuid;
  v_repair_id uuid := gen_random_uuid();
BEGIN
  IF p_command NOT IN ('payroll.ensure_accrual', 'payroll.ensure_payment') THEN
    RAISE EXCEPTION 'Command is not handled by the payroll repair gateway';
  END IF;
  IF COALESCE(p_values, '{}'::jsonb) <> '{}'::jsonb THEN
    RAISE EXCEPTION 'Payroll accounting repairs do not accept caller-selected values';
  END IF;

  SELECT * INTO v_job
  FROM public.system_agent_jobs job
  WHERE job.id = p_job_id
    AND job.run_id = p_run_id
    AND job.company_id = p_company_id
  FOR UPDATE;
  IF v_job.id IS NULL OR v_job.status <> 'running' OR v_job.mode <> 'apply'
     OR v_job.domain <> 'employees'
  THEN
    RAISE EXCEPTION 'System agent employee job is not an active apply job';
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
    RAISE EXCEPTION 'Payroll finding is invalid, mismatched, or already processed';
  END IF;

  SELECT * INTO v_registry
  FROM public.system_agent_command_registry registry
  WHERE registry.command = p_command
    AND registry.domain = 'employees'
    AND registry.enabled
    AND registry.reversible
    AND NOT registry.approval_required;
  IF v_registry.command IS NULL OR v_finding.confidence < v_registry.min_confidence THEN
    RAISE EXCEPTION 'Payroll repair command is disabled or below confidence threshold';
  END IF;

  SELECT * INTO v_payroll
  FROM public.payroll payroll
  WHERE payroll.id = p_entity_id::uuid
    AND payroll.company_id = p_company_id
  FOR UPDATE;
  IF v_payroll.id IS NULL THEN RAISE EXCEPTION 'Payroll is outside the active company'; END IF;
  IF NOT (public.system_agent_pick_fields(to_jsonb(v_payroll), v_registry.allowed_fields)
          @> COALESCE(p_expected_before, '{}'::jsonb))
  THEN
    RAISE EXCEPTION 'Payroll changed after detection';
  END IF;

  IF p_command = 'payroll.ensure_accrual' AND lower(COALESCE(v_payroll.status, '')) <> 'approved' THEN
    RAISE EXCEPTION 'Only approved payroll can receive an automatic accrual repair';
  END IF;
  IF p_command = 'payroll.ensure_payment' AND lower(COALESCE(v_payroll.status, '')) <> 'paid' THEN
    RAISE EXCEPTION 'Only paid payroll can receive an automatic payment repair';
  END IF;

  v_before := public.system_agent_payroll_accounting_state_v1(p_company_id, v_payroll.id);
  v_before_accrual := NULLIF(v_before #>> '{active_accrual_journals,0}', '')::uuid;
  v_before_payment := NULLIF(v_before #>> '{active_payment_journals,0}', '')::uuid;

  PERFORM public.transition_payroll_status_v1(
    p_company_id,
    v_payroll.id,
    CASE WHEN p_command = 'payroll.ensure_accrual' THEN 'approved' ELSE 'paid' END,
    NULL
  );

  v_after := public.system_agent_payroll_accounting_state_v1(p_company_id, v_payroll.id);
  v_after_accrual := NULLIF(v_after #>> '{active_accrual_journals,0}', '')::uuid;
  v_after_payment := NULLIF(v_after #>> '{active_payment_journals,0}', '')::uuid;
  IF jsonb_array_length(v_after -> 'active_accrual_journals') > 1
     OR jsonb_array_length(v_after -> 'active_payment_journals') > 1
  THEN
    RAISE EXCEPTION 'Payroll repair produced an ambiguous journal state';
  END IF;
  IF p_command = 'payroll.ensure_accrual'
     AND NULLIF(v_after ->> 'journal_entry_id', '')::uuid IS DISTINCT FROM v_after_accrual
  THEN
    RAISE EXCEPTION 'Payroll accrual repair failed its linkage postcondition';
  END IF;
  IF p_command = 'payroll.ensure_payment' AND v_after_payment IS NULL
     AND COALESCE(v_payroll.net_amount, 0) > 0
  THEN
    RAISE EXCEPTION 'Payroll payment repair failed to create a payment journal';
  END IF;

  v_created_accrual := CASE WHEN v_before_accrual IS NULL THEN v_after_accrual ELSE NULL END;
  v_created_payment := CASE WHEN v_before_payment IS NULL THEN v_after_payment ELSE NULL END;
  IF v_before IS NOT DISTINCT FROM v_after THEN
    UPDATE public.system_agent_findings
    SET status = 'ignored', repair_id = NULL, error = NULL, updated_at = now()
    WHERE id = p_finding_id;
    RETURN jsonb_build_object('status', 'verified_no_change', 'state', v_after);
  END IF;

  INSERT INTO public.system_agent_repairs (
    id, run_id, job_id, finding_id, company_id, domain, command,
    entity_table, entity_id, before_state, after_state, rollback_metadata
  ) VALUES (
    v_repair_id, p_run_id, p_job_id, p_finding_id, p_company_id, 'employees', p_command,
    'payroll', v_payroll.id::text, v_before, v_after,
    COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'handler_version', 'payroll_v1',
      'created_accrual_journal_id', v_created_accrual,
      'created_payment_journal_id', v_created_payment
    )
  );
  UPDATE public.system_agent_findings
  SET status = 'repaired', repair_id = v_repair_id, error = NULL, updated_at = now()
  WHERE id = p_finding_id;

  RETURN jsonb_build_object(
    'status', 'repaired',
    'repair_id', v_repair_id,
    'command', p_command,
    'entity_id', v_payroll.id,
    'before', v_before,
    'after', v_after
  );
END;
$$;
REVOKE ALL ON FUNCTION public.system_agent_apply_payroll_repair_v1(
  uuid, uuid, uuid, text, uuid, text, jsonb, jsonb, jsonb
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_apply_payroll_repair_v1(
  uuid, uuid, uuid, text, uuid, text, jsonb, jsonb, jsonb
) TO service_role;
DO $$
BEGIN
  IF to_regprocedure('public.system_agent_rollback_repair_before_payroll_v1(uuid,text)') IS NULL THEN
    ALTER FUNCTION public.system_agent_rollback_repair(uuid, text)
      RENAME TO system_agent_rollback_repair_before_payroll_v1;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.system_agent_rollback_repair_before_payroll_v1(uuid, text)
  FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.system_agent_reverse_payroll_repair_journal_v1(
  p_repair_id uuid,
  p_journal_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_repair public.system_agent_repairs%ROWTYPE;
  v_journal public.journal_entries%ROWTYPE;
  v_reversal_id uuid := gen_random_uuid();
  v_line_count integer;
  v_debit numeric;
  v_credit numeric;
BEGIN
  SELECT * INTO v_repair FROM public.system_agent_repairs WHERE id = p_repair_id;
  SELECT * INTO v_journal
  FROM public.journal_entries entry
  WHERE entry.id = p_journal_id AND entry.company_id = v_repair.company_id
  FOR UPDATE;
  IF v_repair.id IS NULL OR v_journal.id IS NULL
     OR lower(COALESCE(v_journal.status, '')) <> 'posted'
     OR v_journal.reversal_entry_id IS NOT NULL
  THEN
    RAISE EXCEPTION 'Payroll repair journal changed; rollback was safely aborted';
  END IF;
  IF public.system_agent_date_in_closed_period(v_repair.company_id, v_journal.entry_date) THEN
    RAISE EXCEPTION 'Payroll rollback is blocked by a closed accounting period';
  END IF;
  SELECT count(*), COALESCE(sum(line.debit_amount), 0), COALESCE(sum(line.credit_amount), 0)
  INTO v_line_count, v_debit, v_credit
  FROM public.journal_entry_lines line
  WHERE line.journal_entry_id = v_journal.id;
  IF v_line_count < 2 OR abs(v_debit - v_credit) > 0.01 THEN
    RAISE EXCEPTION 'Payroll repair journal is no longer balanced';
  END IF;

  INSERT INTO public.journal_entries (
    id, company_id, entry_number, entry_date, description, reference_type, reference_id,
    status, total_debit, total_credit, created_by, posted_by, posted_at
  ) VALUES (
    v_reversal_id, v_repair.company_id,
    'JE-PR-R-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || left(v_reversal_id::text, 8),
    CURRENT_DATE, 'Reversal of system agent payroll repair', 'system_agent_reversal', v_repair.id,
    'posted', v_credit, v_debit, v_journal.created_by, v_journal.created_by, now()
  );
  INSERT INTO public.journal_entry_lines (
    journal_entry_id, account_id, employee_id, line_description,
    debit_amount, credit_amount, line_number
  )
  SELECT v_reversal_id, line.account_id, line.employee_id,
    'Reversal: ' || COALESCE(line.line_description, v_journal.description),
    COALESCE(line.credit_amount, 0), COALESCE(line.debit_amount, 0), line.line_number
  FROM public.journal_entry_lines line
  WHERE line.journal_entry_id = v_journal.id
  ORDER BY line.line_number;

  UPDATE public.journal_entries
  SET status = 'reversed', reversal_entry_id = v_reversal_id,
      reversed_at = now(), reversed_by = v_journal.created_by, updated_at = now()
  WHERE id = v_journal.id AND company_id = v_repair.company_id;
  RETURN v_reversal_id;
END;
$$;
REVOKE ALL ON FUNCTION public.system_agent_reverse_payroll_repair_journal_v1(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_reverse_payroll_repair_journal_v1(uuid, uuid)
  TO service_role;
CREATE OR REPLACE FUNCTION public.system_agent_rollback_repair(
  p_repair_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_repair public.system_agent_repairs%ROWTYPE;
  v_payroll public.payroll%ROWTYPE;
  v_current jsonb;
  v_created_accrual uuid;
  v_created_payment uuid;
  v_accrual_reversal uuid;
  v_payment_reversal uuid;
BEGIN
  SELECT * INTO v_repair
  FROM public.system_agent_repairs repair
  WHERE repair.id = p_repair_id
  FOR UPDATE;
  IF v_repair.id IS NULL THEN RAISE EXCEPTION 'Repair was not found'; END IF;
  IF COALESCE(v_repair.rollback_metadata ->> 'handler_version', '') <> 'payroll_v1' THEN
    RETURN public.system_agent_rollback_repair_before_payroll_v1(p_repair_id, p_reason);
  END IF;
  IF v_repair.status = 'rolled_back' THEN
    RETURN jsonb_build_object('repair_id', p_repair_id, 'status', 'rolled_back');
  END IF;
  IF v_repair.status <> 'applied' THEN RAISE EXCEPTION 'Only an applied repair can be rolled back'; END IF;

  SELECT * INTO v_payroll
  FROM public.payroll payroll
  WHERE payroll.id = v_repair.entity_id::uuid
    AND payroll.company_id = v_repair.company_id
  FOR UPDATE;
  IF v_payroll.id IS NULL THEN RAISE EXCEPTION 'Payroll was not found'; END IF;
  v_current := public.system_agent_payroll_accounting_state_v1(v_repair.company_id, v_payroll.id);
  IF v_current IS DISTINCT FROM v_repair.after_state THEN
    RAISE EXCEPTION 'Payroll accounting state changed after repair; rollback was safely aborted';
  END IF;

  v_created_payment := NULLIF(v_repair.rollback_metadata ->> 'created_payment_journal_id', '')::uuid;
  v_created_accrual := NULLIF(v_repair.rollback_metadata ->> 'created_accrual_journal_id', '')::uuid;
  IF v_created_payment IS NOT NULL THEN
    v_payment_reversal := public.system_agent_reverse_payroll_repair_journal_v1(p_repair_id, v_created_payment);
  END IF;
  IF v_created_accrual IS NOT NULL THEN
    v_accrual_reversal := public.system_agent_reverse_payroll_repair_journal_v1(p_repair_id, v_created_accrual);
  END IF;

  PERFORM set_config('app.payroll_transition_v1', 'authorized', true);
  UPDATE public.payroll
  SET journal_entry_id = NULLIF(v_repair.before_state ->> 'journal_entry_id', '')::uuid,
      updated_at = now()
  WHERE id = v_payroll.id AND company_id = v_repair.company_id;

  UPDATE public.system_agent_repairs
  SET status = 'rolled_back', rolled_back_at = now(),
      rollback_reason = left(COALESCE(NULLIF(BTRIM(p_reason), ''), 'System agent rollback'), 1000),
      rollback_metadata = rollback_metadata || jsonb_build_object(
        'accrual_reversal_entry_id', v_accrual_reversal,
        'payment_reversal_entry_id', v_payment_reversal
      ),
      error = NULL, updated_at = now()
  WHERE id = p_repair_id;
  UPDATE public.system_agent_findings
  SET status = 'rolled_back', error = NULL, updated_at = now()
  WHERE id = v_repair.finding_id;

  RETURN jsonb_build_object(
    'repair_id', p_repair_id,
    'status', 'rolled_back',
    'accrual_reversal_entry_id', v_accrual_reversal,
    'payment_reversal_entry_id', v_payment_reversal
  );
END;
$$;
REVOKE ALL ON FUNCTION public.system_agent_rollback_repair(uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_rollback_repair(uuid, text)
  TO service_role;
