-- Canonical schedule-to-invoice repairs without delegating mutations to the
-- legacy generic system-agent gateway.

CREATE OR REPLACE FUNCTION public.system_agent_apply_contract_invoice_repair_v3(
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
  v_before jsonb;
  v_after jsonb;
  v_expected_matches boolean := false;
  v_candidate_id uuid;
  v_candidate_count integer := 0;
  v_created_invoice_id uuid;
  v_repair_id uuid := gen_random_uuid();
  v_month date;
  v_repair_metadata jsonb := COALESCE(p_metadata, '{}'::jsonb)
    || jsonb_build_object('handler_version', 'contract_invoice_v3');
BEGIN
  IF p_command NOT IN ('schedule.link_invoice', 'contract.generate_missing_invoice') THEN
    RAISE EXCEPTION 'Canonical contract invoice gateway received an unsupported command';
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
    RAISE EXCEPTION 'Contract invoice finding is invalid, mismatched, or already processed';
  END IF;

  SELECT * INTO v_registry
  FROM public.system_agent_command_registry registry
  WHERE registry.command = p_command
    AND registry.enabled
    AND registry.reversible
    AND NOT registry.approval_required;
  IF v_registry.command IS NULL OR v_registry.domain <> 'contracts'
     OR v_finding.confidence < v_registry.min_confidence
  THEN
    RAISE EXCEPTION 'Contract invoice command is disabled or below confidence threshold';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM jsonb_object_keys(COALESCE(p_values, '{}'::jsonb)) supplied(field_name)
    WHERE NOT (supplied.field_name = ANY(v_registry.allowed_fields))
  ) THEN
    RAISE EXCEPTION 'Repair payload contains a field outside the command registry';
  END IF;

  SELECT * INTO v_schedule
  FROM public.contract_payment_schedules schedule
  WHERE schedule.id = p_entity_id::uuid AND schedule.company_id = p_company_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment schedule is outside the active company'; END IF;

  SELECT * INTO v_contract
  FROM public.contracts contract
  WHERE contract.id = v_schedule.contract_id AND contract.company_id = p_company_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Schedule contract is outside the active company'; END IF;

  IF lower(COALESCE(v_schedule.status, '')) IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
     OR lower(COALESCE(v_contract.status::text, '')) NOT IN ('active', 'under_legal_procedure')
     OR v_contract.start_date IS NULL
     OR v_contract.end_date IS NULL
     OR v_schedule.due_date < v_contract.start_date
     OR v_schedule.due_date > v_contract.end_date
  THEN
    RAISE EXCEPTION 'Schedule and contract lifecycle do not permit automatic invoicing';
  END IF;

  v_month := date_trunc('month', v_schedule.due_date)::date;
  v_before := public.system_agent_pick_fields(to_jsonb(v_schedule), v_registry.allowed_fields);
  v_expected_matches := COALESCE(p_expected_before, '{}'::jsonb) = '{}'::jsonb
    OR v_before @> p_expected_before;

  IF v_registry.closed_period_policy = 'block'
     AND public.system_agent_date_in_closed_period(p_company_id, v_schedule.due_date)
  THEN
    RAISE EXCEPTION 'Contract invoice repair is blocked by a closed accounting period';
  END IF;

  IF p_command = 'schedule.link_invoice' THEN
    SELECT COUNT(*), (array_agg(invoice.id ORDER BY invoice.id))[1]
    INTO v_candidate_count, v_candidate_id
    FROM public.invoices invoice
    WHERE invoice.company_id = p_company_id
      AND invoice.contract_id = v_contract.id
      AND date_trunc('month', COALESCE(invoice.invoice_date, invoice.due_date))::date = v_month
      AND date_trunc('month', COALESCE(invoice.due_date, invoice.invoice_date))::date = v_month
      AND lower(COALESCE(invoice.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
      AND lower(COALESCE(invoice.payment_status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided');

    IF v_candidate_count <> 1 THEN
      RAISE EXCEPTION 'Schedule no longer has one unambiguous active same-month invoice';
    END IF;
    IF p_values ? 'invoice_id' AND (p_values ->> 'invoice_id')::uuid IS DISTINCT FROM v_candidate_id THEN
      RAISE EXCEPTION 'Worker proposal no longer matches the canonical invoice candidate';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM public.contract_payment_schedules other_schedule
      WHERE other_schedule.company_id = p_company_id
        AND other_schedule.id <> v_schedule.id
        AND other_schedule.invoice_id = v_candidate_id
        AND lower(COALESCE(other_schedule.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
    ) THEN
      RAISE EXCEPTION 'Canonical invoice candidate is already linked to another active schedule';
    END IF;

    IF v_schedule.invoice_id IS NOT DISTINCT FROM v_candidate_id THEN
      v_after := v_before;
    ELSE
      IF v_schedule.invoice_id IS NOT NULL THEN
        RAISE EXCEPTION 'Existing invoice link requires an approved atomic swap';
      END IF;
      IF NOT v_expected_matches THEN
        RAISE EXCEPTION 'Schedule changed after detection and is still inconsistent';
      END IF;
      UPDATE public.contract_payment_schedules schedule
      SET invoice_id = v_candidate_id, updated_at = now()
      WHERE schedule.id = v_schedule.id AND schedule.company_id = p_company_id;
      SELECT * INTO v_schedule FROM public.contract_payment_schedules WHERE id = p_entity_id::uuid;
      v_after := public.system_agent_pick_fields(to_jsonb(v_schedule), v_registry.allowed_fields);
      IF v_schedule.invoice_id IS DISTINCT FROM v_candidate_id THEN
        RAISE EXCEPTION 'Schedule invoice link failed postcondition verification';
      END IF;
    END IF;

  ELSE
    IF COALESCE(v_schedule.amount, 0) <= 0.01 THEN
      RAISE EXCEPTION 'Zero-value schedules do not receive automatic invoices';
    END IF;

    IF v_schedule.invoice_id IS NOT NULL THEN
      SELECT * INTO v_invoice
      FROM public.invoices invoice
      WHERE invoice.id = v_schedule.invoice_id
        AND invoice.company_id = p_company_id
        AND invoice.contract_id = v_contract.id
        AND date_trunc('month', COALESCE(invoice.invoice_date, invoice.due_date))::date = v_month
        AND lower(COALESCE(invoice.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted');
      IF FOUND THEN
        v_after := v_before;
      ELSE
        RAISE EXCEPTION 'Existing schedule invoice link is not a valid generated outcome';
      END IF;
    ELSE
      IF NOT v_expected_matches THEN
        RAISE EXCEPTION 'Schedule changed after detection and is still missing an invoice';
      END IF;
      IF EXISTS (
        SELECT 1
        FROM public.invoices invoice
        WHERE invoice.company_id = p_company_id
          AND invoice.contract_id = v_contract.id
          AND (
            date_trunc('month', COALESCE(invoice.invoice_date, invoice.due_date))::date = v_month
            OR date_trunc('month', COALESCE(invoice.due_date, invoice.invoice_date))::date = v_month
          )
      ) THEN
        RAISE EXCEPTION 'Invoice month is already occupied and requires link or cancellation review';
      END IF;

      PERFORM pg_advisory_xact_lock(
        hashtextextended(p_company_id::text || ':' || to_char(v_month, 'YYYY-MM'), 0)
      );
      v_created_invoice_id := public.generate_invoice_for_contract_month(v_contract.id, v_month);
      IF v_created_invoice_id IS NULL THEN
        RAISE EXCEPTION 'Invoice generator did not create a monthly invoice';
      END IF;

      SELECT * INTO v_invoice
      FROM public.invoices invoice
      WHERE invoice.id = v_created_invoice_id
        AND invoice.company_id = p_company_id
        AND invoice.contract_id = v_contract.id
      FOR UPDATE;
      IF NOT FOUND
         OR date_trunc('month', COALESCE(v_invoice.invoice_date, v_invoice.due_date))::date <> v_month
         OR date_trunc('month', COALESCE(v_invoice.due_date, v_invoice.invoice_date))::date <> v_month
      THEN
        RAISE EXCEPTION 'Generated invoice failed company, contract, or month verification';
      END IF;

      IF abs(COALESCE(v_invoice.total_amount, 0) - COALESCE(v_schedule.amount, 0)) > 0.01 THEN
        PERFORM public.update_draft_invoice_amount_atomic(
          v_invoice.id,
          p_company_id,
          v_schedule.amount,
          'System agent: align newly generated invoice with its schedule',
          NULL
        );
      END IF;

      UPDATE public.contract_payment_schedules schedule
      SET invoice_id = v_created_invoice_id, updated_at = now()
      WHERE schedule.id = v_schedule.id AND schedule.company_id = p_company_id;

      SELECT * INTO v_schedule FROM public.contract_payment_schedules WHERE id = p_entity_id::uuid;
      SELECT * INTO v_invoice FROM public.invoices WHERE id = v_created_invoice_id;
      v_after := public.system_agent_pick_fields(to_jsonb(v_schedule), v_registry.allowed_fields);
      IF v_schedule.invoice_id IS DISTINCT FROM v_created_invoice_id
         OR abs(COALESCE(v_invoice.total_amount, 0) - COALESCE(v_schedule.amount, 0)) > 0.01
      THEN
        RAISE EXCEPTION 'Generated invoice or schedule link failed postcondition verification';
      END IF;
      v_repair_metadata := v_repair_metadata
        || jsonb_build_object('created_invoice_id', v_created_invoice_id, 'invoice_month', v_month);
    END IF;
  END IF;

  IF v_before IS NOT DISTINCT FROM v_after THEN
    UPDATE public.system_agent_findings finding
    SET status = 'ignored', repair_id = NULL, error = NULL, updated_at = now()
    WHERE finding.id = p_finding_id;
    RETURN jsonb_build_object(
      'status', 'verified_no_change',
      'command', p_command,
      'entity_id', p_entity_id,
      'state', v_after
    );
  END IF;

  INSERT INTO public.system_agent_repairs (
    id, run_id, job_id, finding_id, company_id, domain, command,
    entity_table, entity_id, before_state, after_state, rollback_metadata
  ) VALUES (
    v_repair_id, p_run_id, p_job_id, p_finding_id, p_company_id, 'contracts', p_command,
    v_registry.entity_table, p_entity_id, v_before, v_after, v_repair_metadata
  );

  UPDATE public.system_agent_findings finding
  SET status = 'repaired', repair_id = v_repair_id, error = NULL, updated_at = now()
  WHERE finding.id = p_finding_id;

  RETURN jsonb_build_object(
    'status', 'repaired',
    'repair_id', v_repair_id,
    'command', p_command,
    'entity_id', p_entity_id,
    'before', v_before,
    'after', v_after
  );
END;
$$;
REVOKE ALL ON FUNCTION public.system_agent_apply_contract_invoice_repair_v3(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_apply_contract_invoice_repair_v3(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb)
  TO service_role;
COMMENT ON FUNCTION public.system_agent_apply_contract_invoice_repair_v3(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb) IS
'Canonical schedule invoice link and generation gateway with source derivation, month locking, postcondition verification, audit, and legacy-compatible rollback state.';
