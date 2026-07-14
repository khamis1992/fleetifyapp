-- Migrate legacy direct receipt links into capped canonical allocations.
-- Existing accounting commands first normalize each receipt to customer
-- advances, then post only the allocated portion to receivables.

CREATE TABLE public.legacy_invoice_overpayment_repairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
  before_state jsonb NOT NULL,
  after_state jsonb NOT NULL,
  plan jsonb NOT NULL,
  execution jsonb NOT NULL DEFAULT '[]'::jsonb,
  reason text NOT NULL,
  actor_id uuid,
  status text NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'rolled_back')),
  created_at timestamptz NOT NULL DEFAULT now(),
  rolled_back_at timestamptz,
  rollback_reason text
);

CREATE INDEX idx_legacy_invoice_overpayment_repairs_invoice
  ON public.legacy_invoice_overpayment_repairs(invoice_id, created_at DESC);

ALTER TABLE public.legacy_invoice_overpayment_repairs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.legacy_invoice_overpayment_repairs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.legacy_invoice_overpayment_repairs TO service_role;

CREATE OR REPLACE FUNCTION public.repair_legacy_overpaid_invoice_allocations_atomic(
  p_invoice_id uuid,
  p_company_id uuid,
  p_reason text,
  p_actor_id uuid DEFAULT NULL,
  p_dry_run boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $repair_legacy_overpayment$
DECLARE
  v_invoice public.invoices%ROWTYPE;
  v_actor uuid;
  v_role text := COALESCE(NULLIF(auth.role()::text, ''), current_setting('request.jwt.claim.role', true), '');
  v_actual numeric := 0;
  v_legacy_total numeric := 0;
  v_capacity numeric := 0;
  v_apply numeric := 0;
  v_plan jsonb := '[]'::jsonb;
  v_execution jsonb := '[]'::jsonb;
  v_allocations jsonb;
  v_base_result jsonb;
  v_allocation_result jsonb;
  v_before jsonb;
  v_after jsonb;
  v_repair_id uuid := gen_random_uuid();
  v_previous_bypass text := COALESCE(current_setting('app.financial_controls_bypass', true), '');
  v_previous_sync text := COALESCE(current_setting('app.payment_allocation_sync', true), '');
  payment_row record;
BEGIN
  IF p_invoice_id IS NULL OR p_company_id IS NULL
     OR NULLIF(BTRIM(COALESCE(p_reason, '')), '') IS NULL
  THEN
    RAISE EXCEPTION 'Invoice, company, and reason are required';
  END IF;
  v_actor := CASE WHEN v_role = 'service_role' THEN p_actor_id ELSE auth.uid() END;
  IF v_role <> 'service_role' AND NOT public.is_finance_action_authorized(
    v_actor, p_company_id,
    ARRAY['finance.invoices.write', 'finance.payment.reconcile'],
    ARRAY['super_admin', 'admin', 'company_admin', 'accountant']
  ) THEN
    RAISE EXCEPTION 'Not authorized to repair legacy invoice allocations' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_invoice
  FROM public.invoices invoice
  WHERE invoice.id = p_invoice_id AND invoice.company_id = p_company_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found in company'; END IF;

  v_actual := public.canonical_invoice_paid_amount(v_invoice.id, NULL);
  IF v_actual <= COALESCE(v_invoice.total_amount, 0) + 0.01 THEN
    RETURN jsonb_build_object('status', 'healthy', 'invoice_id', v_invoice.id, 'actual_paid', v_actual);
  END IF;

  SELECT COALESCE(sum(payment.amount), 0) INTO v_legacy_total
  FROM public.payments payment
  WHERE payment.invoice_id = v_invoice.id
    AND payment.company_id = p_company_id
    AND lower(COALESCE(payment.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded')
    AND lower(COALESCE(payment.transaction_type::text, 'receipt')) = 'receipt'
    AND NOT EXISTS (
      SELECT 1 FROM public.payment_allocations allocation
      WHERE allocation.payment_id = payment.id AND allocation.is_active
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.payment_accounting_classifications classification
      WHERE classification.payment_id = payment.id AND classification.is_active
    );
  IF v_legacy_total <= 0.01 THEN
    RAISE EXCEPTION 'Overpayment is not composed of repairable legacy direct receipts';
  END IF;

  v_capacity := GREATEST(COALESCE(v_invoice.total_amount, 0) - (v_actual - v_legacy_total), 0);
  FOR payment_row IN
    SELECT payment.*
    FROM public.payments payment
    WHERE payment.invoice_id = v_invoice.id
      AND payment.company_id = p_company_id
      AND lower(COALESCE(payment.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded')
      AND lower(COALESCE(payment.transaction_type::text, 'receipt')) = 'receipt'
      AND NOT EXISTS (
        SELECT 1 FROM public.payment_allocations allocation
        WHERE allocation.payment_id = payment.id AND allocation.is_active
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.payment_accounting_classifications classification
        WHERE classification.payment_id = payment.id AND classification.is_active
      )
    ORDER BY
      (date_trunc('month', payment.payment_date) =
       date_trunc('month', COALESCE(v_invoice.invoice_date, v_invoice.due_date))) DESC,
      abs(COALESCE(payment.amount, 0) - COALESCE(v_invoice.total_amount, 0)),
      (lower(COALESCE(payment.notes, '')) ~
       '(insurance|traffic|fine|deposit|security|damage|accident|تأمين|مخالف)') ASC,
      payment.payment_date,
      payment.id
  LOOP
    v_apply := round(LEAST(COALESCE(payment_row.amount, 0), v_capacity)::numeric, 2);
    v_plan := v_plan || jsonb_build_array(jsonb_build_object(
      'payment_id', payment_row.id,
      'payment_number', payment_row.payment_number,
      'payment_amount', payment_row.amount,
      'old_invoice_id', payment_row.invoice_id,
      'old_allocation_status', payment_row.allocation_status,
      'allocation_amount', v_apply,
      'unapplied_amount', round((COALESCE(payment_row.amount, 0) - v_apply)::numeric, 2)
    ));
    v_capacity := GREATEST(v_capacity - v_apply, 0);
  END LOOP;

  v_before := jsonb_build_object(
    'invoice', jsonb_build_object(
      'paid_amount', v_invoice.paid_amount,
      'balance_due', v_invoice.balance_due,
      'status', v_invoice.status,
      'payment_status', v_invoice.payment_status
    ),
    'actual_paid', v_actual,
    'payments', v_plan
  );
  IF p_dry_run THEN
    RETURN jsonb_build_object('status', 'planned', 'invoice_id', v_invoice.id, 'plan', v_plan, 'before', v_before);
  END IF;

  PERFORM set_config('app.financial_controls_bypass', 'on', true);
  PERFORM set_config('app.payment_allocation_sync', 'on', true);
  UPDATE public.payments payment
  SET invoice_id = NULL, allocation_status = 'unallocated', updated_at = now()
  WHERE payment.id IN (
    SELECT (item ->> 'payment_id')::uuid FROM jsonb_array_elements(v_plan) item
  );
  PERFORM set_config('app.payment_allocation_sync', v_previous_sync, true);
  PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);

  FOR payment_row IN SELECT item FROM jsonb_array_elements(v_plan) item
  LOOP
    v_base_result := public.system_agent_ensure_payment_customer_advance_base(
      (payment_row.item ->> 'payment_id')::uuid,
      p_company_id
    );
    v_allocations := CASE
      WHEN (payment_row.item ->> 'allocation_amount')::numeric > 0.01
      THEN jsonb_build_array(jsonb_build_object(
        'invoice_id', v_invoice.id,
        'amount', (payment_row.item ->> 'allocation_amount')::numeric
      ))
      ELSE '[]'::jsonb
    END;
    v_allocation_result := public.replace_payment_invoice_allocations(
      (payment_row.item ->> 'payment_id')::uuid,
      p_company_id,
      v_allocations,
      'Legacy overpayment repair ' || v_repair_id::text,
      '[]'::jsonb,
      v_actor
    );
    v_execution := v_execution || jsonb_build_array(jsonb_build_object(
      'payment_id', payment_row.item ->> 'payment_id',
      'normalization_journal_id', v_base_result ->> 'normalization_journal_id',
      'base_before', v_base_result -> 'before',
      'base_after', v_base_result -> 'after',
      'after_allocations', v_allocation_result -> 'after'
    ));
  END LOOP;

  PERFORM public.recalculate_invoice_financial_state(v_invoice.id);
  v_actual := public.canonical_invoice_paid_amount(v_invoice.id, NULL);
  IF v_actual > COALESCE(v_invoice.total_amount, 0) + 0.01 THEN
    RAISE EXCEPTION 'Repair postcondition still overpays invoice';
  END IF;

  SELECT jsonb_build_object(
    'invoice', jsonb_build_object(
      'paid_amount', invoice.paid_amount,
      'balance_due', invoice.balance_due,
      'status', invoice.status,
      'payment_status', invoice.payment_status
    ),
    'actual_paid', v_actual,
    'allocations', COALESCE(jsonb_agg(jsonb_build_object(
      'id', allocation.id,
      'payment_id', allocation.payment_id,
      'amount', allocation.amount
    )) FILTER (WHERE allocation.id IS NOT NULL), '[]'::jsonb)
  ) INTO v_after
  FROM public.invoices invoice
  LEFT JOIN public.payment_allocations allocation
    ON allocation.target_id = invoice.id
   AND allocation.allocation_type = 'invoice'
   AND allocation.is_active
  WHERE invoice.id = v_invoice.id
  GROUP BY invoice.id;

  INSERT INTO public.legacy_invoice_overpayment_repairs (
    id, company_id, invoice_id, before_state, after_state, plan, execution, reason, actor_id
  ) VALUES (
    v_repair_id, p_company_id, v_invoice.id, v_before, v_after, v_plan, v_execution, BTRIM(p_reason), v_actor
  );
  INSERT INTO public.finance_operation_audit (
    company_id, operation_type, entity_type, entity_id,
    before_state, after_state, reason, actor_id
  ) VALUES (
    p_company_id, 'legacy_invoice_overpayment_repaired', 'invoice', v_invoice.id,
    v_before, v_after, BTRIM(p_reason), v_actor
  );
  RETURN jsonb_build_object(
    'status', 'repaired',
    'repair_id', v_repair_id,
    'invoice_id', v_invoice.id,
    'plan', v_plan,
    'before', v_before,
    'after', v_after
  );
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('app.payment_allocation_sync', v_previous_sync, true);
  PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
  RAISE;
END;
$repair_legacy_overpayment$;

REVOKE ALL ON FUNCTION public.repair_legacy_overpaid_invoice_allocations_atomic(uuid,uuid,text,uuid,boolean)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.repair_legacy_overpaid_invoice_allocations_atomic(uuid,uuid,text,uuid,boolean)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.rollback_legacy_invoice_overpayment_repair(
  p_repair_id uuid,
  p_reason text DEFAULT 'Rollback legacy invoice overpayment repair'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $rollback_legacy_overpayment$
DECLARE
  v_repair public.legacy_invoice_overpayment_repairs%ROWTYPE;
  v_role text := COALESCE(NULLIF(auth.role()::text, ''), current_setting('request.jwt.claim.role', true), '');
  v_actor uuid := auth.uid();
  v_reversal_ids jsonb := '[]'::jsonb;
  v_reversal_id uuid;
  v_previous_bypass text := COALESCE(current_setting('app.financial_controls_bypass', true), '');
  v_previous_sync text := COALESCE(current_setting('app.payment_allocation_sync', true), '');
  execution_row record;
  plan_row record;
BEGIN
  SELECT * INTO v_repair
  FROM public.legacy_invoice_overpayment_repairs repair
  WHERE repair.id = p_repair_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Legacy overpayment repair was not found'; END IF;
  IF v_repair.status = 'rolled_back' THEN
    RETURN jsonb_build_object('status', 'rolled_back', 'repair_id', v_repair.id);
  END IF;
  IF v_role <> 'service_role' AND NOT public.is_finance_action_authorized(
    v_actor, v_repair.company_id,
    ARRAY['finance.invoices.write', 'finance.payment.reconcile'],
    ARRAY['super_admin', 'admin', 'company_admin', 'accountant']
  ) THEN
    RAISE EXCEPTION 'Not authorized to rollback legacy invoice allocations' USING ERRCODE = '42501';
  END IF;

  FOR execution_row IN
    SELECT element.value AS item
    FROM jsonb_array_elements(v_repair.execution) WITH ORDINALITY AS element(value, ordinality)
    ORDER BY element.ordinality DESC
  LOOP
    PERFORM public.replace_payment_invoice_allocations(
      (execution_row.item ->> 'payment_id')::uuid,
      v_repair.company_id,
      '[]'::jsonb,
      COALESCE(NULLIF(BTRIM(p_reason), ''), 'Rollback legacy invoice overpayment repair'),
      execution_row.item -> 'after_allocations',
      v_actor
    );
    IF NULLIF(execution_row.item ->> 'normalization_journal_id', '') IS NOT NULL THEN
      v_reversal_id := public.system_agent_reverse_payment_base_journal(
        (execution_row.item ->> 'normalization_journal_id')::uuid,
        (execution_row.item ->> 'payment_id')::uuid,
        v_repair.company_id,
        COALESCE(NULLIF(BTRIM(p_reason), ''), 'Rollback legacy invoice overpayment repair')
      );
      v_reversal_ids := v_reversal_ids || jsonb_build_array(v_reversal_id);
    END IF;
    UPDATE public.payment_accounting_classifications classification
    SET is_active = false, updated_at = now()
    WHERE classification.payment_id = (execution_row.item ->> 'payment_id')::uuid
      AND classification.company_id = v_repair.company_id
      AND classification.source = 'system_agent';
  END LOOP;

  PERFORM set_config('app.financial_controls_bypass', 'on', true);
  PERFORM set_config('app.payment_allocation_sync', 'on', true);
  FOR plan_row IN SELECT item FROM jsonb_array_elements(v_repair.plan) item
  LOOP
    UPDATE public.payments payment
    SET invoice_id = (plan_row.item ->> 'old_invoice_id')::uuid,
        allocation_status = COALESCE(plan_row.item ->> 'old_allocation_status', 'unallocated'),
        updated_at = now()
    WHERE payment.id = (plan_row.item ->> 'payment_id')::uuid
      AND payment.company_id = v_repair.company_id;
  END LOOP;
  PERFORM set_config('app.payment_allocation_sync', v_previous_sync, true);
  PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
  PERFORM public.recalculate_invoice_financial_state(v_repair.invoice_id);

  UPDATE public.legacy_invoice_overpayment_repairs repair
  SET status = 'rolled_back',
      rolled_back_at = now(),
      rollback_reason = COALESCE(NULLIF(BTRIM(p_reason), ''), 'Rollback'),
      actor_id = COALESCE(v_actor, repair.actor_id)
  WHERE repair.id = v_repair.id;
  INSERT INTO public.finance_operation_audit (
    company_id, operation_type, entity_type, entity_id,
    before_state, after_state, reason, actor_id
  ) VALUES (
    v_repair.company_id, 'legacy_invoice_overpayment_rollback', 'invoice', v_repair.invoice_id,
    v_repair.after_state, v_repair.before_state,
    COALESCE(NULLIF(BTRIM(p_reason), ''), 'Rollback'), v_actor
  );
  RETURN jsonb_build_object(
    'status', 'rolled_back',
    'repair_id', v_repair.id,
    'reversal_journal_ids', v_reversal_ids
  );
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('app.payment_allocation_sync', v_previous_sync, true);
  PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
  RAISE;
END;
$rollback_legacy_overpayment$;

REVOKE ALL ON FUNCTION public.rollback_legacy_invoice_overpayment_repair(uuid,text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rollback_legacy_invoice_overpayment_repair(uuid,text)
  TO authenticated, service_role;

INSERT INTO public.system_agent_command_registry (
  command, domain, description, entity_table, allowed_fields,
  reversible, approval_required, closed_period_policy, min_confidence, enabled
) VALUES (
  'invoice.normalize_legacy_overpayment', 'contracts',
  'Cap legacy direct receipt allocations at invoice total and classify only the unapplied remainder as customer advance.',
  'invoices', ARRAY['paid_amount', 'balance_due', 'payment_status', 'status'],
  true, false, 'block', 1.0, true
)
ON CONFLICT (command) DO UPDATE SET
  description = EXCLUDED.description,
  allowed_fields = EXCLUDED.allowed_fields,
  reversible = true,
  approval_required = false,
  closed_period_policy = 'block',
  min_confidence = 1.0,
  enabled = true,
  updated_at = now();

CREATE OR REPLACE FUNCTION public.system_agent_apply_legacy_overpayment_repair_v1(
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
AS $apply_legacy_overpayment$
DECLARE
  v_job public.system_agent_jobs%ROWTYPE;
  v_finding public.system_agent_findings%ROWTYPE;
  v_invoice public.invoices%ROWTYPE;
  v_result jsonb;
  v_system_repair_id uuid := gen_random_uuid();
BEGIN
  IF p_command <> 'invoice.normalize_legacy_overpayment'
     OR COALESCE(p_values, '{}'::jsonb) <> '{}'::jsonb
  THEN
    RAISE EXCEPTION 'Legacy overpayment gateway received an unsupported command or values';
  END IF;
  SELECT * INTO v_job
  FROM public.system_agent_jobs job
  WHERE job.id = p_job_id AND job.run_id = p_run_id AND job.company_id = p_company_id
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
    RAISE EXCEPTION 'Legacy overpayment finding is invalid, mismatched, or already processed';
  END IF;
  IF v_finding.confidence < 1.0 OR NOT EXISTS (
    SELECT 1 FROM public.system_agent_command_registry registry
    WHERE registry.command = p_command
      AND registry.domain = 'contracts'
      AND registry.enabled
      AND registry.reversible
      AND NOT registry.approval_required
  ) THEN
    RAISE EXCEPTION 'Legacy overpayment command is disabled or below confidence threshold';
  END IF;
  SELECT * INTO v_invoice
  FROM public.invoices invoice
  WHERE invoice.id = p_entity_id::uuid AND invoice.company_id = p_company_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice is outside the active company'; END IF;
  IF NOT public.system_agent_pick_fields(
    to_jsonb(v_invoice), ARRAY['paid_amount', 'balance_due', 'payment_status', 'status']
  ) @> COALESCE(p_expected_before, '{}'::jsonb) THEN
    RAISE EXCEPTION 'Invoice changed after legacy overpayment detection';
  END IF;

  v_result := public.repair_legacy_overpaid_invoice_allocations_atomic(
    v_invoice.id,
    p_company_id,
    'System agent: normalize legacy invoice overpayment',
    NULL,
    false
  );
  IF v_result ->> 'status' = 'healthy' THEN
    UPDATE public.system_agent_findings
    SET status = 'ignored', repair_id = NULL, error = NULL, updated_at = now()
    WHERE id = p_finding_id;
    RETURN jsonb_build_object('status', 'verified_no_change', 'entity_id', p_entity_id, 'state', v_result);
  END IF;
  IF v_result ->> 'status' <> 'repaired' THEN
    RAISE EXCEPTION 'Legacy overpayment repair did not satisfy its postcondition';
  END IF;
  INSERT INTO public.system_agent_repairs (
    id, run_id, job_id, finding_id, company_id, domain, command,
    entity_table, entity_id, before_state, after_state, rollback_metadata
  ) VALUES (
    v_system_repair_id, p_run_id, p_job_id, p_finding_id, p_company_id,
    'contracts', p_command, 'invoices', p_entity_id,
    v_result -> 'before', v_result -> 'after',
    COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'handler_version', 'legacy_overpayment_v1',
      'maintenance_repair_id', v_result ->> 'repair_id'
    )
  );
  UPDATE public.system_agent_findings
  SET status = 'repaired', repair_id = v_system_repair_id, error = NULL, updated_at = now()
  WHERE id = p_finding_id;
  RETURN jsonb_build_object(
    'status', 'repaired',
    'repair_id', v_system_repair_id,
    'entity_id', p_entity_id,
    'result', v_result
  );
END;
$apply_legacy_overpayment$;

REVOKE ALL ON FUNCTION public.system_agent_apply_legacy_overpayment_repair_v1(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_apply_legacy_overpayment_repair_v1(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb)
  TO service_role;

DO $rename_rollback$
BEGIN
  IF to_regprocedure('public.system_agent_rollback_repair_before_legacy_overpayment_v1(uuid,text)') IS NULL THEN
    ALTER FUNCTION public.system_agent_rollback_repair(uuid,text)
      RENAME TO system_agent_rollback_repair_before_legacy_overpayment_v1;
  END IF;
END;
$rename_rollback$;

CREATE OR REPLACE FUNCTION public.system_agent_rollback_repair(
  p_repair_id uuid,
  p_reason text DEFAULT 'System agent rollback'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $dispatch_legacy_rollback$
DECLARE
  v_repair public.system_agent_repairs%ROWTYPE;
  v_result jsonb;
BEGIN
  SELECT * INTO v_repair
  FROM public.system_agent_repairs repair
  WHERE repair.id = p_repair_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Repair was not found'; END IF;
  IF COALESCE(v_repair.rollback_metadata ->> 'handler_version', '') <> 'legacy_overpayment_v1' THEN
    RETURN public.system_agent_rollback_repair_before_legacy_overpayment_v1(p_repair_id, p_reason);
  END IF;
  IF v_repair.status = 'rolled_back' THEN
    RETURN jsonb_build_object('repair_id', v_repair.id, 'status', 'rolled_back');
  END IF;
  v_result := public.rollback_legacy_invoice_overpayment_repair(
    (v_repair.rollback_metadata ->> 'maintenance_repair_id')::uuid,
    p_reason
  );
  UPDATE public.system_agent_repairs
  SET status = 'rolled_back',
      rolled_back_at = now(),
      rollback_reason = left(COALESCE(NULLIF(BTRIM(p_reason), ''), 'System agent rollback'), 1000),
      error = NULL,
      updated_at = now()
  WHERE id = v_repair.id;
  UPDATE public.system_agent_findings
  SET status = 'rolled_back', error = NULL, updated_at = now()
  WHERE id = v_repair.finding_id;
  RETURN jsonb_build_object('repair_id', v_repair.id, 'status', 'rolled_back', 'result', v_result);
END;
$dispatch_legacy_rollback$;

REVOKE ALL ON FUNCTION public.system_agent_rollback_repair(uuid,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_rollback_repair(uuid,text)
  TO service_role;

COMMENT ON FUNCTION public.repair_legacy_overpaid_invoice_allocations_atomic(uuid,uuid,text,uuid,boolean) IS
'Audited dry-run/apply repair for legacy direct receipt links that overpay one invoice; reuses canonical advance normalization and allocation accounting.';
