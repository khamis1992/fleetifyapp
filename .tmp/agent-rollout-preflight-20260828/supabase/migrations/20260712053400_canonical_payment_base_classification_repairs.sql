-- Normalize legacy receipt journals to an explicit customer-advance base,
-- then allocate clear receipts through balanced, reversible accounting.

CREATE TABLE public.payment_accounting_classifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  payment_id uuid NOT NULL UNIQUE REFERENCES public.payments(id) ON DELETE CASCADE,
  classification text NOT NULL CHECK (classification IN ('customer_advance')),
  normalization_journal_id uuid NULL REFERENCES public.journal_entries(id) ON DELETE RESTRICT,
  is_active boolean NOT NULL DEFAULT true,
  source text NOT NULL DEFAULT 'system_agent',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_payment_accounting_classifications_company
  ON public.payment_accounting_classifications(company_id, classification, is_active);
ALTER TABLE public.payment_accounting_classifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.payment_accounting_classifications FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.payment_accounting_classifications TO service_role;
INSERT INTO public.system_agent_command_registry (
  command, domain, description, entity_table, allowed_fields,
  reversible, approval_required, closed_period_policy, min_confidence, enabled
) VALUES (
  'payment.classify_customer_advance',
  'contracts',
  'Normalize an unallocated completed receipt to the mapped customer-advance account.',
  'payment_accounting_classifications',
  ARRAY['classification', 'normalization_journal_id', 'is_active'],
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
UPDATE public.system_agent_command_registry
SET description = 'Normalize a receipt to customer advances, then allocate it to its one canonical due-month invoice.',
    updated_at = now()
WHERE command = 'payment.link_clear_invoice';
CREATE OR REPLACE FUNCTION public.system_agent_payment_base_state(
  p_payment_id uuid,
  p_company_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_receivables_account_id uuid;
  v_advances_account_id uuid;
  v_receivables numeric := 0;
  v_advances numeric := 0;
  v_legacy_account_id uuid;
  v_legacy_net numeric := 0;
  v_legacy_count integer := 0;
  v_classification jsonb;
BEGIN
  SELECT * INTO v_payment
  FROM public.payments payment
  WHERE payment.id = p_payment_id AND payment.company_id = p_company_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment was not found in the requested company'; END IF;

  v_receivables_account_id := public.resolve_payment_posting_account(p_company_id, 'RECEIVABLES');
  v_advances_account_id := public.resolve_payment_posting_account(p_company_id, 'CUSTOMER_ADVANCES');

  WITH scoped_entries AS (
    SELECT entry.id
    FROM public.journal_entries entry
    WHERE entry.company_id = p_company_id
      AND lower(COALESCE(entry.status::text, '')) = 'posted'
      AND (
        entry.id = v_payment.journal_entry_id
        OR (entry.reference_type = 'payment' AND entry.reference_id = v_payment.id)
      )
  )
  SELECT
    COALESCE(sum(CASE WHEN line.account_id = v_receivables_account_id
      THEN COALESCE(line.credit_amount, 0) - COALESCE(line.debit_amount, 0) ELSE 0 END), 0),
    COALESCE(sum(CASE WHEN line.account_id = v_advances_account_id
      THEN COALESCE(line.credit_amount, 0) - COALESCE(line.debit_amount, 0) ELSE 0 END), 0)
  INTO v_receivables, v_advances
  FROM scoped_entries scoped
  JOIN public.journal_entry_lines line ON line.journal_entry_id = scoped.id;

  WITH scoped_entries AS (
    SELECT entry.id
    FROM public.journal_entries entry
    WHERE entry.company_id = p_company_id
      AND lower(COALESCE(entry.status::text, '')) = 'posted'
      AND (
        entry.id = v_payment.journal_entry_id
        OR (entry.reference_type = 'payment' AND entry.reference_id = v_payment.id)
      )
  ), account_totals AS (
    SELECT
      line.account_id,
      sum(COALESCE(line.credit_amount, 0) - COALESCE(line.debit_amount, 0)) AS net_credit
    FROM scoped_entries scoped
    JOIN public.journal_entry_lines line ON line.journal_entry_id = scoped.id
    GROUP BY line.account_id
  ), candidates AS (
    SELECT total.account_id, total.net_credit
    FROM account_totals total
    JOIN public.chart_of_accounts account ON account.id = total.account_id
    WHERE total.account_id NOT IN (v_receivables_account_id, v_advances_account_id)
      AND total.net_credit > 0.01
      AND account.company_id = p_company_id
      AND account.is_active = true
      AND COALESCE(account.is_header, false) = false
      AND COALESCE(account.account_level, 0) >= 3
      AND lower(COALESCE(account.account_type, '')) = 'assets'
      AND lower(COALESCE(account.balance_type, '')) = 'debit'
  )
  SELECT count(*)::integer, (array_agg(account_id ORDER BY account_id))[1], COALESCE(sum(net_credit), 0)
  INTO v_legacy_count, v_legacy_account_id, v_legacy_net
  FROM candidates;

  SELECT jsonb_build_object(
    'id', classification.id,
    'classification', classification.classification,
    'normalization_journal_id', classification.normalization_journal_id,
    'is_active', classification.is_active,
    'source', classification.source
  )
  INTO v_classification
  FROM public.payment_accounting_classifications classification
  WHERE classification.payment_id = v_payment.id
    AND classification.company_id = p_company_id;

  RETURN jsonb_build_object(
    'payment_id', v_payment.id,
    'invoice_id', v_payment.invoice_id,
    'journal_entry_id', v_payment.journal_entry_id,
    'allocation_status', v_payment.allocation_status,
    'amount', round(COALESCE(v_payment.amount, 0)::numeric, 2),
    'mapped_receivables', round(v_receivables::numeric, 2),
    'mapped_advances', round(v_advances::numeric, 2),
    'legacy_candidate_count', v_legacy_count,
    'legacy_receivable_account_id', v_legacy_account_id,
    'legacy_net_credit', round(v_legacy_net::numeric, 2),
    'classification', v_classification,
    'allocations', public.system_agent_active_invoice_allocations(v_payment.id)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.system_agent_payment_base_state(uuid,uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_payment_base_state(uuid,uuid)
  TO service_role;
CREATE OR REPLACE FUNCTION public.system_agent_ensure_payment_customer_advance_base(
  p_payment_id uuid,
  p_company_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_before jsonb;
  v_after jsonb;
  v_receivables_account_id uuid;
  v_advances_account_id uuid;
  v_legacy_account_id uuid;
  v_receivables numeric := 0;
  v_advances numeric := 0;
  v_legacy numeric := 0;
  v_legacy_count integer := 0;
  v_shift numeric := 0;
  v_journal_id uuid;
  v_line_number integer := 1;
  v_previous_bypass text := COALESCE(current_setting('app.financial_controls_bypass', true), '');
BEGIN
  SELECT * INTO v_payment
  FROM public.payments payment
  WHERE payment.id = p_payment_id AND payment.company_id = p_company_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment was not found in the requested company'; END IF;
  IF lower(COALESCE(v_payment.payment_status, '')) NOT IN ('completed', 'paid', 'success', 'succeeded')
     OR lower(COALESCE(v_payment.transaction_type::text, 'receipt')) <> 'receipt'
     OR COALESCE(v_payment.amount, 0) <= 0
     OR v_payment.invoice_id IS NOT NULL
     OR EXISTS (
       SELECT 1 FROM public.payment_allocations allocation
       WHERE allocation.payment_id = v_payment.id AND allocation.is_active = true
     )
  THEN
    RAISE EXCEPTION 'Only a positive completed unallocated receipt can receive a base classification';
  END IF;

  v_before := public.system_agent_payment_base_state(v_payment.id, p_company_id);
  v_receivables := COALESCE((v_before ->> 'mapped_receivables')::numeric, 0);
  v_advances := COALESCE((v_before ->> 'mapped_advances')::numeric, 0);
  v_legacy := COALESCE((v_before ->> 'legacy_net_credit')::numeric, 0);
  v_legacy_count := COALESCE((v_before ->> 'legacy_candidate_count')::integer, 0);
  v_legacy_account_id := NULLIF(v_before ->> 'legacy_receivable_account_id', '')::uuid;

  IF v_before -> 'classification' IS NOT NULL
     AND v_before -> 'classification' <> 'null'::jsonb
     AND COALESCE((v_before -> 'classification' ->> 'is_active')::boolean, false)
     AND v_before -> 'classification' ->> 'classification' = 'customer_advance'
     AND abs(v_advances - v_payment.amount) <= 0.01
     AND abs(v_receivables) <= 0.01
     AND abs(v_legacy) <= 0.01
  THEN
    RETURN jsonb_build_object('before', v_before, 'after', v_before, 'normalization_journal_id', NULL);
  END IF;

  IF v_receivables < -0.01 OR v_advances < -0.01 OR v_legacy < -0.01
     OR (v_legacy_count NOT IN (0, 1))
     OR abs((v_receivables + v_advances + v_legacy) - v_payment.amount) > 0.01
  THEN
    RAISE EXCEPTION 'Receipt base accounts do not reconcile to the payment amount';
  END IF;

  v_receivables_account_id := public.resolve_payment_posting_account(p_company_id, 'RECEIVABLES');
  v_advances_account_id := public.resolve_payment_posting_account(p_company_id, 'CUSTOMER_ADVANCES');
  v_shift := round((v_receivables + v_legacy)::numeric, 2);

  IF v_shift > 0.01 THEN
    PERFORM public.assert_financial_period_is_open(p_company_id, CURRENT_DATE);
    v_journal_id := gen_random_uuid();
    PERFORM set_config('app.financial_controls_bypass', 'on', true);

    INSERT INTO public.journal_entries (
      id, company_id, entry_number, entry_date, description,
      total_debit, total_credit, status, reference_type, reference_id,
      created_at, updated_at
    ) VALUES (
      v_journal_id,
      p_company_id,
      'JE-PBASE-' || substring(v_payment.id::text, 1, 8) || '-' || substring(v_journal_id::text, 1, 8),
      CURRENT_DATE,
      'Normalize receipt ' || COALESCE(v_payment.payment_number, v_payment.id::text) || ' to customer advances',
      v_shift,
      v_shift,
      'draft',
      'payment',
      v_payment.id,
      now(),
      now()
    );

    IF v_receivables > 0.01 THEN
      INSERT INTO public.journal_entry_lines (
        journal_entry_id, account_id, line_number, line_description, debit_amount, credit_amount
      ) VALUES (
        v_journal_id, v_receivables_account_id, v_line_number,
        'Move unallocated receipt from mapped receivables', v_receivables, 0
      );
      v_line_number := v_line_number + 1;
    END IF;

    IF v_legacy > 0.01 THEN
      IF v_legacy_count <> 1 OR v_legacy_account_id IS NULL THEN
        RAISE EXCEPTION 'Legacy receipt credit is not attributable to one posting account';
      END IF;
      INSERT INTO public.journal_entry_lines (
        journal_entry_id, account_id, line_number, line_description, debit_amount, credit_amount
      ) VALUES (
        v_journal_id, v_legacy_account_id, v_line_number,
        'Move legacy unallocated receipt to customer advances', v_legacy, 0
      );
      v_line_number := v_line_number + 1;
    END IF;

    INSERT INTO public.journal_entry_lines (
      journal_entry_id, account_id, line_number, line_description, debit_amount, credit_amount
    ) VALUES (
      v_journal_id, v_advances_account_id, v_line_number,
      'Recognize unallocated customer advance', 0, v_shift
    );

    UPDATE public.journal_entries entry
    SET status = 'posted', posted_at = now(), updated_at = now()
    WHERE entry.id = v_journal_id;
    PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
  END IF;

  INSERT INTO public.payment_accounting_classifications (
    company_id, payment_id, classification, normalization_journal_id, is_active, source
  ) VALUES (
    p_company_id, v_payment.id, 'customer_advance', v_journal_id, true, 'system_agent'
  )
  ON CONFLICT (payment_id) DO UPDATE SET
    company_id = EXCLUDED.company_id,
    classification = EXCLUDED.classification,
    normalization_journal_id = COALESCE(EXCLUDED.normalization_journal_id, public.payment_accounting_classifications.normalization_journal_id),
    is_active = true,
    source = EXCLUDED.source,
    updated_at = now();

  v_after := public.system_agent_payment_base_state(v_payment.id, p_company_id);
  IF abs(COALESCE((v_after ->> 'mapped_advances')::numeric, 0) - v_payment.amount) > 0.01
     OR abs(COALESCE((v_after ->> 'mapped_receivables')::numeric, 0)) > 0.01
     OR abs(COALESCE((v_after ->> 'legacy_net_credit')::numeric, 0)) > 0.01
     OR NOT COALESCE((v_after -> 'classification' ->> 'is_active')::boolean, false)
     OR v_after -> 'classification' ->> 'classification' <> 'customer_advance'
  THEN
    RAISE EXCEPTION 'Customer-advance base classification failed postcondition verification';
  END IF;

  RETURN jsonb_build_object(
    'before', v_before,
    'after', v_after,
    'normalization_journal_id', v_journal_id
  );
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
    RAISE;
END;
$$;
REVOKE ALL ON FUNCTION public.system_agent_ensure_payment_customer_advance_base(uuid,uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_ensure_payment_customer_advance_base(uuid,uuid)
  TO service_role;
CREATE OR REPLACE FUNCTION public.system_agent_reverse_payment_base_journal(
  p_journal_id uuid,
  p_payment_id uuid,
  p_company_id uuid,
  p_reason text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_original public.journal_entries%ROWTYPE;
  v_reversal_id uuid;
  v_previous_bypass text := COALESCE(current_setting('app.financial_controls_bypass', true), '');
BEGIN
  IF p_journal_id IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO v_original
  FROM public.journal_entries entry
  WHERE entry.id = p_journal_id
    AND entry.company_id = p_company_id
    AND entry.reference_type = 'payment'
    AND entry.reference_id = p_payment_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment base-normalization journal was not found'; END IF;

  IF v_original.reversal_entry_id IS NOT NULL THEN
    IF NOT public.journal_entries_are_exact_reversals(v_original.id, v_original.reversal_entry_id) THEN
      RAISE EXCEPTION 'Existing payment base reversal is not an exact opposite';
    END IF;
    RETURN v_original.reversal_entry_id;
  END IF;

  PERFORM public.assert_financial_period_is_open(p_company_id, CURRENT_DATE);
  v_reversal_id := gen_random_uuid();
  PERFORM set_config('app.financial_controls_bypass', 'on', true);

  INSERT INTO public.journal_entries (
    id, company_id, entry_number, entry_date, description,
    total_debit, total_credit, status, reference_type, reference_id,
    created_at, updated_at
  ) VALUES (
    v_reversal_id,
    p_company_id,
    'REV-PBASE-' || substring(v_original.id::text, 1, 8) || '-' || substring(v_reversal_id::text, 1, 8),
    CURRENT_DATE,
    'Rollback of ' || v_original.entry_number || ' - ' || left(COALESCE(NULLIF(BTRIM(p_reason), ''), 'System agent rollback'), 500),
    v_original.total_credit,
    v_original.total_debit,
    'draft',
    'payment',
    p_payment_id,
    now(),
    now()
  );

  INSERT INTO public.journal_entry_lines (
    journal_entry_id, account_id, line_number, line_description,
    debit_amount, credit_amount, cost_center_id, asset_id, employee_id
  )
  SELECT
    v_reversal_id,
    line.account_id,
    row_number() OVER (ORDER BY line.line_number, line.id),
    'Rollback - ' || COALESCE(line.line_description, v_original.entry_number),
    COALESCE(line.credit_amount, 0),
    COALESCE(line.debit_amount, 0),
    line.cost_center_id,
    line.asset_id,
    line.employee_id
  FROM public.journal_entry_lines line
  WHERE line.journal_entry_id = v_original.id;

  UPDATE public.journal_entries entry
  SET status = 'posted', posted_at = now(), updated_at = now()
  WHERE entry.id = v_reversal_id;

  UPDATE public.journal_entries entry
  SET status = 'reversed', reversal_entry_id = v_reversal_id, reversed_at = now(), updated_at = now()
  WHERE entry.id = v_original.id;

  PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
  IF NOT public.journal_entries_are_exact_reversals(v_original.id, v_reversal_id) THEN
    RAISE EXCEPTION 'Payment base reversal failed exact-line verification';
  END IF;
  RETURN v_reversal_id;
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
    RAISE;
END;
$$;
REVOKE ALL ON FUNCTION public.system_agent_reverse_payment_base_journal(uuid,uuid,uuid,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_reverse_payment_base_journal(uuid,uuid,uuid,text)
  TO service_role;
CREATE OR REPLACE FUNCTION public.system_agent_apply_payment_classification_repair_v1(
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
  v_payment public.payments%ROWTYPE;
  v_candidate_id uuid;
  v_candidate_count integer := 0;
  v_before jsonb;
  v_after jsonb;
  v_base_result jsonb;
  v_base_before jsonb;
  v_base_after jsonb;
  v_before_allocations jsonb := '[]'::jsonb;
  v_after_allocations jsonb := '[]'::jsonb;
  v_normalization_journal_id uuid;
  v_repair_id uuid := gen_random_uuid();
  v_rollback_metadata jsonb := COALESCE(p_metadata, '{}'::jsonb)
    || jsonb_build_object('handler_version', 'payment_classification_v1');
BEGIN
  IF p_command NOT IN ('payment.classify_customer_advance', 'payment.link_clear_invoice') THEN
    RAISE EXCEPTION 'Payment classification gateway received an unsupported command';
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
    RAISE EXCEPTION 'Payment classification finding is invalid, mismatched, or already processed';
  END IF;

  SELECT * INTO v_registry
  FROM public.system_agent_command_registry registry
  WHERE registry.command = p_command
    AND registry.domain = 'contracts'
    AND registry.enabled
    AND registry.reversible
    AND NOT registry.approval_required;
  IF v_registry.command IS NULL OR v_finding.confidence < v_registry.min_confidence THEN
    RAISE EXCEPTION 'Payment classification command is disabled or below its confidence threshold';
  END IF;

  SELECT * INTO v_payment
  FROM public.payments payment
  WHERE payment.id = p_entity_id::uuid AND payment.company_id = p_company_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment is outside the active company'; END IF;
  IF NOT public.system_agent_pick_fields(
      to_jsonb(v_payment), ARRAY['invoice_id', 'journal_entry_id', 'allocation_status']
    ) @> COALESCE(p_expected_before, '{}'::jsonb)
  THEN
    RAISE EXCEPTION 'Payment changed after classification detection';
  END IF;

  v_before_allocations := public.system_agent_active_invoice_allocations(v_payment.id);
  v_base_result := public.system_agent_ensure_payment_customer_advance_base(v_payment.id, p_company_id);
  v_base_before := v_base_result -> 'before';
  v_base_after := v_base_result -> 'after';
  v_normalization_journal_id := NULLIF(v_base_result ->> 'normalization_journal_id', '')::uuid;

  IF p_command = 'payment.classify_customer_advance' THEN
    IF COALESCE(p_values, '{}'::jsonb) <> '{}'::jsonb THEN
      RAISE EXCEPTION 'Customer-advance classification derives all values inside the gateway';
    END IF;
    v_before := v_base_before;
    v_after := v_base_after;
  ELSE
    IF v_registry.closed_period_policy = 'block'
       AND public.system_agent_date_in_closed_period(p_company_id, v_payment.payment_date)
    THEN
      RAISE EXCEPTION 'Payment allocation is blocked by a closed accounting period';
    END IF;

    SELECT count(*), (array_agg(invoice.id ORDER BY invoice.id))[1]
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
      RAISE EXCEPTION 'Payment no longer has one unambiguous due-month invoice candidate';
    END IF;
    IF p_values ? 'invoice_id' AND (p_values ->> 'invoice_id')::uuid IS DISTINCT FROM v_candidate_id THEN
      RAISE EXCEPTION 'Worker proposal no longer matches the canonical invoice candidate';
    END IF;

    v_before := jsonb_build_object(
      'invoice_id', v_payment.invoice_id,
      'journal_entry_id', v_payment.journal_entry_id,
      'allocation_status', v_payment.allocation_status,
      'allocations', v_before_allocations
    );
    v_after_allocations := jsonb_build_array(jsonb_build_object(
      'invoice_id', v_candidate_id,
      'amount', round(v_payment.amount::numeric, 2)
    ));
    PERFORM public.replace_payment_invoice_allocations(
      v_payment.id,
      p_company_id,
      v_after_allocations,
      'System agent: apply classified customer advance to clear invoice',
      v_before_allocations,
      NULL
    );

    SELECT * INTO v_payment FROM public.payments WHERE id = p_entity_id::uuid;
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
         'amount', round(v_payment.amount::numeric, 2)
       ))
    THEN
      RAISE EXCEPTION 'Classified payment allocation failed postcondition verification';
    END IF;
  END IF;

  IF v_before IS NOT DISTINCT FROM v_after THEN
    UPDATE public.system_agent_findings finding
    SET status = 'ignored', repair_id = NULL, error = NULL, updated_at = now()
    WHERE finding.id = p_finding_id;
    RETURN jsonb_build_object('status', 'verified_no_change', 'command', p_command, 'entity_id', p_entity_id, 'state', v_after);
  END IF;

  v_rollback_metadata := v_rollback_metadata || jsonb_build_object(
    'base_before', v_base_before,
    'base_after', v_base_after,
    'normalization_journal_id', v_normalization_journal_id,
    'before_allocations', v_before_allocations,
    'after_allocations', v_after_allocations,
    'candidate_invoice_id', v_candidate_id
  );

  INSERT INTO public.system_agent_repairs (
    id, run_id, job_id, finding_id, company_id, domain, command,
    entity_table, entity_id, before_state, after_state, rollback_metadata
  ) VALUES (
    v_repair_id, p_run_id, p_job_id, p_finding_id, p_company_id, 'contracts', p_command,
    v_registry.entity_table, p_entity_id, v_before, v_after, v_rollback_metadata
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
REVOKE ALL ON FUNCTION public.system_agent_apply_payment_classification_repair_v1(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_apply_payment_classification_repair_v1(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb)
  TO service_role;
DO $$
BEGIN
  IF to_regprocedure('public.system_agent_rollback_repair_before_payment_classification_v1(uuid,text)') IS NULL THEN
    ALTER FUNCTION public.system_agent_rollback_repair(uuid, text)
      RENAME TO system_agent_rollback_repair_before_payment_classification_v1;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.system_agent_rollback_repair_before_payment_classification_v1(uuid,text)
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
  v_payment public.payments%ROWTYPE;
  v_current jsonb;
  v_current_allocations jsonb;
  v_base_before jsonb;
  v_base_after jsonb;
  v_normalization_journal_id uuid;
BEGIN
  SELECT * INTO v_repair
  FROM public.system_agent_repairs repair
  WHERE repair.id = p_repair_id
  FOR UPDATE;
  IF v_repair.id IS NULL THEN RAISE EXCEPTION 'Repair was not found'; END IF;

  IF COALESCE(v_repair.rollback_metadata ->> 'handler_version', '') <> 'payment_classification_v1' THEN
    RETURN public.system_agent_rollback_repair_before_payment_classification_v1(p_repair_id, p_reason);
  END IF;
  IF v_repair.status <> 'applied' THEN RAISE EXCEPTION 'Repair is not in an applied state'; END IF;

  SELECT * INTO v_payment
  FROM public.payments payment
  WHERE payment.id = v_repair.entity_id::uuid AND payment.company_id = v_repair.company_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Repaired payment no longer exists'; END IF;

  v_base_before := v_repair.rollback_metadata -> 'base_before';
  v_base_after := v_repair.rollback_metadata -> 'base_after';
  v_normalization_journal_id := NULLIF(v_repair.rollback_metadata ->> 'normalization_journal_id', '')::uuid;

  IF v_repair.command = 'payment.link_clear_invoice' THEN
    v_current_allocations := public.system_agent_active_invoice_allocations(v_payment.id);
    v_current := jsonb_build_object(
      'invoice_id', v_payment.invoice_id,
      'journal_entry_id', v_payment.journal_entry_id,
      'allocation_status', v_payment.allocation_status,
      'allocations', v_current_allocations
    );
    IF v_current IS DISTINCT FROM v_repair.after_state THEN
      RAISE EXCEPTION 'Payment changed after allocation repair; rollback was safely aborted';
    END IF;

    PERFORM public.replace_payment_invoice_allocations(
      v_payment.id,
      v_repair.company_id,
      COALESCE(v_repair.rollback_metadata -> 'before_allocations', '[]'::jsonb),
      COALESCE(NULLIF(BTRIM(p_reason), ''), 'System agent rollback'),
      COALESCE(v_repair.rollback_metadata -> 'after_allocations', '[]'::jsonb),
      NULL
    );
  ELSE
    v_current := public.system_agent_payment_base_state(v_payment.id, v_repair.company_id);
    IF v_current IS DISTINCT FROM v_repair.after_state THEN
      RAISE EXCEPTION 'Payment base classification changed after repair; rollback was safely aborted';
    END IF;
  END IF;

  IF v_normalization_journal_id IS NOT NULL THEN
    PERFORM public.system_agent_reverse_payment_base_journal(
      v_normalization_journal_id,
      v_payment.id,
      v_repair.company_id,
      COALESCE(NULLIF(BTRIM(p_reason), ''), 'System agent rollback')
    );
  END IF;

  IF v_base_before -> 'classification' IS NULL
     OR v_base_before -> 'classification' = 'null'::jsonb
  THEN
    DELETE FROM public.payment_accounting_classifications classification
    WHERE classification.payment_id = v_payment.id
      AND classification.company_id = v_repair.company_id;
  ELSE
    INSERT INTO public.payment_accounting_classifications (
      id, company_id, payment_id, classification, normalization_journal_id,
      is_active, source
    ) VALUES (
      (v_base_before -> 'classification' ->> 'id')::uuid,
      v_repair.company_id,
      v_payment.id,
      v_base_before -> 'classification' ->> 'classification',
      NULLIF(v_base_before -> 'classification' ->> 'normalization_journal_id', '')::uuid,
      (v_base_before -> 'classification' ->> 'is_active')::boolean,
      v_base_before -> 'classification' ->> 'source'
    )
    ON CONFLICT (payment_id) DO UPDATE SET
      classification = EXCLUDED.classification,
      normalization_journal_id = EXCLUDED.normalization_journal_id,
      is_active = EXCLUDED.is_active,
      source = EXCLUDED.source,
      updated_at = now();
  END IF;

  IF public.system_agent_payment_base_state(v_payment.id, v_repair.company_id)
       IS DISTINCT FROM v_base_before
  THEN
    RAISE EXCEPTION 'Payment base classification rollback failed verification';
  END IF;

  IF v_repair.command = 'payment.link_clear_invoice' THEN
    SELECT * INTO v_payment FROM public.payments WHERE id = v_repair.entity_id::uuid;
    v_current := jsonb_build_object(
      'invoice_id', v_payment.invoice_id,
      'journal_entry_id', v_payment.journal_entry_id,
      'allocation_status', v_payment.allocation_status,
      'allocations', public.system_agent_active_invoice_allocations(v_payment.id)
    );
    IF v_current IS DISTINCT FROM v_repair.before_state THEN
      RAISE EXCEPTION 'Payment allocation rollback failed verification';
    END IF;
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
COMMENT ON FUNCTION public.system_agent_apply_payment_classification_repair_v1(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb) IS
'Canonical legacy-receipt normalization and allocation gateway with balanced journals, explicit classification, and compensating rollback.';
