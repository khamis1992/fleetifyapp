-- Validate every invoice target and lock invoice balances before replacing
-- allocations. This prevents cross-company links and concurrent overpayment.

CREATE OR REPLACE FUNCTION public.replace_payment_invoice_allocations(
  p_payment_id uuid,
  p_company_id uuid,
  p_allocations jsonb,
  p_reason text,
  p_expected_allocations jsonb DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_actor uuid;
  v_actor_role text := COALESCE(NULLIF(auth.role()::text, ''), current_setting('request.jwt.claim.role', true), '');
  v_allowed boolean := false;
  v_before jsonb := '[]'::jsonb;
  v_after jsonb := '[]'::jsonb;
  v_total numeric := 0;
  v_old_invoice_ids uuid[] := ARRAY[]::uuid[];
  v_invoice_id uuid;
  v_target record;
  v_other_paid numeric := 0;
  v_previous_batch text := COALESCE(current_setting('app.payment_allocation_batch_mode', true), '');
BEGIN
  IF p_payment_id IS NULL OR p_company_id IS NULL
     OR jsonb_typeof(COALESCE(p_allocations, '[]'::jsonb)) <> 'array'
     OR NULLIF(BTRIM(COALESCE(p_reason, '')), '') IS NULL
  THEN
    RAISE EXCEPTION 'Payment, company, allocation array, and reason are required'
      USING ERRCODE = 'P0001';
  END IF;

  v_actor := CASE WHEN v_actor_role = 'service_role' THEN p_actor_id ELSE auth.uid() END;
  IF v_actor_role <> 'service_role' THEN
    IF v_actor IS NULL OR (p_actor_id IS NOT NULL AND p_actor_id IS DISTINCT FROM v_actor) THEN
      RAISE EXCEPTION 'Actor identity mismatch' USING ERRCODE = 'P0001';
    END IF;

    v_allowed := public.is_finance_action_authorized(
      v_actor,
      p_company_id,
      ARRAY['finance.payment.reconcile', 'finance.treasury.write', 'finance.payments.write'],
      ARRAY['super_admin', 'admin', 'company_admin', 'accountant']
    );

    IF NOT v_allowed THEN
      RAISE EXCEPTION 'Not authorized to replace payment allocations'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT *
  INTO v_payment
  FROM public.payments payment
  WHERE payment.id = p_payment_id
    AND payment.company_id = p_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found in company' USING ERRCODE = 'P0001';
  END IF;
  IF lower(COALESCE(v_payment.payment_status, '')) NOT IN ('completed', 'paid', 'success', 'succeeded')
     OR lower(COALESCE(v_payment.transaction_type::text, 'receipt')) <> 'receipt'
  THEN
    RAISE EXCEPTION 'Only completed customer receipts can be allocated'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('invoice_id', allocation.target_id, 'amount', allocation.amount)
    ORDER BY allocation.allocation_order
  ), '[]'::jsonb)
  INTO v_before
  FROM public.payment_allocations allocation
  WHERE allocation.payment_id = p_payment_id
    AND allocation.allocation_type = 'invoice'
    AND allocation.is_active = true;

  IF p_expected_allocations IS NOT NULL AND p_expected_allocations IS DISTINCT FROM v_before THEN
    RAISE EXCEPTION 'Payment allocations changed after review'
      USING ERRCODE = '40001';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_allocations) element
    WHERE jsonb_typeof(element) <> 'object'
      OR jsonb_typeof(element -> 'invoice_id') <> 'string'
      OR COALESCE(element ->> 'invoice_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      OR CASE
        WHEN jsonb_typeof(element -> 'amount') = 'number'
          THEN COALESCE((element ->> 'amount')::numeric, 0) <= 0
        ELSE true
      END
  ) THEN
    RAISE EXCEPTION 'Every allocation requires a valid invoice id and positive numeric amount'
      USING ERRCODE = 'P0001';
  END IF;

  IF (
    SELECT COUNT(*)
    FROM jsonb_array_elements(p_allocations)
  ) <> (
    SELECT COUNT(DISTINCT element ->> 'invoice_id')
    FROM jsonb_array_elements(p_allocations) element
  ) THEN
    RAISE EXCEPTION 'An invoice can only appear once in an allocation request'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(SUM((element ->> 'amount')::numeric), 0)
  INTO v_total
  FROM jsonb_array_elements(p_allocations) element;

  IF v_total > COALESCE(v_payment.amount, 0) + 0.01 THEN
    RAISE EXCEPTION 'Allocation total exceeds payment amount by QAR %',
      round((v_total - COALESCE(v_payment.amount, 0))::numeric, 2)
      USING ERRCODE = 'P0001';
  END IF;

  PERFORM 1
  FROM public.invoices invoice
  WHERE invoice.id IN (
    SELECT (element ->> 'invoice_id')::uuid
    FROM jsonb_array_elements(p_allocations) element
  )
  ORDER BY invoice.id
  FOR UPDATE;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_allocations) element
    LEFT JOIN public.invoices invoice
      ON invoice.id = (element ->> 'invoice_id')::uuid
    WHERE invoice.id IS NULL
      OR invoice.company_id IS DISTINCT FROM p_company_id
      OR lower(COALESCE(invoice.status, '')) IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
      OR lower(COALESCE(invoice.payment_status, '')) IN ('cancelled', 'canceled', 'void', 'voided')
      OR (
        invoice.customer_id IS NOT NULL
        AND invoice.customer_id IS DISTINCT FROM v_payment.customer_id
      )
      OR (
        v_payment.contract_id IS NOT NULL
        AND invoice.contract_id IS DISTINCT FROM v_payment.contract_id
      )
  ) THEN
    RAISE EXCEPTION 'Allocation target is missing, inactive, belongs to another company/customer, or conflicts with the payment contract'
      USING ERRCODE = 'P0001';
  END IF;

  FOR v_target IN
    SELECT
      invoice.id AS invoice_id,
      invoice.invoice_number,
      invoice.total_amount,
      (element ->> 'amount')::numeric AS allocation_amount
    FROM jsonb_array_elements(p_allocations) element
    JOIN public.invoices invoice
      ON invoice.id = (element ->> 'invoice_id')::uuid
    ORDER BY invoice.id
  LOOP
    v_other_paid := public.canonical_invoice_paid_amount(v_target.invoice_id, p_payment_id);
    IF v_other_paid + v_target.allocation_amount > COALESCE(v_target.total_amount, 0) + 0.01 THEN
      RAISE EXCEPTION 'Allocation would overpay invoice % by QAR %',
        COALESCE(v_target.invoice_number, v_target.invoice_id::text),
        round((v_other_paid + v_target.allocation_amount - COALESCE(v_target.total_amount, 0))::numeric, 2)
        USING ERRCODE = 'P0001';
    END IF;
  END LOOP;

  SELECT COALESCE(array_agg(allocation.target_id), ARRAY[]::uuid[])
  INTO v_old_invoice_ids
  FROM public.payment_allocations allocation
  WHERE allocation.payment_id = p_payment_id
    AND allocation.allocation_type = 'invoice'
    AND allocation.is_active = true;

  PERFORM set_config('app.payment_allocation_batch_mode', 'on', true);

  UPDATE public.payment_allocations allocation
  SET
    is_active = false,
    voided_at = now(),
    voided_by = v_actor,
    void_reason = BTRIM(p_reason),
    updated_at = now()
  WHERE allocation.payment_id = p_payment_id
    AND allocation.is_active = true;

  INSERT INTO public.payment_allocations (
    company_id,
    payment_id,
    allocation_type,
    target_id,
    amount,
    allocated_date,
    allocation_method,
    allocation_order,
    notes,
    created_by
  )
  SELECT
    p_company_id,
    p_payment_id,
    'invoice',
    (element.value ->> 'invoice_id')::uuid,
    (element.value ->> 'amount')::numeric,
    now(),
    'manual',
    element.ordinality::integer,
    BTRIM(p_reason),
    v_actor
  FROM jsonb_array_elements(p_allocations) WITH ORDINALITY element(value, ordinality);

  PERFORM set_config('app.payment_allocation_batch_mode', v_previous_batch, true);
  PERFORM public.sync_payment_allocation_state(p_payment_id);

  FOR v_invoice_id IN
    SELECT DISTINCT candidate_id
    FROM (
      SELECT unnest(v_old_invoice_ids) AS candidate_id
      UNION ALL
      SELECT (element ->> 'invoice_id')::uuid
      FROM jsonb_array_elements(p_allocations) element
    ) candidates
    WHERE candidate_id IS NOT NULL
  LOOP
    PERFORM public.recalculate_invoice_financial_state(v_invoice_id);
  END LOOP;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('invoice_id', allocation.target_id, 'amount', allocation.amount)
    ORDER BY allocation.allocation_order
  ), '[]'::jsonb)
  INTO v_after
  FROM public.payment_allocations allocation
  WHERE allocation.payment_id = p_payment_id
    AND allocation.allocation_type = 'invoice'
    AND allocation.is_active = true;

  INSERT INTO public.payment_allocation_change_log (
    company_id,
    payment_id,
    before_allocations,
    after_allocations,
    reason,
    source,
    changed_by
  ) VALUES (
    p_company_id,
    p_payment_id,
    v_before,
    v_after,
    BTRIM(p_reason),
    'allocation_rpc',
    v_actor
  );

  RETURN jsonb_build_object(
    'payment_id', p_payment_id,
    'before', v_before,
    'after', v_after,
    'allocated_amount', v_total,
    'unallocated_amount', GREATEST(COALESCE(v_payment.amount, 0) - v_total, 0)
  );
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('app.payment_allocation_batch_mode', v_previous_batch, true);
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_payment_invoice_allocations(uuid, uuid, jsonb, text, jsonb, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_payment_invoice_allocations(uuid, uuid, jsonb, text, jsonb, uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.replace_payment_invoice_allocations(uuid, uuid, jsonb, text, jsonb, uuid) IS
'Atomically replaces invoice allocations after tenant, customer, contract, status, duplicate, and locked-balance validation.';
