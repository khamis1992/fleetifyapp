-- Keep rental principal and late-fee collections separate while preserving one
-- customer receipt for the total cash received.

CREATE OR REPLACE FUNCTION public.validate_payment_allocation_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_invoice public.invoices%ROWTYPE;
  v_late_fee public.late_fees%ROWTYPE;
  v_payment_allocated numeric := 0;
  v_target_allocated numeric := 0;
BEGIN
  IF TG_OP = 'UPDATE' AND (
    NEW.company_id IS DISTINCT FROM OLD.company_id
    OR NEW.payment_id IS DISTINCT FROM OLD.payment_id
    OR NEW.allocation_type IS DISTINCT FROM OLD.allocation_type
    OR NEW.target_id IS DISTINCT FROM OLD.target_id
    OR NEW.created_by IS DISTINCT FROM OLD.created_by
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  ) THEN
    RAISE EXCEPTION 'Allocation ownership and target fields are immutable; void and replace the row'
      USING ERRCODE = 'P0001';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.is_active = true AND NEW.is_active = false THEN
    NEW.voided_at := COALESCE(NEW.voided_at, now());
    IF NULLIF(BTRIM(COALESCE(NEW.void_reason, '')), '') IS NULL THEN
      RAISE EXCEPTION 'A void reason is required for payment allocations'
        USING ERRCODE = 'P0001';
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  IF NEW.is_active = false THEN
    NEW.updated_at := now();
    RETURN NEW;
  END IF;
  IF NEW.allocation_type NOT IN ('invoice', 'late_fee') THEN
    RAISE EXCEPTION 'Only invoice and late-fee allocations are currently supported'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT *
  INTO v_payment
  FROM public.payments payment
  WHERE payment.id = NEW.payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found for allocation' USING ERRCODE = 'P0001';
  END IF;
  IF v_payment.company_id IS DISTINCT FROM NEW.company_id THEN
    RAISE EXCEPTION 'Allocation company does not match payment company'
      USING ERRCODE = 'P0001';
  END IF;
  IF lower(COALESCE(v_payment.payment_status, '')) NOT IN ('completed', 'paid', 'success', 'succeeded')
     OR lower(COALESCE(v_payment.transaction_type::text, 'receipt')) <> 'receipt'
  THEN
    RAISE EXCEPTION 'Only completed receipt payments can be allocated'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(SUM(allocation.amount), 0)
  INTO v_payment_allocated
  FROM public.payment_allocations allocation
  WHERE allocation.payment_id = NEW.payment_id
    AND allocation.is_active = true
    AND allocation.id IS DISTINCT FROM NEW.id;

  IF v_payment_allocated + NEW.amount > COALESCE(v_payment.amount, 0) + 0.01 THEN
    RAISE EXCEPTION 'Allocation would exceed payment amount by QAR %',
      round((v_payment_allocated + NEW.amount - COALESCE(v_payment.amount, 0))::numeric, 2)
      USING ERRCODE = 'P0001';
  END IF;

  IF NEW.allocation_type = 'invoice' THEN
    SELECT *
    INTO v_invoice
    FROM public.invoices invoice
    WHERE invoice.id = NEW.target_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Target invoice not found' USING ERRCODE = 'P0001';
    END IF;
    IF v_invoice.company_id IS DISTINCT FROM NEW.company_id
       OR (v_invoice.customer_id IS NOT NULL AND v_invoice.customer_id IS DISTINCT FROM v_payment.customer_id)
       OR v_invoice.contract_id IS DISTINCT FROM v_payment.contract_id
    THEN
      RAISE EXCEPTION 'Allocation invoice does not match payment company, customer, or contract'
        USING ERRCODE = 'P0001';
    END IF;
    IF lower(COALESCE(v_invoice.status, '')) IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
       OR lower(COALESCE(v_invoice.payment_status, '')) IN ('cancelled', 'canceled', 'void', 'voided')
    THEN
      RAISE EXCEPTION 'Inactive invoices cannot receive allocations' USING ERRCODE = 'P0001';
    END IF;

    v_target_allocated := public.canonical_invoice_paid_amount(NEW.target_id, NEW.payment_id);
    SELECT v_target_allocated + COALESCE(SUM(allocation.amount), 0)
    INTO v_target_allocated
    FROM public.payment_allocations allocation
    WHERE allocation.payment_id = NEW.payment_id
      AND allocation.allocation_type = 'invoice'
      AND allocation.target_id = NEW.target_id
      AND allocation.is_active = true
      AND allocation.id IS DISTINCT FROM NEW.id;

    IF v_target_allocated + NEW.amount > COALESCE(v_invoice.total_amount, 0) + 0.01 THEN
      RAISE EXCEPTION 'Allocation would overpay invoice by QAR %',
        round((v_target_allocated + NEW.amount - COALESCE(v_invoice.total_amount, 0))::numeric, 2)
        USING ERRCODE = 'P0001';
    END IF;
  ELSE
    SELECT *
    INTO v_late_fee
    FROM public.late_fees late_fee
    WHERE late_fee.id = NEW.target_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Target late fee not found' USING ERRCODE = 'P0001';
    END IF;
    IF v_late_fee.company_id IS DISTINCT FROM NEW.company_id
       OR v_late_fee.invoice_id IS DISTINCT FROM v_payment.invoice_id
       OR v_late_fee.contract_id IS DISTINCT FROM v_payment.contract_id
       OR lower(COALESCE(v_late_fee.status, '')) IN ('waived', 'cancelled')
    THEN
      RAISE EXCEPTION 'Late-fee allocation does not match the payment or targets an inactive fee'
        USING ERRCODE = 'P0001';
    END IF;

    SELECT COALESCE(SUM(allocation.amount), 0)
    INTO v_target_allocated
    FROM public.payment_allocations allocation
    JOIN public.payments payment ON payment.id = allocation.payment_id
    WHERE allocation.allocation_type = 'late_fee'
      AND allocation.target_id = NEW.target_id
      AND allocation.is_active = true
      AND allocation.id IS DISTINCT FROM NEW.id
      AND lower(COALESCE(payment.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded');

    IF v_target_allocated + NEW.amount > COALESCE(v_late_fee.fee_amount, 0) + 0.01 THEN
      RAISE EXCEPTION 'Allocation would overpay late fee by QAR %',
        round((v_target_allocated + NEW.amount - COALESCE(v_late_fee.fee_amount, 0))::numeric, 2)
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE OR REPLACE FUNCTION public.after_payment_allocation_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(current_setting('app.payment_allocation_batch_mode', true), '') = 'on' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM public.sync_payment_allocation_state(OLD.payment_id);
    IF OLD.allocation_type = 'invoice' THEN
      PERFORM public.recalculate_invoice_financial_state(OLD.target_id);
    END IF;
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.sync_payment_allocation_state(NEW.payment_id);
    IF NEW.allocation_type = 'invoice' THEN
      PERFORM public.recalculate_invoice_financial_state(NEW.target_id);
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE OR REPLACE FUNCTION public.create_invoice_payment_with_late_fee_v1(
  p_company_id uuid,
  p_invoice_id uuid,
  p_amount numeric,
  p_late_fee_amount numeric,
  p_late_fee_id uuid,
  p_payment_date date,
  p_payment_method text,
  p_reference_number text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid;
  v_actor_role text := COALESCE(NULLIF(auth.role()::text, ''), current_setting('request.jwt.claim.role', true), '');
  v_invoice public.invoices%ROWTYPE;
  v_late_fee public.late_fees%ROWTYPE;
  v_existing public.payments%ROWTYPE;
  v_payment_id uuid;
  v_payment_number text;
  v_method text := lower(BTRIM(COALESCE(p_payment_method, '')));
  v_idempotency_key text := NULLIF(BTRIM(COALESCE(p_idempotency_key, '')), '');
  v_principal_amount numeric := round(COALESCE(p_amount, 0) - COALESCE(p_late_fee_amount, 0), 2);
  v_existing_paid numeric := 0;
  v_bank_id uuid;
  v_previous_batch text := COALESCE(current_setting('app.payment_allocation_batch_mode', true), '');
BEGIN
  IF p_company_id IS NULL OR p_invoice_id IS NULL OR p_payment_date IS NULL
     OR COALESCE(p_amount, 0) <= 0 OR COALESCE(p_late_fee_amount, 0) <= 0
     OR v_principal_amount < 0 OR v_method = ''
  THEN
    RAISE EXCEPTION 'Company, invoice, date, method, and valid receipt amounts are required'
      USING ERRCODE = 'P0001';
  END IF;

  v_actor := CASE WHEN v_actor_role = 'service_role' THEN p_actor_id ELSE auth.uid() END;
  IF v_actor_role <> 'service_role' THEN
    IF v_actor IS NULL OR (p_actor_id IS NOT NULL AND p_actor_id IS DISTINCT FROM v_actor) THEN
      RAISE EXCEPTION 'Actor identity mismatch' USING ERRCODE = 'P0001';
    END IF;
    IF NOT public.is_finance_action_authorized(
      v_actor,
      p_company_id,
      ARRAY['finance.payment.create', 'finance.payments.create', 'finance.payments.write', 'payments.create'],
      ARRAY['super_admin', 'admin', 'company_admin', 'manager', 'accountant', 'sales_agent']
    ) THEN
      RAISE EXCEPTION 'Not authorized to create payments for this company'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  PERFORM public.assert_financial_period_is_open(p_company_id, p_payment_date);

  SELECT *
  INTO v_invoice
  FROM public.invoices invoice
  WHERE invoice.id = p_invoice_id
    AND invoice.company_id = p_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found in the requested company' USING ERRCODE = 'P0001';
  END IF;
  IF lower(COALESCE(v_invoice.status, '')) IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
     OR lower(COALESCE(v_invoice.payment_status, '')) IN ('cancelled', 'canceled', 'void', 'voided')
  THEN
    RAISE EXCEPTION 'Cannot pay an inactive invoice' USING ERRCODE = 'P0001';
  END IF;

  v_existing_paid := public.canonical_invoice_paid_amount(p_invoice_id, NULL);
  IF v_existing_paid + v_principal_amount > COALESCE(v_invoice.total_amount, 0) + 0.01 THEN
    RAISE EXCEPTION 'Principal payment would overpay invoice by QAR %',
      round((v_existing_paid + v_principal_amount - COALESCE(v_invoice.total_amount, 0))::numeric, 2)
      USING ERRCODE = 'P0001';
  END IF;

  IF v_idempotency_key IS NOT NULL THEN
    SELECT *
    INTO v_existing
    FROM public.payments payment
    WHERE payment.company_id = p_company_id
      AND payment.idempotency_key = v_idempotency_key
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
      IF v_existing.invoice_id IS DISTINCT FROM p_invoice_id
         OR abs(COALESCE(v_existing.amount, 0) - p_amount) >= 0.005
         OR abs(COALESCE(v_existing.late_fee_amount, 0) - p_late_fee_amount) >= 0.005
      THEN
        RAISE EXCEPTION 'Idempotency key was already used with different payment data'
          USING ERRCODE = 'P0001';
      END IF;
      RETURN v_existing.id;
    END IF;
  END IF;

  IF p_late_fee_id IS NOT NULL THEN
    SELECT *
    INTO v_late_fee
    FROM public.late_fees late_fee
    WHERE late_fee.id = p_late_fee_id
      AND late_fee.company_id = p_company_id
      AND late_fee.invoice_id = p_invoice_id
      AND lower(COALESCE(late_fee.status, '')) IN ('pending', 'applied')
    FOR UPDATE;
  ELSE
    SELECT *
    INTO v_late_fee
    FROM public.late_fees late_fee
    WHERE late_fee.company_id = p_company_id
      AND late_fee.invoice_id = p_invoice_id
      AND lower(COALESCE(late_fee.status, '')) IN ('pending', 'applied')
    ORDER BY late_fee.created_at DESC
    LIMIT 1
    FOR UPDATE;
  END IF;

  IF NOT FOUND THEN
    INSERT INTO public.late_fees (
      company_id, invoice_id, contract_id, original_amount, days_overdue,
      fee_amount, fee_type, status, applied_at, applied_by
    ) VALUES (
      p_company_id,
      p_invoice_id,
      v_invoice.contract_id,
      COALESCE(v_invoice.total_amount, 0),
      GREATEST(p_payment_date - COALESCE(v_invoice.due_date, p_payment_date), 0),
      p_late_fee_amount,
      'payment_assessed',
      'applied',
      now(),
      v_actor
    )
    RETURNING * INTO v_late_fee;
  END IF;

  IF p_late_fee_amount > COALESCE(v_late_fee.fee_amount, 0) + 0.01 THEN
    RAISE EXCEPTION 'Late-fee payment exceeds the assessed fee by QAR %',
      round((p_late_fee_amount - COALESCE(v_late_fee.fee_amount, 0))::numeric, 2)
      USING ERRCODE = 'P0001';
  END IF;

  v_bank_id := public.resolve_payment_bank_id(
    p_company_id,
    NULL,
    v_method,
    'QAR'
  );
  v_payment_number := public.generate_payment_number(p_company_id);

  PERFORM set_config('app.payment_allocation_batch_mode', 'on', true);

  INSERT INTO public.payments (
    company_id, customer_id, contract_id, invoice_id, payment_number,
    payment_date, amount, payment_method, payment_type, payment_status,
    transaction_type, reference_number, bank_id, notes, created_by,
    allocation_status, processing_status, idempotency_key, currency,
    late_fee_amount, late_fine_amount, late_fine_status, late_fine_type,
    amount_paid, remaining_amount, due_date, days_overdue, created_at, updated_at
  ) VALUES (
    p_company_id,
    v_invoice.customer_id,
    v_invoice.contract_id,
    p_invoice_id,
    v_payment_number,
    p_payment_date,
    p_amount,
    v_method,
    v_method,
    'completed',
    'receipt'::public.transaction_type,
    NULLIF(BTRIM(COALESCE(p_reference_number, '')), ''),
    v_bank_id,
    NULLIF(BTRIM(COALESCE(p_notes, '')), ''),
    v_actor,
    'fully_allocated',
    'completed',
    v_idempotency_key,
    'QAR',
    p_late_fee_amount,
    p_late_fee_amount,
    'paid',
    'included_with_payment',
    v_principal_amount,
    GREATEST(COALESCE(v_invoice.total_amount, 0) - v_existing_paid - v_principal_amount, 0),
    v_invoice.due_date,
    GREATEST(p_payment_date - COALESCE(v_invoice.due_date, p_payment_date), 0),
    now(),
    now()
  )
  RETURNING id INTO v_payment_id;

  INSERT INTO public.payment_allocations (
    company_id, payment_id, allocation_type, target_id, amount,
    allocated_date, allocation_method, allocation_order, notes, created_by
  )
  SELECT
    p_company_id, v_payment_id, 'invoice', p_invoice_id, v_principal_amount,
    p_payment_date::timestamptz, 'auto', 1,
    'Invoice principal separated from the late fee.', v_actor
  WHERE v_principal_amount > 0;

  INSERT INTO public.payment_allocations (
    company_id, payment_id, allocation_type, target_id, amount,
    allocated_date, allocation_method, allocation_order, notes, created_by
  ) VALUES (
    p_company_id, v_payment_id, 'late_fee', v_late_fee.id, p_late_fee_amount,
    p_payment_date::timestamptz, 'auto', 2,
    'Late fee collected separately from rental principal.', v_actor
  );

  PERFORM public.sync_payment_allocation_state(v_payment_id);
  PERFORM public.recalculate_invoice_financial_state(p_invoice_id);
  IF v_invoice.contract_id IS NOT NULL THEN
    PERFORM public.recalculate_contract_financial_state(v_invoice.contract_id);
  END IF;
  PERFORM public.create_payment_bank_transaction(v_payment_id);

  PERFORM set_config('app.payment_allocation_batch_mode', v_previous_batch, true);
  RETURN v_payment_id;
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('app.payment_allocation_batch_mode', v_previous_batch, true);
    RAISE;
END;
$$;
REVOKE ALL ON FUNCTION public.create_invoice_payment_with_late_fee_v1(
  uuid, uuid, numeric, numeric, uuid, date, text, text, text, text, uuid
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_invoice_payment_with_late_fee_v1(
  uuid, uuid, numeric, numeric, uuid, date, text, text, text, text, uuid
) TO authenticated, service_role;
COMMENT ON FUNCTION public.create_invoice_payment_with_late_fee_v1(
  uuid, uuid, numeric, numeric, uuid, date, text, text, text, text, uuid
) IS
'Creates one cash receipt with audited invoice-principal and late-fee allocations so penalties never inflate contract principal paid.';
