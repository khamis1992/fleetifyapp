-- Restore the allocation command installed by 20260712052000.

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
  v_previous_batch text := COALESCE(current_setting('app.payment_allocation_batch_mode', true), '');
BEGIN
  IF p_payment_id IS NULL OR p_company_id IS NULL
     OR jsonb_typeof(COALESCE(p_allocations, '[]'::jsonb)) <> 'array'
     OR NULLIF(BTRIM(COALESCE(p_reason, '')), '') IS NULL
  THEN
    RAISE EXCEPTION 'Payment, company, allocation array, and reason are required' USING ERRCODE = 'P0001';
  END IF;

  v_actor := CASE WHEN v_actor_role = 'service_role' THEN p_actor_id ELSE auth.uid() END;
  IF v_actor_role <> 'service_role' THEN
    IF v_actor IS NULL OR (p_actor_id IS NOT NULL AND p_actor_id IS DISTINCT FROM v_actor) THEN
      RAISE EXCEPTION 'Actor identity mismatch' USING ERRCODE = 'P0001';
    END IF;
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles role
      WHERE role.user_id = v_actor
        AND role.role::text IN ('super_admin', 'admin', 'company_admin', 'manager', 'accountant')
    ) INTO v_allowed;
    IF NOT v_allowed OR (
      NOT EXISTS (
        SELECT 1 FROM public.user_roles role
        WHERE role.user_id = v_actor AND role.role::text = 'super_admin'
      )
      AND public.get_user_company_id() IS DISTINCT FROM p_company_id
    ) THEN
      RAISE EXCEPTION 'Not authorized to replace payment allocations' USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT * INTO v_payment
  FROM public.payments payment
  WHERE payment.id = p_payment_id AND payment.company_id = p_company_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found in company' USING ERRCODE = 'P0001';
  END IF;
  IF lower(COALESCE(v_payment.payment_status, '')) NOT IN ('completed', 'paid', 'success', 'succeeded')
     OR lower(COALESCE(v_payment.transaction_type::text, 'receipt')) <> 'receipt'
  THEN
    RAISE EXCEPTION 'Only completed receipts can be allocated' USING ERRCODE = 'P0001';
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
    RAISE EXCEPTION 'Payment allocations changed after review' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_allocations) element
    WHERE NULLIF(element ->> 'invoice_id', '') IS NULL
      OR COALESCE((element ->> 'amount')::numeric, 0) <= 0
  ) OR (
    SELECT COUNT(*) FROM jsonb_array_elements(p_allocations)
  ) <> (
    SELECT COUNT(DISTINCT element ->> 'invoice_id') FROM jsonb_array_elements(p_allocations) element
  ) THEN
    RAISE EXCEPTION 'Allocations require unique invoice ids and positive amounts' USING ERRCODE = 'P0001';
  END IF;

  SELECT COALESCE(SUM((element ->> 'amount')::numeric), 0) INTO v_total
  FROM jsonb_array_elements(p_allocations) element;
  IF v_total > COALESCE(v_payment.amount, 0) + 0.01 THEN
    RAISE EXCEPTION 'Allocation total exceeds payment amount by QAR %',
      ROUND((v_total - COALESCE(v_payment.amount, 0))::numeric, 2)
      USING ERRCODE = 'P0001';
  END IF;

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
    void_reason = p_reason,
    updated_at = now()
  WHERE allocation.payment_id = p_payment_id AND allocation.is_active = true;

  INSERT INTO public.payment_allocations (
    company_id, payment_id, allocation_type, target_id, amount,
    allocated_date, allocation_method, allocation_order, notes, created_by
  )
  SELECT
    p_company_id, p_payment_id, 'invoice',
    (element.value ->> 'invoice_id')::uuid,
    (element.value ->> 'amount')::numeric,
    now(), 'manual', element.ordinality::integer,
    p_reason, v_actor
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
    company_id, payment_id, before_allocations, after_allocations,
    reason, source, changed_by
  ) VALUES (
    p_company_id, p_payment_id, v_before, v_after,
    BTRIM(p_reason), 'allocation_rpc', v_actor
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
