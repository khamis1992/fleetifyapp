-- Canonical atomic rental receipt and customer payment registration.

ALTER TABLE public.rental_payment_receipts
  ADD COLUMN IF NOT EXISTS idempotency_key uuid,
  ADD COLUMN IF NOT EXISTS canonical_payment_id uuid
    REFERENCES public.payments(id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_rental_receipts_company_idempotency
  ON public.rental_payment_receipts(company_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_rental_receipts_canonical_payment
  ON public.rental_payment_receipts(canonical_payment_id)
  WHERE canonical_payment_id IS NOT NULL;
CREATE OR REPLACE FUNCTION public.guard_canonical_rental_receipt_v1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.canonical_payment_id IS NOT NULL
       AND COALESCE(current_setting('app.rental_receipt_payment_v1', true), '') <> 'authorized'
    THEN
      RAISE EXCEPTION 'Canonical rental receipts cannot be deleted; reverse the linked payment instead'
        USING ERRCODE = '42501';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.canonical_payment_id IS NOT NULL
     AND (
       NEW.company_id IS DISTINCT FROM OLD.company_id
       OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
       OR NEW.contract_id IS DISTINCT FROM OLD.contract_id
       OR NEW.vehicle_id IS DISTINCT FROM OLD.vehicle_id
       OR NEW.invoice_id IS DISTINCT FROM OLD.invoice_id
       OR NEW.month IS DISTINCT FROM OLD.month
       OR NEW.payment_date IS DISTINCT FROM OLD.payment_date
       OR NEW.rent_amount IS DISTINCT FROM OLD.rent_amount
       OR NEW.fine IS DISTINCT FROM OLD.fine
       OR NEW.total_paid IS DISTINCT FROM OLD.total_paid
       OR NEW.amount_due IS DISTINCT FROM OLD.amount_due
       OR NEW.pending_balance IS DISTINCT FROM OLD.pending_balance
       OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
       OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
       OR NEW.reference_number IS DISTINCT FROM OLD.reference_number
       OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
       OR NEW.canonical_payment_id IS DISTINCT FROM OLD.canonical_payment_id
     )
     AND COALESCE(current_setting('app.rental_receipt_payment_v1', true), '') <> 'authorized'
  THEN
    RAISE EXCEPTION 'Canonical rental receipt financial fields are immutable; reverse the linked payment instead'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_canonical_rental_receipt_v1()
  FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS a_guard_canonical_rental_receipt_v1
  ON public.rental_payment_receipts;
CREATE TRIGGER a_guard_canonical_rental_receipt_v1
BEFORE UPDATE OR DELETE ON public.rental_payment_receipts
FOR EACH ROW EXECUTE FUNCTION public.guard_canonical_rental_receipt_v1();
CREATE OR REPLACE FUNCTION public.create_rental_receipt_payment_v1(
  p_company_id uuid,
  p_customer_id uuid,
  p_customer_name text,
  p_contract_id uuid,
  p_vehicle_id uuid,
  p_month text,
  p_payment_date date,
  p_rent_amount numeric,
  p_fine numeric,
  p_total_paid numeric,
  p_amount_due numeric,
  p_payment_method text,
  p_bank_id uuid,
  p_reference_number text,
  p_notes text,
  p_idempotency_key uuid,
  p_actor_id uuid DEFAULT NULL
)
RETURNS public.rental_payment_receipts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_role text := COALESCE(NULLIF(auth.role()::text, ''), current_setting('request.jwt.claim.role', true), '');
  v_actor_id uuid;
  v_existing public.rental_payment_receipts%ROWTYPE;
  v_receipt public.rental_payment_receipts%ROWTYPE;
  v_payment_id uuid;
  v_pending numeric;
  v_status text;
  v_previous_guard text := COALESCE(current_setting('app.rental_receipt_payment_v1', true), '');
BEGIN
  IF v_actor_role NOT IN ('authenticated', 'service_role') THEN
    RAISE EXCEPTION 'Authentication is required' USING ERRCODE = '42501';
  END IF;
  IF p_company_id IS NULL OR p_customer_id IS NULL OR p_payment_date IS NULL
     OR p_idempotency_key IS NULL OR NULLIF(BTRIM(COALESCE(p_customer_name, '')), '') IS NULL
     OR NULLIF(BTRIM(COALESCE(p_month, '')), '') IS NULL
  THEN
    RAISE EXCEPTION 'Company, customer, month, payment date, and idempotency key are required'
      USING ERRCODE = 'P0001';
  END IF;
  IF round(COALESCE(p_rent_amount, -1), 2) < 0
     OR round(COALESCE(p_fine, -1), 2) < 0
     OR round(COALESCE(p_amount_due, -1), 2) < 0
     OR round(COALESCE(p_total_paid, 0), 2) <= 0
     OR p_rent_amount <> round(p_rent_amount, 2)
     OR p_fine <> round(p_fine, 2)
     OR p_amount_due <> round(p_amount_due, 2)
     OR p_total_paid <> round(p_total_paid, 2)
  THEN
    RAISE EXCEPTION 'Rental receipt amounts must be non-negative with at most two decimal places, and payment must be positive'
      USING ERRCODE = 'P0001';
  END IF;
  IF abs((p_rent_amount + p_fine) - p_amount_due) > 0.01 THEN
    RAISE EXCEPTION 'Rental receipt amount due must equal rent plus fine'
      USING ERRCODE = 'P0001';
  END IF;
  IF lower(BTRIM(COALESCE(p_payment_method, ''))) IN (
    'bank_transfer', 'check', 'cheque', 'credit_card', 'debit_card', 'card'
  ) AND p_bank_id IS NULL THEN
    RAISE EXCEPTION 'A bank account is required for non-cash rental receipt payments'
      USING ERRCODE = 'P0001';
  END IF;

  v_actor_id := CASE WHEN v_actor_role = 'service_role' THEN p_actor_id ELSE auth.uid() END;
  IF v_actor_role = 'authenticated' THEN
    IF v_actor_id IS NULL OR public.get_user_company_id() IS DISTINCT FROM p_company_id THEN
      RAISE EXCEPTION 'Rental receipt does not belong to the current company'
        USING ERRCODE = '42501';
    END IF;
    IF p_actor_id IS NOT NULL AND p_actor_id IS DISTINCT FROM v_actor_id THEN
      RAISE EXCEPTION 'Actor identity mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_company_id::text || ':rental-receipt:' || p_idempotency_key::text, 0)
  );
  SELECT receipt.* INTO v_existing
  FROM public.rental_payment_receipts receipt
  WHERE receipt.company_id = p_company_id
    AND receipt.idempotency_key = p_idempotency_key
  FOR UPDATE;
  IF FOUND THEN
    IF v_existing.customer_id IS DISTINCT FROM p_customer_id
       OR v_existing.contract_id IS DISTINCT FROM p_contract_id
       OR v_existing.vehicle_id IS DISTINCT FROM p_vehicle_id
       OR v_existing.payment_date IS DISTINCT FROM p_payment_date
       OR abs(v_existing.total_paid - p_total_paid) > 0.005
       OR abs(v_existing.amount_due - p_amount_due) > 0.005
       OR v_existing.month IS DISTINCT FROM BTRIM(p_month)
    THEN
      RAISE EXCEPTION 'Idempotency key was already used with different rental receipt data'
        USING ERRCODE = 'P0001';
    END IF;
    RETURN v_existing;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.customers customer
    WHERE customer.id = p_customer_id AND customer.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'Customer does not belong to the current company' USING ERRCODE = 'P0001';
  END IF;
  IF p_contract_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.contracts contract
    WHERE contract.id = p_contract_id AND contract.company_id = p_company_id
      AND contract.customer_id = p_customer_id
  ) THEN
    RAISE EXCEPTION 'Contract does not belong to this customer and company' USING ERRCODE = 'P0001';
  END IF;
  IF p_vehicle_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.vehicles vehicle
    WHERE vehicle.id = p_vehicle_id AND vehicle.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'Vehicle does not belong to the current company' USING ERRCODE = 'P0001';
  END IF;

  v_pending := greatest(round(p_amount_due - p_total_paid, 2), 0);
  v_status := CASE WHEN v_pending <= 0.01 THEN 'paid' ELSE 'partial' END;

  INSERT INTO public.rental_payment_receipts (
    company_id, customer_id, customer_name, contract_id, vehicle_id,
    month, payment_date, rent_amount, fine, total_paid, amount_due,
    pending_balance, payment_status, payment_method, reference_number,
    notes, idempotency_key, created_by
  ) VALUES (
    p_company_id, p_customer_id, BTRIM(p_customer_name), p_contract_id, p_vehicle_id,
    BTRIM(p_month), p_payment_date, p_rent_amount, p_fine, p_total_paid, p_amount_due,
    v_pending, v_status, lower(BTRIM(p_payment_method)),
    NULLIF(BTRIM(COALESCE(p_reference_number, '')), ''),
    NULLIF(BTRIM(COALESCE(p_notes, '')), ''), p_idempotency_key, v_actor_id
  )
  RETURNING * INTO v_receipt;

  v_payment_id := public.create_payment_atomic(
    p_company_id => p_company_id,
    p_customer_id => p_customer_id,
    p_contract_id => p_contract_id,
    p_invoice_id => NULL,
    p_payment_number => NULL,
    p_payment_date => p_payment_date,
    p_amount => p_total_paid,
    p_payment_method => p_payment_method,
    p_payment_type => p_payment_method,
    p_transaction_type => 'receipt',
    p_reference_number => NULLIF(BTRIM(COALESCE(p_reference_number, '')), ''),
    p_agreement_number => NULL,
    p_check_number => NULL,
    p_bank_id => p_bank_id,
    p_notes => 'Rental receipt ' || COALESCE(v_receipt.receipt_number, v_receipt.id::text)
      || COALESCE(' - ' || NULLIF(BTRIM(COALESCE(p_notes, '')), ''), ''),
    p_created_by => v_actor_id,
    p_idempotency_key => 'rental-receipt:' || p_idempotency_key::text,
    p_account_id => NULL,
    p_cost_center_id => NULL,
    p_currency => 'QAR',
    p_initial_status => 'completed',
    p_registration_metadata => jsonb_build_object(
      'monthly_amount', p_rent_amount,
      'amount_paid', p_total_paid,
      'remaining_amount', v_pending,
      'payment_month', to_char(p_payment_date, 'YYYY-MM'),
      'due_date', p_payment_date,
      'late_fee_amount', p_fine
    )
  );

  PERFORM set_config('app.rental_receipt_payment_v1', 'authorized', true);
  UPDATE public.rental_payment_receipts
  SET canonical_payment_id = v_payment_id,
      updated_at = now()
  WHERE id = v_receipt.id AND company_id = p_company_id;
  PERFORM set_config('app.rental_receipt_payment_v1', v_previous_guard, true);

  SELECT * INTO v_receipt
  FROM public.rental_payment_receipts receipt
  WHERE receipt.id = v_receipt.id;
  RETURN v_receipt;
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('app.rental_receipt_payment_v1', v_previous_guard, true);
    RAISE;
