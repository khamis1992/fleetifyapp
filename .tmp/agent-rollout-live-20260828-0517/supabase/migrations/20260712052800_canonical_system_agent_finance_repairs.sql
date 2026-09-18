-- Route system-agent finance repairs through canonical accounting commands.
-- The worker proposal is treated as evidence only; all target values are
-- recalculated and verified inside this transaction.

UPDATE public.system_agent_command_registry
SET
  allowed_fields = ARRAY['paid_amount', 'balance_due', 'payment_status', 'status'],
  description = 'Recalculate invoice balance and display status from the canonical allocation ledger.',
  updated_at = now()
WHERE command = 'invoice.recalculate_balance';
UPDATE public.system_agent_command_registry
SET
  allowed_fields = ARRAY['subtotal', 'total_amount', 'paid_amount', 'balance_due', 'payment_status', 'status'],
  description = 'Align a history-free invoice amount with its one linked payment schedule.',
  updated_at = now()
WHERE command = 'invoice.sync_zero_impact_amount';
UPDATE public.system_agent_command_registry
SET
  allowed_fields = ARRAY['status', 'payment_status', 'paid_amount', 'balance_due', 'notes'],
  description = 'Cancel a zero-impact invoice through the approved invoice cancellation workflow.',
  updated_at = now()
WHERE command = 'invoice.cancel_zero_safe';
UPDATE public.system_agent_command_registry
SET
  allowed_fields = ARRAY['invoice_id', 'journal_entry_id', 'allocation_status', 'allocations'],
  description = 'Allocate an unlinked completed receipt to its one unambiguous invoice.',
  updated_at = now()
WHERE command = 'payment.link_clear_invoice';
CREATE OR REPLACE FUNCTION public.system_agent_active_invoice_allocations(p_payment_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object('invoice_id', allocation.target_id, 'amount', allocation.amount)
      ORDER BY allocation.allocation_order
    ),
    '[]'::jsonb
  )
  FROM public.payment_allocations allocation
  WHERE allocation.payment_id = p_payment_id
    AND allocation.allocation_type = 'invoice'
    AND allocation.is_active = true;
