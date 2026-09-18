-- Create missing customer balance summaries from canonical invoice and receipt state.

INSERT INTO public.system_agent_command_registry (
  command, domain, description, entity_table, allowed_fields,
  reversible, approval_required, closed_period_policy, min_confidence, enabled
) VALUES (
  'customer.create_balance',
  'customers',
  'Create a missing customer balance summary from invoices and completed receipts.',
  'customer_balances',
  ARRAY[
    'exists', 'customer_id', 'current_balance', 'overdue_amount',
    'days_overdue', 'last_payment_amount', 'last_payment_date'
  ],
  true,
  false,
  'allow_derived',
  1.0,
  true
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
CREATE OR REPLACE FUNCTION public.system_agent_customer_balance_state_for_customer(
  p_customer_id uuid,
  p_company_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active_invoice_total numeric := 0;
  v_completed_receipts numeric := 0;
  v_overdue_amount numeric := 0;
  v_days_overdue integer := 0;
  v_last_payment_amount numeric;
  v_last_payment_date date;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.customers customer
    WHERE customer.id = p_customer_id AND customer.company_id = p_company_id
  ) THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(SUM(COALESCE(invoice.total_amount, 0)), 0)
  INTO v_active_invoice_total
  FROM public.invoices invoice
  WHERE invoice.company_id = p_company_id
    AND invoice.customer_id = p_customer_id
    AND lower(COALESCE(invoice.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
    AND lower(COALESCE(invoice.payment_status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'failed', 'reversed', 'refunded'
    );

  SELECT COALESCE(SUM(COALESCE(payment.amount, 0)), 0)
  INTO v_completed_receipts
  FROM public.payments payment
  WHERE payment.company_id = p_company_id
    AND payment.customer_id = p_customer_id
    AND lower(COALESCE(payment.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded')
    AND lower(COALESCE(payment.transaction_type::text, 'receipt')) = 'receipt';

  WITH invoice_state AS (
    SELECT
      COALESCE(invoice.due_date, invoice.invoice_date)::date AS due_date,
      GREATEST(
        COALESCE(invoice.total_amount, 0)
          - public.canonical_invoice_paid_amount(invoice.id, NULL),
        0
      ) AS balance_due
    FROM public.invoices invoice
    WHERE invoice.company_id = p_company_id
      AND invoice.customer_id = p_customer_id
      AND lower(COALESCE(invoice.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
      AND lower(COALESCE(invoice.payment_status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'failed', 'reversed', 'refunded'
      )
  )
  SELECT
    COALESCE(SUM(state.balance_due) FILTER (
      WHERE state.due_date < CURRENT_DATE AND state.balance_due > 0.01
    ), 0),
    COALESCE(MAX(CURRENT_DATE - state.due_date) FILTER (
      WHERE state.due_date < CURRENT_DATE AND state.balance_due > 0.01
    ), 0)
  INTO v_overdue_amount, v_days_overdue
  FROM invoice_state state;

  SELECT payment.amount, payment.payment_date
  INTO v_last_payment_amount, v_last_payment_date
  FROM public.payments payment
  WHERE payment.company_id = p_company_id
    AND payment.customer_id = p_customer_id
    AND lower(COALESCE(payment.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded')
    AND lower(COALESCE(payment.transaction_type::text, 'receipt')) = 'receipt'
  ORDER BY payment.payment_date DESC NULLS LAST, payment.created_at DESC, payment.id DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'current_balance', round((v_active_invoice_total - v_completed_receipts)::numeric, 2),
    'overdue_amount', round(v_overdue_amount::numeric, 2),
    'days_overdue', v_days_overdue,
    'last_payment_amount', CASE
      WHEN v_last_payment_amount IS NULL THEN NULL
      ELSE round(v_last_payment_amount::numeric, 2)
    END,
    'last_payment_date', v_last_payment_date
  );
END;
$$;
REVOKE ALL ON FUNCTION public.system_agent_customer_balance_state_for_customer(uuid,uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_customer_balance_state_for_customer(uuid,uuid)
  TO service_role;
CREATE OR REPLACE FUNCTION public.system_agent_apply_customer_balance_create_repair(
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
  v_balance public.customer_balances%ROWTYPE;
  v_customer_id uuid;
  v_balance_count integer := 0;
  v_before jsonb;
  v_after jsonb;
  v_target jsonb;
  v_repair_id uuid := gen_random_uuid();
BEGIN
  IF p_command <> 'customer.create_balance' THEN
    RAISE EXCEPTION 'Command is not handled by the missing customer balance gateway';
  END IF;
  IF COALESCE(p_values, '{}'::jsonb) <> '{}'::jsonb THEN
    RAISE EXCEPTION 'Customer balance creation does not accept caller-supplied values';
  END IF;

  SELECT * INTO v_job
  FROM public.system_agent_jobs job
  WHERE job.id = p_job_id
    AND job.run_id = p_run_id
    AND job.company_id = p_company_id
  FOR UPDATE;
  IF v_job.id IS NULL OR v_job.status <> 'running' OR v_job.mode <> 'apply'
     OR v_job.domain <> 'customers'
  THEN
    RAISE EXCEPTION 'System agent customer job is not an active apply job';
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
    RAISE EXCEPTION 'Customer balance finding is invalid, mismatched, or already processed';
  END IF;

  SELECT * INTO v_registry
  FROM public.system_agent_command_registry registry
  WHERE registry.command = p_command
    AND registry.enabled
    AND registry.reversible
    AND NOT registry.approval_required;
  IF v_registry.command IS NULL OR v_finding.confidence < v_registry.min_confidence THEN
    RAISE EXCEPTION 'Customer balance creation is disabled or below its confidence threshold';
  END IF;

  v_customer_id := p_entity_id::uuid;
  PERFORM pg_advisory_xact_lock(
    hashtextextended('system-agent-customer-balance:' || p_company_id::text || ':' || v_customer_id::text, 0)
  );

  PERFORM 1 FROM public.customers customer
  WHERE customer.id = v_customer_id AND customer.company_id = p_company_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Customer is outside the active company'; END IF;

  SELECT COUNT(*)::integer INTO v_balance_count
  FROM public.customer_balances balance
  WHERE balance.company_id = p_company_id AND balance.customer_id = v_customer_id;
  IF v_balance_count > 1 THEN
    RAISE EXCEPTION 'Customer has duplicate balance rows and requires consolidation';
  END IF;

  IF v_balance_count = 1 THEN
    SELECT * INTO v_balance
    FROM public.customer_balances balance
    WHERE balance.company_id = p_company_id AND balance.customer_id = v_customer_id
    FOR UPDATE;
    v_before := public.system_agent_pick_fields(
      to_jsonb(v_balance) || jsonb_build_object('exists', true),
      v_registry.allowed_fields
    );
    v_after := v_before;

    UPDATE public.system_agent_findings finding
    SET status = 'ignored', repair_id = NULL, error = NULL, updated_at = now()
    WHERE finding.id = p_finding_id;
    RETURN jsonb_build_object(
      'status', 'verified_no_change',
      'command', p_command,
      'entity_id', v_balance.id,
      'state', v_after
    );
  END IF;

  v_before := jsonb_build_object('exists', false, 'customer_id', v_customer_id);
  IF COALESCE(p_expected_before, '{}'::jsonb) <> '{}'::jsonb
     AND NOT (v_before @> p_expected_before)
  THEN
    RAISE EXCEPTION 'Customer balance state changed after detection';
  END IF;

  v_target := public.system_agent_customer_balance_state_for_customer(v_customer_id, p_company_id);
  IF v_target IS NULL THEN RAISE EXCEPTION 'Customer balance derivation failed'; END IF;

  INSERT INTO public.customer_balances (
    company_id, customer_id, current_balance, overdue_amount,
    days_overdue, last_payment_amount, last_payment_date, updated_at
  ) VALUES (
    p_company_id,
    v_customer_id,
    (v_target ->> 'current_balance')::numeric,
    (v_target ->> 'overdue_amount')::numeric,
    (v_target ->> 'days_overdue')::integer,
    CASE WHEN v_target ->> 'last_payment_amount' IS NULL
      THEN NULL ELSE (v_target ->> 'last_payment_amount')::numeric END,
    CASE WHEN v_target ->> 'last_payment_date' IS NULL
      THEN NULL ELSE (v_target ->> 'last_payment_date')::date END,
    now()
  ) RETURNING * INTO v_balance;

  v_after := public.system_agent_pick_fields(
    to_jsonb(v_balance) || jsonb_build_object('exists', true),
    v_registry.allowed_fields
  );
  IF v_after IS DISTINCT FROM (
    jsonb_build_object('exists', true, 'customer_id', v_customer_id) || v_target
  ) THEN
    RAISE EXCEPTION 'Created customer balance failed canonical postcondition verification';
  END IF;

  INSERT INTO public.system_agent_repairs (
    id, run_id, job_id, finding_id, company_id, domain, command,
    entity_table, entity_id, before_state, after_state, rollback_metadata
  ) VALUES (
    v_repair_id,
    p_run_id,
    p_job_id,
    p_finding_id,
    p_company_id,
    v_job.domain,
    p_command,
    v_registry.entity_table,
    v_balance.id::text,
    v_before,
    v_after,
    COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'handler_version', 'customer_balance_create_v1',
      'customer_id', v_customer_id,
      'created_balance_id', v_balance.id,
      'derived_state', v_target
    )
  );

  UPDATE public.system_agent_findings finding
  SET status = 'repaired', repair_id = v_repair_id, error = NULL, updated_at = now()
  WHERE finding.id = p_finding_id;

  RETURN jsonb_build_object(
    'status', 'repaired',
    'repair_id', v_repair_id,
    'command', p_command,
    'entity_id', v_balance.id,
    'before', v_before,
    'after', v_after
  );
END;
$$;
REVOKE ALL ON FUNCTION public.system_agent_apply_customer_balance_create_repair(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_apply_customer_balance_create_repair(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb)
  TO service_role;
DO $$
BEGIN
  IF to_regprocedure('public.system_agent_rollback_repair_before_customer_balance_v1(uuid,text)') IS NULL THEN
    ALTER FUNCTION public.system_agent_rollback_repair(uuid, text)
      RENAME TO system_agent_rollback_repair_before_customer_balance_v1;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.system_agent_rollback_repair_before_customer_balance_v1(uuid,text)
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
  v_balance public.customer_balances%ROWTYPE;
  v_current jsonb;
BEGIN
  SELECT * INTO v_repair
  FROM public.system_agent_repairs repair
  WHERE repair.id = p_repair_id
  FOR UPDATE;
  IF v_repair.id IS NULL THEN RAISE EXCEPTION 'Repair was not found'; END IF;

  IF COALESCE(v_repair.rollback_metadata ->> 'handler_version', '') <> 'customer_balance_create_v1' THEN
    RETURN public.system_agent_rollback_repair_before_customer_balance_v1(p_repair_id, p_reason);
  END IF;
  IF v_repair.status <> 'applied' OR v_repair.command <> 'customer.create_balance' THEN
    RAISE EXCEPTION 'Customer balance repair is not in an applied state';
  END IF;

  SELECT * INTO v_registry
  FROM public.system_agent_command_registry registry
  WHERE registry.command = v_repair.command AND registry.reversible;
  IF v_registry.command IS NULL THEN RAISE EXCEPTION 'Repair command is no longer reversible'; END IF;

  SELECT * INTO v_balance
  FROM public.customer_balances balance
  WHERE balance.id = v_repair.entity_id::uuid
    AND balance.company_id = v_repair.company_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Created customer balance no longer exists'; END IF;

  v_current := public.system_agent_pick_fields(
    to_jsonb(v_balance) || jsonb_build_object('exists', true),
    v_registry.allowed_fields
  );
  IF v_current IS DISTINCT FROM v_repair.after_state THEN
    RAISE EXCEPTION 'Customer balance changed after repair; rollback was safely aborted';
  END IF;

  DELETE FROM public.customer_balances balance
  WHERE balance.id = v_balance.id AND balance.company_id = v_repair.company_id;
  IF EXISTS (SELECT 1 FROM public.customer_balances balance WHERE balance.id = v_balance.id) THEN
    RAISE EXCEPTION 'Customer balance rollback postcondition failed';
  END IF;

  UPDATE public.system_agent_repairs repair
  SET
    status = 'rolled_back',
    rolled_back_at = now(),
    rollback_reason = COALESCE(NULLIF(BTRIM(p_reason), ''), 'System agent rollback'),
    error = NULL,
    updated_at = now()
  WHERE repair.id = p_repair_id;

  UPDATE public.system_agent_findings finding
  SET status = 'rolled_back', error = NULL, updated_at = now()
  WHERE finding.id = v_repair.finding_id;

  RETURN jsonb_build_object(
    'status', 'rolled_back',
    'repair_id', p_repair_id,
    'command', v_repair.command,
    'entity_id', v_repair.entity_id,
    'reason', COALESCE(NULLIF(BTRIM(p_reason), ''), 'System agent rollback')
  );
END;
$$;
REVOKE ALL ON FUNCTION public.system_agent_rollback_repair(uuid,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_rollback_repair(uuid,text)
  TO service_role;
COMMENT ON FUNCTION public.system_agent_apply_customer_balance_create_repair(uuid,uuid,uuid,text,uuid,text,jsonb,jsonb,jsonb) IS
'Creates one missing customer balance row from canonical database state and records a reversible repair.';