END;
$$;
REVOKE ALL ON FUNCTION public.create_rental_receipt_payment_v1(
  uuid, uuid, text, uuid, uuid, text, date, numeric, numeric, numeric,
  numeric, text, uuid, text, text, uuid, uuid
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_rental_receipt_payment_v1(
  uuid, uuid, text, uuid, uuid, text, date, numeric, numeric, numeric,
  numeric, text, uuid, text, text, uuid, uuid
) TO authenticated, service_role;
COMMENT ON FUNCTION public.create_rental_receipt_payment_v1(
  uuid, uuid, text, uuid, uuid, text, date, numeric, numeric, numeric,
  numeric, text, uuid, text, text, uuid, uuid
) IS 'Atomically and idempotently creates a rental receipt and its canonical customer payment.';
INSERT INTO public.system_agent_command_registry (
  command, domain, description, entity_table, allowed_fields,
  reversible, approval_required, closed_period_policy, min_confidence, enabled
) VALUES (
  'rental_receipt.sync_payment_state', 'accounting',
  'Derive rental receipt balance and state from its immutable amounts and canonical payment.',
  'rental_payment_receipts', ARRAY['pending_balance', 'payment_status'],
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
CREATE OR REPLACE FUNCTION public.system_agent_apply_rental_receipt_repair_v1(
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
  v_receipt public.rental_payment_receipts%ROWTYPE;
  v_payment public.payments%ROWTYPE;
  v_before jsonb;
  v_after jsonb;
  v_pending numeric;
  v_status text;
  v_repair_id uuid := gen_random_uuid();
  v_previous_guard text := COALESCE(current_setting('app.rental_receipt_payment_v1', true), '');
BEGIN
  IF p_command <> 'rental_receipt.sync_payment_state' THEN
    RAISE EXCEPTION 'Command is not handled by the rental receipt repair gateway';
  END IF;
  IF COALESCE(p_values, '{}'::jsonb) <> '{}'::jsonb THEN
    RAISE EXCEPTION 'Rental receipt repairs do not accept caller-selected values';
  END IF;

  SELECT * INTO v_job FROM public.system_agent_jobs job
  WHERE job.id = p_job_id AND job.run_id = p_run_id AND job.company_id = p_company_id
  FOR UPDATE;
  IF v_job.id IS NULL OR v_job.status <> 'running' OR v_job.mode <> 'apply'
     OR v_job.domain <> 'accounting'
  THEN
    RAISE EXCEPTION 'System agent accounting job is not an active apply job';
  END IF;

  SELECT * INTO v_finding FROM public.system_agent_findings finding
  WHERE finding.id = p_finding_id AND finding.run_id = p_run_id
    AND finding.job_id = p_job_id AND finding.company_id = p_company_id
  FOR UPDATE;
  IF v_finding.id IS NULL OR v_finding.repair_command IS DISTINCT FROM p_command
     OR v_finding.entity_type IS DISTINCT FROM 'rental_payment_receipt'
     OR v_finding.entity_id IS DISTINCT FROM p_entity_id
     OR v_finding.status IN ('repaired', 'rolled_back')
  THEN
    RAISE EXCEPTION 'Rental receipt finding is invalid, mismatched, or already processed';
  END IF;

  SELECT * INTO v_registry FROM public.system_agent_command_registry registry
  WHERE registry.command = p_command AND registry.domain = 'accounting'
    AND registry.enabled AND registry.reversible AND NOT registry.approval_required;
  IF v_registry.command IS NULL OR v_finding.confidence < v_registry.min_confidence THEN
    RAISE EXCEPTION 'Rental receipt repair command is disabled or below confidence threshold';
  END IF;

  SELECT * INTO v_receipt FROM public.rental_payment_receipts receipt
  WHERE receipt.id = p_entity_id::uuid AND receipt.company_id = p_company_id
  FOR UPDATE;
  IF v_receipt.id IS NULL OR v_receipt.idempotency_key IS NULL
     OR v_receipt.canonical_payment_id IS NULL
  THEN
    RAISE EXCEPTION 'Rental receipt is not a canonical atomic receipt';
  END IF;

  SELECT * INTO v_payment FROM public.payments payment
  WHERE payment.id = v_receipt.canonical_payment_id
    AND payment.company_id = p_company_id
  FOR UPDATE;
  IF v_payment.id IS NULL
     OR v_payment.customer_id IS DISTINCT FROM v_receipt.customer_id
     OR v_payment.contract_id IS DISTINCT FROM v_receipt.contract_id
     OR v_payment.payment_date IS DISTINCT FROM v_receipt.payment_date
     OR abs(COALESCE(v_payment.amount, 0) - v_receipt.total_paid) > 0.01
     OR lower(COALESCE(v_payment.payment_status, '')) <> 'completed'
     OR lower(COALESCE(v_payment.transaction_type::text, '')) <> 'receipt'
  THEN
    RAISE EXCEPTION 'Canonical payment evidence does not match the rental receipt';
  END IF;

  v_before := public.system_agent_pick_fields(to_jsonb(v_receipt), v_registry.allowed_fields);
  IF NOT (v_before @> COALESCE(p_expected_before, '{}'::jsonb)) THEN
    RAISE EXCEPTION 'Rental receipt changed after detection';
  END IF;

  v_pending := greatest(round(v_receipt.amount_due - v_receipt.total_paid, 2), 0);
  v_status := CASE WHEN v_pending <= 0.01 THEN 'paid' ELSE 'partial' END;
  PERFORM set_config('app.rental_receipt_payment_v1', 'authorized', true);
  UPDATE public.rental_payment_receipts
  SET pending_balance = v_pending, payment_status = v_status, updated_at = now()
  WHERE id = v_receipt.id AND company_id = p_company_id;
  PERFORM set_config('app.rental_receipt_payment_v1', v_previous_guard, true);

  SELECT * INTO v_receipt FROM public.rental_payment_receipts receipt
  WHERE receipt.id = v_receipt.id;
  v_after := public.system_agent_pick_fields(to_jsonb(v_receipt), v_registry.allowed_fields);
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
    v_repair_id, p_run_id, p_job_id, p_finding_id, p_company_id,
    'accounting', p_command, 'rental_payment_receipts', v_receipt.id::text,
    v_before, v_after,
    COALESCE(p_metadata, '{}'::jsonb)
      || jsonb_build_object('handler_version', 'rental_receipt_v1')
  );
  UPDATE public.system_agent_findings
  SET status = 'repaired', repair_id = v_repair_id, error = NULL, updated_at = now()
  WHERE id = p_finding_id;
  RETURN jsonb_build_object('status', 'repaired', 'repair_id', v_repair_id,
    'command', p_command, 'entity_id', v_receipt.id, 'before', v_before, 'after', v_after);
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('app.rental_receipt_payment_v1', v_previous_guard, true);
    RAISE;
END;
$$;
REVOKE ALL ON FUNCTION public.system_agent_apply_rental_receipt_repair_v1(
  uuid, uuid, uuid, text, uuid, text, jsonb, jsonb, jsonb
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_apply_rental_receipt_repair_v1(
  uuid, uuid, uuid, text, uuid, text, jsonb, jsonb, jsonb
) TO service_role;
DO $$
BEGIN
  IF to_regprocedure('public.system_agent_rollback_repair_before_rental_receipt_v1(uuid,text)') IS NULL THEN
    ALTER FUNCTION public.system_agent_rollback_repair(uuid, text)
      RENAME TO system_agent_rollback_repair_before_rental_receipt_v1;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.system_agent_rollback_repair_before_rental_receipt_v1(uuid, text)
  FROM PUBLIC, anon, authenticated;
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
  v_receipt public.rental_payment_receipts%ROWTYPE;
  v_current jsonb;
  v_previous_guard text := COALESCE(current_setting('app.rental_receipt_payment_v1', true), '');
BEGIN
  SELECT * INTO v_repair FROM public.system_agent_repairs repair
  WHERE repair.id = p_repair_id FOR UPDATE;
  IF v_repair.id IS NULL THEN RAISE EXCEPTION 'Repair was not found'; END IF;
  IF COALESCE(v_repair.rollback_metadata ->> 'handler_version', '') <> 'rental_receipt_v1' THEN
    RETURN public.system_agent_rollback_repair_before_rental_receipt_v1(p_repair_id, p_reason);
  END IF;
  IF v_repair.status = 'rolled_back' THEN
    RETURN jsonb_build_object('repair_id', p_repair_id, 'status', 'rolled_back');
  END IF;
  IF v_repair.status <> 'applied' OR v_repair.command <> 'rental_receipt.sync_payment_state' THEN
    RAISE EXCEPTION 'Only an applied rental receipt repair can be rolled back';
  END IF;

  SELECT * INTO v_receipt FROM public.rental_payment_receipts receipt
  WHERE receipt.id = v_repair.entity_id::uuid AND receipt.company_id = v_repair.company_id
  FOR UPDATE;
  IF v_receipt.id IS NULL THEN RAISE EXCEPTION 'Rental receipt was not found'; END IF;
  v_current := public.system_agent_pick_fields(
    to_jsonb(v_receipt), ARRAY['pending_balance', 'payment_status']::text[]
  );
  IF v_current IS DISTINCT FROM v_repair.after_state THEN
    RAISE EXCEPTION 'Rental receipt changed after repair; rollback was safely aborted';
  END IF;

  PERFORM set_config('app.rental_receipt_payment_v1', 'authorized', true);
  UPDATE public.rental_payment_receipts
  SET pending_balance = (v_repair.before_state ->> 'pending_balance')::numeric,
      payment_status = v_repair.before_state ->> 'payment_status',
      updated_at = now()
  WHERE id = v_receipt.id AND company_id = v_repair.company_id;
  PERFORM set_config('app.rental_receipt_payment_v1', v_previous_guard, true);

  UPDATE public.system_agent_repairs
  SET status = 'rolled_back', rolled_back_at = now(),
      rollback_reason = left(COALESCE(NULLIF(BTRIM(p_reason), ''), 'System agent rollback'), 1000),
      error = NULL, updated_at = now()
  WHERE id = p_repair_id;
  UPDATE public.system_agent_findings
  SET status = 'rolled_back', error = NULL, updated_at = now()
  WHERE id = v_repair.finding_id;
  RETURN jsonb_build_object('repair_id', p_repair_id, 'status', 'rolled_back');
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('app.rental_receipt_payment_v1', v_previous_guard, true);
    RAISE;
END;
$$;
REVOKE ALL ON FUNCTION public.system_agent_rollback_repair(uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_rollback_repair(uuid, text) TO service_role;