$$;
REVOKE ALL ON FUNCTION public.system_agent_active_invoice_allocations(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_active_invoice_allocations(uuid)
  TO service_role;
CREATE OR REPLACE FUNCTION public.system_agent_apply_finance_repair(
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
  v_invoice public.invoices%ROWTYPE;
  v_schedule public.contract_payment_schedules%ROWTYPE;
  v_payment public.payments%ROWTYPE;
  v_journal public.journal_entries%ROWTYPE;
  v_entity_uuid uuid;
  v_before jsonb;
  v_after jsonb;
  v_expected_matches boolean := false;
  v_effective_date date;
  v_repair_id uuid := gen_random_uuid();
  v_rollback_metadata jsonb := COALESCE(p_metadata, '{}'::jsonb)
    || jsonb_build_object('handler_version', 'finance_v2');
  v_paid numeric := 0;
  v_balance numeric := 0;
  v_expected_payment_status text;
  v_expected_status text;
  v_latest_paid_date date;
  v_schedule_amount numeric;
  v_schedule_id uuid;
  v_schedule_count integer := 0;
  v_candidate_id uuid;
  v_candidate_count integer := 0;
  v_before_allocations jsonb := '[]'::jsonb;
  v_after_allocations jsonb := '[]'::jsonb;
  v_line_count integer := 0;
  v_line_debit numeric := 0;
  v_line_credit numeric := 0;
  v_previous_bypass text := COALESCE(current_setting('app.financial_controls_bypass', true), '');
BEGIN
  IF p_command NOT IN (
    'contract.recalculate_totals',
    'invoice.recalculate_balance',
    'invoice.sync_zero_impact_amount',
    'invoice.cancel_zero_safe',
    'schedule.sync_payment_state',
    'payment.correct_uncompleted_date',
    'payment.link_clear_invoice',
    'accounting.sync_draft_journal_totals'
  ) THEN
    RAISE EXCEPTION 'Command is not handled by the canonical finance repair gateway';
  END IF;

  v_entity_uuid := p_entity_id::uuid;

  SELECT * INTO v_job
  FROM public.system_agent_jobs job
  WHERE job.id = p_job_id
    AND job.run_id = p_run_id
    AND job.company_id = p_company_id
  FOR UPDATE;

  IF v_job.id IS NULL OR v_job.status <> 'running' OR v_job.mode <> 'apply' THEN
    RAISE EXCEPTION 'System agent job is not an active apply job';
  END IF;

  SELECT * INTO v_finding
  FROM public.system_agent_findings finding
  WHERE finding.id = p_finding_id
    AND finding.run_id = p_run_id
    AND finding.job_id = p_job_id
    AND finding.company_id = p_company_id
  FOR UPDATE;

  IF v_finding.id IS NULL THEN
    RAISE EXCEPTION 'System agent finding is outside the active job scope';
  END IF;
  IF v_finding.status IN ('repaired', 'rolled_back') THEN
    RAISE EXCEPTION 'System agent finding has already been processed';
  END IF;
  IF v_finding.repair_command IS DISTINCT FROM p_command
     OR v_finding.entity_id IS DISTINCT FROM p_entity_id
  THEN
    RAISE EXCEPTION 'Repair command or entity does not match the finding plan';
  END IF;

  SELECT * INTO v_registry
  FROM public.system_agent_command_registry registry
  WHERE registry.command = p_command
    AND registry.enabled
    AND registry.reversible
    AND NOT registry.approval_required;

  IF v_registry.command IS NULL OR v_registry.domain <> v_job.domain THEN
    RAISE EXCEPTION 'Repair command is disabled or registered for another worker';
  END IF;
  IF v_finding.confidence < v_registry.min_confidence THEN
    RAISE EXCEPTION 'Finding confidence is below the registered command threshold';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM jsonb_object_keys(COALESCE(p_values, '{}'::jsonb)) supplied(field_name)
    WHERE NOT (supplied.field_name = ANY(v_registry.allowed_fields))
  ) THEN
    RAISE EXCEPTION 'Repair payload contains a field outside the command registry';
  END IF;

  IF p_command = 'contract.recalculate_totals' THEN
    SELECT * INTO v_contract
    FROM public.contracts contract
    WHERE contract.id = v_entity_uuid AND contract.company_id = p_company_id
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Contract was not found in the requested company'; END IF;

    v_effective_date := v_contract.contract_date;
    v_before := public.system_agent_pick_fields(to_jsonb(v_contract), v_registry.allowed_fields);
    v_expected_matches := COALESCE(p_expected_before, '{}'::jsonb) = '{}'::jsonb
      OR v_before @> p_expected_before;
    v_paid := public.canonical_contract_paid_amount(v_contract.id);
    v_balance := GREATEST(COALESCE(v_contract.contract_amount, 0) - v_paid, 0);
    v_expected_payment_status := CASE
      WHEN v_paid <= 0.01 THEN 'unpaid'
      WHEN v_paid >= COALESCE(v_contract.contract_amount, 0) - 0.01 THEN 'paid'
      ELSE 'partial'
    END;

    IF abs(COALESCE(v_contract.total_paid, 0) - v_paid) <= 0.01
       AND abs(COALESCE(v_contract.balance_due, 0) - v_balance) <= 0.01
       AND lower(COALESCE(v_contract.payment_status, '')) = v_expected_payment_status
    THEN
      v_after := v_before;
    ELSE
      IF NOT v_expected_matches THEN
        RAISE EXCEPTION 'Contract changed after detection and is still inconsistent';
      END IF;
      PERFORM public.recalculate_contract_financial_state(v_contract.id);
      SELECT * INTO v_contract FROM public.contracts WHERE id = v_entity_uuid;
      v_after := public.system_agent_pick_fields(to_jsonb(v_contract), v_registry.allowed_fields);
      IF abs(COALESCE(v_contract.total_paid, 0) - v_paid) > 0.01
         OR abs(COALESCE(v_contract.balance_due, 0) - v_balance) > 0.01
         OR lower(COALESCE(v_contract.payment_status, '')) <> v_expected_payment_status
      THEN
        RAISE EXCEPTION 'Contract totals failed canonical postcondition verification';
      END IF;
    END IF;

    v_rollback_metadata := v_rollback_metadata || jsonb_build_object('canonical_paid', v_paid);

  ELSIF p_command = 'invoice.recalculate_balance' THEN
    SELECT * INTO v_invoice
    FROM public.invoices invoice
    WHERE invoice.id = v_entity_uuid AND invoice.company_id = p_company_id
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Invoice was not found in the requested company'; END IF;

    v_effective_date := v_invoice.invoice_date;
    v_before := public.system_agent_pick_fields(to_jsonb(v_invoice), v_registry.allowed_fields);
    v_expected_matches := COALESCE(p_expected_before, '{}'::jsonb) = '{}'::jsonb
      OR v_before @> p_expected_before;
    v_paid := public.canonical_invoice_paid_amount(v_invoice.id, NULL);
    v_balance := GREATEST(COALESCE(v_invoice.total_amount, 0) - v_paid, 0);
    v_expected_payment_status := CASE
      WHEN v_paid <= 0.01 THEN 'unpaid'
      WHEN v_paid >= COALESCE(v_invoice.total_amount, 0) - 0.01 THEN 'paid'
      ELSE 'partial'
    END;
    v_expected_status := CASE
      WHEN lower(COALESCE(v_invoice.status, '')) IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
        THEN v_invoice.status
      WHEN v_paid >= COALESCE(v_invoice.total_amount, 0) - 0.01 THEN 'paid'
      WHEN v_invoice.due_date IS NOT NULL AND v_invoice.due_date < CURRENT_DATE THEN 'overdue'
      WHEN lower(COALESCE(v_invoice.status, '')) = 'draft' THEN 'draft'
      ELSE 'pending'
    END;

    IF abs(COALESCE(v_invoice.paid_amount, 0) - v_paid) <= 0.01
       AND abs(COALESCE(v_invoice.balance_due, 0) - v_balance) <= 0.01
       AND lower(COALESCE(v_invoice.payment_status, '')) = lower(v_expected_payment_status)
       AND lower(COALESCE(v_invoice.status, '')) = lower(COALESCE(v_expected_status, ''))
    THEN
      v_after := v_before;
    ELSE
      IF NOT v_expected_matches THEN
        RAISE EXCEPTION 'Invoice changed after detection and is still inconsistent';
      END IF;
      PERFORM public.recalculate_invoice_financial_state(v_invoice.id);
      SELECT * INTO v_invoice FROM public.invoices WHERE id = v_entity_uuid;
      v_after := public.system_agent_pick_fields(to_jsonb(v_invoice), v_registry.allowed_fields);
      IF abs(COALESCE(v_invoice.paid_amount, 0) - v_paid) > 0.01
         OR abs(COALESCE(v_invoice.balance_due, 0) - v_balance) > 0.01
         OR lower(COALESCE(v_invoice.payment_status, '')) <> lower(v_expected_payment_status)
         OR lower(COALESCE(v_invoice.status, '')) <> lower(COALESCE(v_expected_status, ''))
      THEN
        RAISE EXCEPTION 'Invoice balance failed canonical postcondition verification';
      END IF;
    END IF;

    v_rollback_metadata := v_rollback_metadata || jsonb_build_object('canonical_paid', v_paid);

  ELSIF p_command = 'schedule.sync_payment_state' THEN
    SELECT * INTO v_schedule
    FROM public.contract_payment_schedules schedule
    WHERE schedule.id = v_entity_uuid AND schedule.company_id = p_company_id
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Payment schedule was not found in the requested company'; END IF;

    SELECT * INTO v_invoice
    FROM public.invoices invoice
    WHERE invoice.id = v_schedule.invoice_id
      AND invoice.company_id = p_company_id
      AND invoice.contract_id = v_schedule.contract_id
      AND lower(COALESCE(invoice.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
    FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Schedule has no active same-contract invoice for canonical payment-state repair';
    END IF;

    v_effective_date := v_schedule.due_date;
    v_before := public.system_agent_pick_fields(to_jsonb(v_schedule), v_registry.allowed_fields);
    v_expected_matches := COALESCE(p_expected_before, '{}'::jsonb) = '{}'::jsonb
      OR v_before @> p_expected_before;
    v_paid := LEAST(GREATEST(public.canonical_invoice_paid_amount(v_invoice.id, NULL), 0), COALESCE(v_schedule.amount, 0));
    v_expected_status := CASE
      WHEN COALESCE(v_schedule.amount, 0) - v_paid <= 0.01 THEN 'paid'
      WHEN v_paid > 0.01 THEN 'partially_paid'
      WHEN v_schedule.due_date < CURRENT_DATE THEN 'overdue'
      ELSE 'pending'
    END;

    SELECT MAX(source.payment_date) INTO v_latest_paid_date
    FROM (
      SELECT payment.payment_date
      FROM public.payment_allocations allocation
      JOIN public.payments payment ON payment.id = allocation.payment_id
      WHERE allocation.allocation_type = 'invoice'
        AND allocation.target_id = v_invoice.id
        AND allocation.is_active = true
        AND lower(COALESCE(payment.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded')
        AND lower(COALESCE(payment.transaction_type::text, 'receipt')) = 'receipt'
      UNION ALL
      SELECT payment.payment_date
      FROM public.payments payment
      WHERE payment.invoice_id = v_invoice.id
        AND lower(COALESCE(payment.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded')
        AND lower(COALESCE(payment.transaction_type::text, 'receipt')) = 'receipt'
        AND NOT EXISTS (
          SELECT 1 FROM public.payment_allocations allocation
          WHERE allocation.payment_id = payment.id
            AND allocation.allocation_type = 'invoice'
            AND allocation.is_active = true
        )
    ) source;
    IF v_expected_status <> 'paid' THEN v_latest_paid_date := NULL; END IF;

    IF abs(COALESCE(v_schedule.paid_amount, 0) - v_paid) <= 0.01
       AND lower(COALESCE(v_schedule.status, '')) = lower(v_expected_status)
       AND v_schedule.paid_date IS NOT DISTINCT FROM v_latest_paid_date
    THEN
      v_after := v_before;
    ELSE
      IF NOT v_expected_matches THEN
        RAISE EXCEPTION 'Payment schedule changed after detection and is still inconsistent';
      END IF;
      UPDATE public.contract_payment_schedules schedule
      SET
        paid_amount = round(v_paid::numeric, 2),
        status = v_expected_status,
        paid_date = v_latest_paid_date,
        updated_at = now()
      WHERE schedule.id = v_entity_uuid AND schedule.company_id = p_company_id;
      SELECT * INTO v_schedule FROM public.contract_payment_schedules WHERE id = v_entity_uuid;
      v_after := public.system_agent_pick_fields(to_jsonb(v_schedule), v_registry.allowed_fields);
      IF abs(COALESCE(v_schedule.paid_amount, 0) - v_paid) > 0.01
         OR lower(COALESCE(v_schedule.status, '')) <> lower(v_expected_status)
         OR v_schedule.paid_date IS DISTINCT FROM v_latest_paid_date
      THEN
        RAISE EXCEPTION 'Schedule payment state failed canonical postcondition verification';
      END IF;
    END IF;

    v_rollback_metadata := v_rollback_metadata || jsonb_build_object('invoice_id', v_invoice.id);

  ELSIF p_command = 'invoice.sync_zero_impact_amount' THEN
    SELECT * INTO v_invoice
    FROM public.invoices invoice
    WHERE invoice.id = v_entity_uuid AND invoice.company_id = p_company_id
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Invoice was not found in the requested company'; END IF;

    SELECT
      COUNT(*),
      (array_agg(schedule.id ORDER BY schedule.id))[1],
      (array_agg(schedule.amount ORDER BY schedule.id))[1]
    INTO v_schedule_count, v_schedule_id, v_schedule_amount
    FROM public.contract_payment_schedules schedule
    WHERE schedule.company_id = p_company_id
      AND schedule.invoice_id = v_invoice.id
      AND schedule.contract_id = v_invoice.contract_id
      AND lower(COALESCE(schedule.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted');

    IF v_schedule_count <> 1 OR COALESCE(v_schedule_amount, 0) <= 0.01 THEN
      RAISE EXCEPTION 'Invoice does not have one positive active linked schedule amount';
    END IF;
    IF p_values ? 'total_amount'
       AND abs((p_values ->> 'total_amount')::numeric - v_schedule_amount) > 0.01
    THEN
      RAISE EXCEPTION 'Worker proposal no longer matches the linked schedule amount';
    END IF;

    v_effective_date := v_invoice.invoice_date;
    v_before := public.system_agent_pick_fields(to_jsonb(v_invoice), v_registry.allowed_fields);
    v_expected_matches := COALESCE(p_expected_before, '{}'::jsonb) = '{}'::jsonb
      OR v_before @> p_expected_before;

    IF abs(COALESCE(v_invoice.total_amount, 0) - v_schedule_amount) <= 0.01
       AND abs(COALESCE(v_invoice.balance_due, 0) - v_schedule_amount) <= 0.01
       AND abs(COALESCE(v_invoice.paid_amount, 0)) <= 0.01
       AND lower(COALESCE(v_invoice.payment_status, '')) = 'unpaid'
    THEN
      v_after := v_before;
    ELSE
      IF NOT v_expected_matches THEN
        RAISE EXCEPTION 'Invoice changed after detection and is still inconsistent';
      END IF;
      IF v_registry.closed_period_policy = 'block'
         AND public.system_agent_date_in_closed_period(p_company_id, v_effective_date)
      THEN
        RAISE EXCEPTION 'Invoice amount repair is blocked by a closed accounting period';
      END IF;
      PERFORM public.update_draft_invoice_amount_atomic(
        v_invoice.id,
        p_company_id,
        v_schedule_amount,
        'System agent: align history-free invoice with linked schedule',
        NULL
      );
      SELECT * INTO v_invoice FROM public.invoices WHERE id = v_entity_uuid;
      v_after := public.system_agent_pick_fields(to_jsonb(v_invoice), v_registry.allowed_fields);
      IF abs(COALESCE(v_invoice.total_amount, 0) - v_schedule_amount) > 0.01
         OR abs(COALESCE(v_invoice.balance_due, 0) - v_schedule_amount) > 0.01
         OR abs(COALESCE(v_invoice.paid_amount, 0)) > 0.01
         OR lower(COALESCE(v_invoice.payment_status, '')) <> 'unpaid'
      THEN
        RAISE EXCEPTION 'Invoice amount failed canonical postcondition verification';
      END IF;
    END IF;

    v_rollback_metadata := v_rollback_metadata
      || jsonb_build_object('schedule_id', v_schedule_id, 'schedule_amount', v_schedule_amount);

  ELSIF p_command = 'invoice.cancel_zero_safe' THEN
    SELECT * INTO v_invoice
    FROM public.invoices invoice
    WHERE invoice.id = v_entity_uuid AND invoice.company_id = p_company_id
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Invoice was not found in the requested company'; END IF;

    v_effective_date := v_invoice.invoice_date;
    v_before := public.system_agent_pick_fields(to_jsonb(v_invoice), v_registry.allowed_fields);
    v_expected_matches := COALESCE(p_expected_before, '{}'::jsonb) = '{}'::jsonb
      OR v_before @> p_expected_before;

    IF lower(COALESCE(v_invoice.status, '')) IN ('cancelled', 'canceled', 'void', 'voided')
       AND lower(COALESCE(v_invoice.payment_status, '')) IN ('cancelled', 'canceled', 'void', 'voided')
       AND abs(COALESCE(v_invoice.paid_amount, 0)) <= 0.01
       AND abs(COALESCE(v_invoice.balance_due, 0)) <= 0.01
    THEN
      v_after := v_before;
    ELSE
      IF NOT v_expected_matches THEN
        RAISE EXCEPTION 'Invoice changed after detection and is still inconsistent';
      END IF;
      IF abs(COALESCE(v_invoice.total_amount, 0)) > 0.01
         OR abs(COALESCE(v_invoice.paid_amount, 0)) > 0.01
         OR abs(COALESCE(v_invoice.balance_due, 0)) > 0.01
         OR v_invoice.journal_entry_id IS NOT NULL
         OR EXISTS (
           SELECT 1 FROM public.journal_entries entry
           WHERE entry.company_id = p_company_id
             AND entry.reference_type = 'invoice'
             AND entry.reference_id = v_invoice.id
         )
      THEN
        RAISE EXCEPTION 'Invoice has financial impact and cannot be auto-cancelled';
      END IF;
      IF v_registry.closed_period_policy = 'block'
         AND public.system_agent_date_in_closed_period(p_company_id, v_effective_date)
      THEN
        RAISE EXCEPTION 'Invoice cancellation is blocked by a closed accounting period';
      END IF;
      PERFORM public.cancel_invoice_with_reversal(
        v_invoice.id,
        p_company_id,
        'System agent: cancel verified zero-impact invoice'
      );
      SELECT * INTO v_invoice FROM public.invoices WHERE id = v_entity_uuid;
      v_after := public.system_agent_pick_fields(to_jsonb(v_invoice), v_registry.allowed_fields);
      IF lower(COALESCE(v_invoice.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided')
         OR lower(COALESCE(v_invoice.payment_status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided')
         OR abs(COALESCE(v_invoice.paid_amount, 0)) > 0.01
         OR abs(COALESCE(v_invoice.balance_due, 0)) > 0.01
      THEN
        RAISE EXCEPTION 'Invoice cancellation failed canonical postcondition verification';
      END IF;
    END IF;

  ELSIF p_command = 'payment.correct_uncompleted_date' THEN
    SELECT * INTO v_payment
    FROM public.payments payment
    WHERE payment.id = v_entity_uuid AND payment.company_id = p_company_id
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Payment was not found in the requested company'; END IF;

    SELECT * INTO v_contract
    FROM public.contracts contract
    WHERE contract.id = v_payment.contract_id AND contract.company_id = p_company_id
    FOR SHARE;
    IF NOT FOUND OR v_contract.start_date IS NULL OR v_contract.end_date IS NULL
       OR v_contract.end_date < v_contract.start_date
    THEN
      RAISE EXCEPTION 'Payment contract period is unavailable or invalid';
    END IF;
    IF lower(COALESCE(v_payment.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded') THEN
      RAISE EXCEPTION 'Completed payment dates require an approved reversal';
    END IF;

    v_effective_date := v_payment.payment_date;
    v_before := public.system_agent_pick_fields(to_jsonb(v_payment), v_registry.allowed_fields);
    v_expected_matches := COALESCE(p_expected_before, '{}'::jsonb) = '{}'::jsonb
      OR v_before @> p_expected_before;
    v_effective_date := CASE
      WHEN v_payment.payment_date < v_contract.start_date THEN v_contract.start_date
      WHEN v_payment.payment_date > v_contract.end_date THEN v_contract.end_date
      ELSE v_payment.payment_date
    END;

    IF v_payment.payment_date IS NOT DISTINCT FROM v_effective_date THEN
      v_after := v_before;
    ELSE
      IF NOT v_expected_matches THEN
        RAISE EXCEPTION 'Payment changed after detection and is still inconsistent';
      END IF;
      IF v_registry.closed_period_policy = 'block'
         AND public.system_agent_date_in_closed_period(p_company_id, v_effective_date)
      THEN
        RAISE EXCEPTION 'Payment date repair is blocked by a closed accounting period';
      END IF;
      UPDATE public.payments payment
      SET payment_date = v_effective_date, updated_at = now()
      WHERE payment.id = v_entity_uuid AND payment.company_id = p_company_id;
      SELECT * INTO v_payment FROM public.payments WHERE id = v_entity_uuid;
      v_after := public.system_agent_pick_fields(to_jsonb(v_payment), v_registry.allowed_fields);
      IF v_payment.payment_date IS DISTINCT FROM v_effective_date THEN
        RAISE EXCEPTION 'Payment date failed postcondition verification';
      END IF;
    END IF;

    v_rollback_metadata := v_rollback_metadata || jsonb_build_object(
      'contract_id', v_contract.id,
      'contract_start_date', v_contract.start_date,
      'contract_end_date', v_contract.end_date
    );

  ELSIF p_command = 'payment.link_clear_invoice' THEN
    SELECT * INTO v_payment
    FROM public.payments payment
    WHERE payment.id = v_entity_uuid AND payment.company_id = p_company_id
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Payment was not found in the requested company'; END IF;

    v_effective_date := v_payment.payment_date;
    v_before_allocations := public.system_agent_active_invoice_allocations(v_payment.id);
    v_before := jsonb_build_object(
      'invoice_id', v_payment.invoice_id,
      'journal_entry_id', v_payment.journal_entry_id,
      'allocation_status', v_payment.allocation_status,
      'allocations', v_before_allocations
    );
    v_expected_matches := COALESCE(p_expected_before, '{}'::jsonb) = '{}'::jsonb
      OR v_before @> p_expected_before;

    IF lower(COALESCE(v_payment.payment_status, '')) NOT IN ('completed', 'paid', 'success', 'succeeded')
       OR lower(COALESCE(v_payment.transaction_type::text, 'receipt')) <> 'receipt'
       OR v_payment.contract_id IS NULL
       OR v_payment.payment_date IS NULL
       OR COALESCE(v_payment.amount, 0) <= 0
    THEN
      RAISE EXCEPTION 'Only a positive completed contract receipt can be linked automatically';
    END IF;

    SELECT COUNT(*), (array_agg(invoice.id ORDER BY invoice.id))[1]
    INTO v_candidate_count, v_candidate_id
    FROM public.invoices invoice
    WHERE invoice.company_id = p_company_id
      AND invoice.contract_id = v_payment.contract_id
      AND (invoice.customer_id IS NULL OR invoice.customer_id IS NOT DISTINCT FROM v_payment.customer_id)
      AND date_trunc('month', COALESCE(invoice.invoice_date, invoice.due_date))::date =
          date_trunc('month', v_payment.payment_date)::date
      AND lower(COALESCE(invoice.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
      AND COALESCE(invoice.total_amount, 0)
          - public.canonical_invoice_paid_amount(invoice.id, v_payment.id)
          >= COALESCE(v_payment.amount, 0) - 0.01;

    IF v_candidate_count <> 1 THEN
      RAISE EXCEPTION 'Payment no longer has one unambiguous same-month invoice candidate';
    END IF;
    IF p_values ? 'invoice_id' AND (p_values ->> 'invoice_id')::uuid IS DISTINCT FROM v_candidate_id THEN
      RAISE EXCEPTION 'Worker proposal no longer matches the canonical invoice candidate';
    END IF;

    v_after_allocations := jsonb_build_array(jsonb_build_object(
      'invoice_id', v_candidate_id,
      'amount', round(COALESCE(v_payment.amount, 0)::numeric, 2)
    ));

    IF v_payment.invoice_id IS NOT DISTINCT FROM v_candidate_id
       AND v_before_allocations IS NOT DISTINCT FROM v_after_allocations
       AND NOT EXISTS (
         SELECT 1
         FROM public.payment_allocations allocation
         WHERE allocation.payment_id = v_payment.id
           AND allocation.is_active = true
           AND allocation.allocation_type <> 'invoice'
       )
    THEN
      v_after := v_before;
    ELSE
      IF NOT v_expected_matches
         OR v_payment.invoice_id IS NOT NULL
         OR EXISTS (
           SELECT 1
           FROM public.payment_allocations allocation
           WHERE allocation.payment_id = v_payment.id AND allocation.is_active = true
         )
      THEN
        RAISE EXCEPTION 'Payment allocation changed after detection and is still inconsistent';
      END IF;
      IF v_registry.closed_period_policy = 'block'
         AND public.system_agent_date_in_closed_period(p_company_id, v_effective_date)
      THEN
        RAISE EXCEPTION 'Payment allocation is blocked by a closed accounting period';
      END IF;
      PERFORM public.replace_payment_invoice_allocations(
        v_payment.id,
        p_company_id,
        v_after_allocations,
        'System agent: allocate clear completed receipt to invoice',
        v_before_allocations,
        NULL
      );
      SELECT * INTO v_payment FROM public.payments WHERE id = v_entity_uuid;
      v_after_allocations := public.system_agent_active_invoice_allocations(v_payment.id);
      v_after := jsonb_build_object(
        'invoice_id', v_payment.invoice_id,
        'journal_entry_id', v_payment.journal_entry_id,
        'allocation_status', v_payment.allocation_status,
        'allocations', v_after_allocations
      );
      IF v_payment.invoice_id IS DISTINCT FROM v_candidate_id
         OR v_after_allocations IS DISTINCT FROM jsonb_build_array(jsonb_build_object(
           'invoice_id', v_candidate_id,
           'amount', round(COALESCE(v_payment.amount, 0)::numeric, 2)
         ))
      THEN
        RAISE EXCEPTION 'Payment allocation failed canonical postcondition verification';
      END IF;
    END IF;

    v_rollback_metadata := v_rollback_metadata || jsonb_build_object(
      'before_allocations', v_before_allocations,
      'after_allocations', v_after_allocations,
      'candidate_invoice_id', v_candidate_id
    );

  ELSIF p_command = 'accounting.sync_draft_journal_totals' THEN
    SELECT * INTO v_journal
    FROM public.journal_entries entry
    WHERE entry.id = v_entity_uuid AND entry.company_id = p_company_id
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Journal entry was not found in the requested company'; END IF;

    v_effective_date := v_journal.entry_date;
    v_before := public.system_agent_pick_fields(to_jsonb(v_journal), v_registry.allowed_fields);
    v_expected_matches := COALESCE(p_expected_before, '{}'::jsonb) = '{}'::jsonb
      OR v_before @> p_expected_before;

    SELECT
      COUNT(*),
      COALESCE(SUM(COALESCE(line.debit_amount, 0)), 0),
      COALESCE(SUM(COALESCE(line.credit_amount, 0)), 0)
    INTO v_line_count, v_line_debit, v_line_credit
    FROM public.journal_entry_lines line
    WHERE line.journal_entry_id = v_journal.id;

    IF lower(COALESCE(v_journal.status, '')) NOT IN ('draft', 'pending')
       OR v_line_count < 2
       OR abs(v_line_debit - v_line_credit) > 0.01
       OR v_line_debit < 0
       OR v_line_credit < 0
    THEN
      RAISE EXCEPTION 'Only a balanced draft journal with at least two lines can be synchronized';
    END IF;

    IF abs(COALESCE(v_journal.total_debit, 0) - v_line_debit) <= 0.01
       AND abs(COALESCE(v_journal.total_credit, 0) - v_line_credit) <= 0.01
    THEN
      v_after := v_before;
    ELSE
      IF NOT v_expected_matches THEN
        RAISE EXCEPTION 'Journal entry changed after detection and is still inconsistent';
      END IF;
      IF v_registry.closed_period_policy = 'block'
         AND public.system_agent_date_in_closed_period(p_company_id, v_effective_date)
      THEN
        RAISE EXCEPTION 'Journal total repair is blocked by a closed accounting period';
      END IF;
      PERFORM set_config('app.financial_controls_bypass', 'on', true);
      UPDATE public.journal_entries entry
      SET
        total_debit = round(v_line_debit::numeric, 2),
        total_credit = round(v_line_credit::numeric, 2),
        updated_at = now()
      WHERE entry.id = v_entity_uuid AND entry.company_id = p_company_id;
      PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
      SELECT * INTO v_journal FROM public.journal_entries WHERE id = v_entity_uuid;
      v_after := public.system_agent_pick_fields(to_jsonb(v_journal), v_registry.allowed_fields);
      IF abs(COALESCE(v_journal.total_debit, 0) - v_line_debit) > 0.01
         OR abs(COALESCE(v_journal.total_credit, 0) - v_line_credit) > 0.01
      THEN
        RAISE EXCEPTION 'Journal totals failed line-derived postcondition verification';
      END IF;
    END IF;

    v_rollback_metadata := v_rollback_metadata || jsonb_build_object(
      'line_count', v_line_count,
      'line_debit', v_line_debit,
      'line_credit', v_line_credit
    );
  END IF;

  IF v_before IS NULL OR v_after IS NULL THEN
    RAISE EXCEPTION 'Canonical repair did not produce auditable before and after states';
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
    v_repair_id, p_run_id, p_job_id, p_finding_id, p_company_id, v_job.domain, p_command,
    v_registry.entity_table, p_entity_id, v_before, v_after, v_rollback_metadata
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
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
    RAISE;
END;
$$;
REVOKE ALL ON FUNCTION public.system_agent_apply_finance_repair(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_apply_finance_repair(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb)
  TO service_role;
COMMENT ON FUNCTION public.system_agent_apply_finance_repair(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb) IS
'Canonical system-agent finance mutation gateway. It derives values from source records, verifies postconditions, and records only real changes.';
DO $$
BEGIN
  IF to_regprocedure('public.system_agent_rollback_repair_legacy_v1(uuid,text)') IS NULL THEN
    IF to_regprocedure('public.system_agent_rollback_repair(uuid,text)') IS NULL THEN
      RAISE EXCEPTION 'Legacy system-agent rollback function is missing';
    END IF;
    ALTER FUNCTION public.system_agent_rollback_repair(uuid, text)
      RENAME TO system_agent_rollback_repair_legacy_v1;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.system_agent_rollback_repair_legacy_v1(uuid,text)
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
  v_registry public.system_agent_command_registry%ROWTYPE;
  v_contract public.contracts%ROWTYPE;
  v_invoice public.invoices%ROWTYPE;
  v_schedule public.contract_payment_schedules%ROWTYPE;
  v_payment public.payments%ROWTYPE;
  v_journal public.journal_entries%ROWTYPE;
  v_current jsonb;
  v_effective_date date;
  v_current_allocations jsonb := '[]'::jsonb;
  v_line_count integer := 0;
  v_line_debit numeric := 0;
  v_line_credit numeric := 0;
  v_previous_bypass text := COALESCE(current_setting('app.financial_controls_bypass', true), '');
BEGIN
  SELECT * INTO v_repair
  FROM public.system_agent_repairs repair
  WHERE repair.id = p_repair_id
  FOR UPDATE;

  IF v_repair.id IS NULL THEN
    RAISE EXCEPTION 'Repair was not found';
  END IF;

  IF COALESCE(v_repair.rollback_metadata ->> 'handler_version', '') <> 'finance_v2' THEN
    RETURN public.system_agent_rollback_repair_legacy_v1(p_repair_id, p_reason);
  END IF;
  IF v_repair.status <> 'applied' THEN
    RAISE EXCEPTION 'Repair is not in an applied state';
  END IF;

  SELECT * INTO v_registry
  FROM public.system_agent_command_registry registry
  WHERE registry.command = v_repair.command AND registry.reversible;
  IF v_registry.command IS NULL THEN
    RAISE EXCEPTION 'Repair command is no longer reversible';
  END IF;

  IF v_repair.command = 'contract.recalculate_totals' THEN
    SELECT * INTO v_contract FROM public.contracts contract
    WHERE contract.id = v_repair.entity_id::uuid AND contract.company_id = v_repair.company_id
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Repaired contract no longer exists'; END IF;
    v_effective_date := v_contract.contract_date;
    v_current := public.system_agent_pick_fields(to_jsonb(v_contract), v_registry.allowed_fields);

  ELSIF v_repair.command IN (
    'invoice.recalculate_balance', 'invoice.sync_zero_impact_amount', 'invoice.cancel_zero_safe'
  ) THEN
    SELECT * INTO v_invoice FROM public.invoices invoice
    WHERE invoice.id = v_repair.entity_id::uuid AND invoice.company_id = v_repair.company_id
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Repaired invoice no longer exists'; END IF;
    v_effective_date := v_invoice.invoice_date;
    v_current := public.system_agent_pick_fields(to_jsonb(v_invoice), v_registry.allowed_fields);

  ELSIF v_repair.command = 'schedule.sync_payment_state' THEN
    SELECT * INTO v_schedule FROM public.contract_payment_schedules schedule
    WHERE schedule.id = v_repair.entity_id::uuid AND schedule.company_id = v_repair.company_id
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Repaired payment schedule no longer exists'; END IF;
    v_effective_date := v_schedule.due_date;
    v_current := public.system_agent_pick_fields(to_jsonb(v_schedule), v_registry.allowed_fields);

  ELSIF v_repair.command IN ('payment.correct_uncompleted_date', 'payment.link_clear_invoice') THEN
    SELECT * INTO v_payment FROM public.payments payment
    WHERE payment.id = v_repair.entity_id::uuid AND payment.company_id = v_repair.company_id
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Repaired payment no longer exists'; END IF;
    v_effective_date := v_payment.payment_date;
    IF v_repair.command = 'payment.link_clear_invoice' THEN
      v_current_allocations := public.system_agent_active_invoice_allocations(v_payment.id);
      v_current := jsonb_build_object(
        'invoice_id', v_payment.invoice_id,
        'journal_entry_id', v_payment.journal_entry_id,
        'allocation_status', v_payment.allocation_status,
        'allocations', v_current_allocations
      );
    ELSE
      v_current := public.system_agent_pick_fields(to_jsonb(v_payment), v_registry.allowed_fields);
    END IF;

  ELSIF v_repair.command = 'accounting.sync_draft_journal_totals' THEN
    SELECT * INTO v_journal FROM public.journal_entries entry
    WHERE entry.id = v_repair.entity_id::uuid AND entry.company_id = v_repair.company_id
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Repaired journal entry no longer exists'; END IF;
    v_effective_date := v_journal.entry_date;
    v_current := public.system_agent_pick_fields(to_jsonb(v_journal), v_registry.allowed_fields);
  ELSE
    RAISE EXCEPTION 'Canonical finance rollback has no implementation for command %', v_repair.command;
  END IF;

  IF v_current IS DISTINCT FROM v_repair.after_state THEN
    RAISE EXCEPTION 'Entity changed after repair; rollback was safely aborted';
  END IF;
  IF v_registry.closed_period_policy = 'block'
     AND v_effective_date IS NOT NULL
     AND public.system_agent_date_in_closed_period(v_repair.company_id, v_effective_date)
  THEN
    RAISE EXCEPTION 'Rollback is blocked because the effective date is in a closed accounting period';
  END IF;

  IF v_repair.command = 'contract.recalculate_totals' THEN
    PERFORM set_config('app.financial_controls_bypass', 'on', true);
    UPDATE public.contracts contract
    SET
      total_paid = (v_repair.before_state ->> 'total_paid')::numeric,
      balance_due = (v_repair.before_state ->> 'balance_due')::numeric,
      payment_status = v_repair.before_state ->> 'payment_status',
      updated_at = now()
    WHERE contract.id = v_repair.entity_id::uuid AND contract.company_id = v_repair.company_id;
    PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);

  ELSIF v_repair.command = 'invoice.recalculate_balance' THEN
    PERFORM set_config('app.financial_controls_bypass', 'on', true);
    UPDATE public.invoices invoice
    SET
      paid_amount = (v_repair.before_state ->> 'paid_amount')::numeric,
      balance_due = (v_repair.before_state ->> 'balance_due')::numeric,
      payment_status = v_repair.before_state ->> 'payment_status',
      status = v_repair.before_state ->> 'status',
      updated_at = now()
    WHERE invoice.id = v_repair.entity_id::uuid AND invoice.company_id = v_repair.company_id;
    PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);

  ELSIF v_repair.command = 'schedule.sync_payment_state' THEN
    IF v_schedule.invoice_id IS DISTINCT FROM (v_repair.rollback_metadata ->> 'invoice_id')::uuid THEN
      RAISE EXCEPTION 'Schedule invoice link changed after repair';
    END IF;
    UPDATE public.contract_payment_schedules schedule
    SET
      paid_amount = (v_repair.before_state ->> 'paid_amount')::numeric,
      status = v_repair.before_state ->> 'status',
      paid_date = CASE
        WHEN v_repair.before_state ->> 'paid_date' IS NULL THEN NULL
        ELSE (v_repair.before_state ->> 'paid_date')::date
      END,
      updated_at = now()
    WHERE schedule.id = v_repair.entity_id::uuid AND schedule.company_id = v_repair.company_id;

  ELSIF v_repair.command = 'invoice.sync_zero_impact_amount' THEN
    IF v_invoice.journal_entry_id IS NOT NULL
       OR EXISTS (SELECT 1 FROM public.payments payment WHERE payment.invoice_id = v_invoice.id)
       OR EXISTS (
         SELECT 1 FROM public.payment_allocations allocation
         WHERE allocation.allocation_type = 'invoice' AND allocation.target_id = v_invoice.id
       )
       OR EXISTS (SELECT 1 FROM public.invoice_items item WHERE item.invoice_id = v_invoice.id)
    THEN
      RAISE EXCEPTION 'Invoice gained financial history and cannot be rolled back automatically';
    END IF;
    PERFORM set_config('app.financial_controls_bypass', 'on', true);
    UPDATE public.invoices invoice
    SET
      subtotal = (v_repair.before_state ->> 'subtotal')::numeric,
      total_amount = (v_repair.before_state ->> 'total_amount')::numeric,
      paid_amount = (v_repair.before_state ->> 'paid_amount')::numeric,
      balance_due = (v_repair.before_state ->> 'balance_due')::numeric,
      payment_status = v_repair.before_state ->> 'payment_status',
      status = v_repair.before_state ->> 'status',
      updated_at = now()
    WHERE invoice.id = v_repair.entity_id::uuid AND invoice.company_id = v_repair.company_id;
    PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);

  ELSIF v_repair.command = 'invoice.cancel_zero_safe' THEN
    IF v_invoice.journal_entry_id IS NOT NULL
       OR EXISTS (
         SELECT 1 FROM public.payments payment
         WHERE payment.company_id = v_repair.company_id
           AND lower(COALESCE(payment.payment_status, '')) NOT IN (
             'cancelled', 'canceled', 'failed', 'void', 'voided', 'reversed', 'refunded'
           )
           AND (
             payment.invoice_id = v_invoice.id
             OR EXISTS (
               SELECT 1 FROM public.payment_allocations allocation
               WHERE allocation.payment_id = payment.id
                 AND allocation.allocation_type = 'invoice'
                 AND allocation.target_id = v_invoice.id
                 AND allocation.is_active = true
             )
           )
       )
    THEN
      RAISE EXCEPTION 'Cancelled invoice gained financial impact and cannot be rolled back automatically';
    END IF;
    PERFORM set_config('app.financial_controls_bypass', 'on', true);
    UPDATE public.invoices invoice
    SET
      status = v_repair.before_state ->> 'status',
      payment_status = v_repair.before_state ->> 'payment_status',
      paid_amount = (v_repair.before_state ->> 'paid_amount')::numeric,
      balance_due = (v_repair.before_state ->> 'balance_due')::numeric,
      notes = v_repair.before_state ->> 'notes',
      updated_at = now()
    WHERE invoice.id = v_repair.entity_id::uuid AND invoice.company_id = v_repair.company_id;
    PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);

  ELSIF v_repair.command = 'payment.correct_uncompleted_date' THEN
    IF lower(COALESCE(v_payment.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded') THEN
      RAISE EXCEPTION 'Payment was completed after repair and cannot be rolled back automatically';
    END IF;
    UPDATE public.payments payment
    SET payment_date = (v_repair.before_state ->> 'payment_date')::date, updated_at = now()
    WHERE payment.id = v_repair.entity_id::uuid AND payment.company_id = v_repair.company_id;

  ELSIF v_repair.command = 'payment.link_clear_invoice' THEN
    PERFORM public.replace_payment_invoice_allocations(
      v_payment.id,
      v_repair.company_id,
      COALESCE(v_repair.rollback_metadata -> 'before_allocations', '[]'::jsonb),
      COALESCE(NULLIF(BTRIM(p_reason), ''), 'System agent rollback'),
      COALESCE(v_repair.rollback_metadata -> 'after_allocations', '[]'::jsonb),
      NULL
    );

  ELSIF v_repair.command = 'accounting.sync_draft_journal_totals' THEN
    SELECT
      COUNT(*),
      COALESCE(SUM(COALESCE(line.debit_amount, 0)), 0),
      COALESCE(SUM(COALESCE(line.credit_amount, 0)), 0)
    INTO v_line_count, v_line_debit, v_line_credit
    FROM public.journal_entry_lines line
    WHERE line.journal_entry_id = v_journal.id;

    IF lower(COALESCE(v_journal.status, '')) NOT IN ('draft', 'pending')
       OR v_line_count <> COALESCE((v_repair.rollback_metadata ->> 'line_count')::integer, -1)
       OR abs(v_line_debit - COALESCE((v_repair.rollback_metadata ->> 'line_debit')::numeric, -1)) > 0.01
       OR abs(v_line_credit - COALESCE((v_repair.rollback_metadata ->> 'line_credit')::numeric, -1)) > 0.01
    THEN
      RAISE EXCEPTION 'Journal lines changed after repair; rollback was safely aborted';
    END IF;
    PERFORM set_config('app.financial_controls_bypass', 'on', true);
    UPDATE public.journal_entries entry
    SET
      total_debit = (v_repair.before_state ->> 'total_debit')::numeric,
      total_credit = (v_repair.before_state ->> 'total_credit')::numeric,
      updated_at = now()
    WHERE entry.id = v_repair.entity_id::uuid AND entry.company_id = v_repair.company_id;
    PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
  END IF;

  UPDATE public.system_agent_repairs repair
  SET
    status = 'rolled_back',
    rolled_back_at = now(),
    rollback_reason = left(COALESCE(NULLIF(BTRIM(p_reason), ''), 'System agent rollback'), 1000),
    error = NULL,
    updated_at = now()
  WHERE repair.id = p_repair_id;

  UPDATE public.system_agent_findings finding
  SET status = 'rolled_back', error = NULL, updated_at = now()
  WHERE finding.id = v_repair.finding_id;

  RETURN jsonb_build_object('repair_id', p_repair_id, 'status', 'rolled_back');
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
    RAISE;
END;
$$;
REVOKE ALL ON FUNCTION public.system_agent_rollback_repair(uuid,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_rollback_repair(uuid,text)
  TO service_role;
COMMENT ON FUNCTION public.system_agent_rollback_repair(uuid,text) IS
'Rolls back finance_v2 repairs with optimistic state checks and delegates older repairs to the preserved legacy implementation.';
