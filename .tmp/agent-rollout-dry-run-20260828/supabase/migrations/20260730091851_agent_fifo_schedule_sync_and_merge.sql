CREATE OR REPLACE FUNCTION public.allocate_contract_receipts_fifo(
  p_company_id uuid,
  p_contract_id uuid DEFAULT NULL,
  p_dry_run boolean DEFAULT true,
  p_max_payments integer DEFAULT 500
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_payment record;
  v_invoice record;
  v_today date := CURRENT_DATE;
  v_remainder numeric;
  v_amount numeric;
  v_order integer;
  v_allocated_total numeric := 0;
  v_allocations_created integer := 0;
  v_payments_processed integer := 0;
  v_warnings text[] := ARRAY[]::text[];
  v_affected_invoices uuid[] := ARRAY[]::uuid[];
  v_affected_contracts uuid[] := ARRAY[]::uuid[];
  v_previous_batch text := COALESCE(current_setting('app.payment_allocation_batch_mode', true), '');
BEGIN
  IF p_company_id IS NULL THEN
    RAISE EXCEPTION 'Company is required' USING ERRCODE = 'P0001';
  END IF;

  PERFORM set_config('app.payment_allocation_batch_mode', 'on', true);

  FOR v_payment IN
    SELECT
      payment.id,
      payment.contract_id,
      payment.payment_number,
      payment.reference_number,
      payment.amount,
      COALESCE(alloc_sum.allocated, 0) AS allocated
    FROM public.payments payment
    LEFT JOIN LATERAL (
      SELECT SUM(allocation.amount) AS allocated
      FROM public.payment_allocations allocation
      WHERE allocation.payment_id = payment.id
        AND allocation.is_active = true
    ) alloc_sum ON true
    WHERE payment.company_id = p_company_id
      AND payment.contract_id IS NOT NULL
      AND (p_contract_id IS NULL OR payment.contract_id = p_contract_id)
      AND lower(COALESCE(payment.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded')
      AND lower(COALESCE(payment.transaction_type::text, 'receipt')) = 'receipt'
    ORDER BY payment.payment_date, payment.created_at
    LIMIT GREATEST(p_max_payments, 1)
  LOOP
    v_remainder := round(COALESCE(v_payment.amount, 0)::numeric, 2);
    IF v_payment.allocated > 0.01 THEN
      v_remainder := round((COALESCE(v_payment.amount, 0) - v_payment.allocated)::numeric, 2);
    ELSE
      DECLARE
        v_has_direct_link boolean;
      BEGIN
        SELECT payment.invoice_id IS NOT NULL
        INTO v_has_direct_link
        FROM public.payments payment
        WHERE payment.id = v_payment.id;
        IF v_has_direct_link THEN
          v_remainder := 0;
        END IF;
      END;
    END IF;

    IF v_remainder <= 0.01 THEN
      CONTINUE;
    END IF;

    v_order := 1;
    SELECT COALESCE(MAX(allocation.allocation_order), 0) + 1
    INTO v_order
    FROM public.payment_allocations allocation
    WHERE allocation.payment_id = v_payment.id
      AND allocation.is_active = true;

    BEGIN
      FOR v_invoice IN
        SELECT
          invoice.id,
          invoice.contract_id,
          invoice.total_amount,
          public.canonical_invoice_paid_amount(invoice.id) AS canonical_paid
        FROM public.invoices invoice
        WHERE invoice.company_id = p_company_id
          AND invoice.contract_id = v_payment.contract_id
          AND lower(COALESCE(invoice.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
          AND lower(COALESCE(invoice.payment_status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided')
          AND COALESCE(invoice.due_date, invoice.invoice_date) <= v_today
        ORDER BY COALESCE(invoice.due_date, invoice.invoice_date), invoice.created_at
      LOOP
        EXIT WHEN v_remainder <= 0.01;

        v_amount := least(v_remainder, round((COALESCE(v_invoice.total_amount, 0) - COALESCE(v_invoice.canonical_paid, 0))::numeric, 2));
        IF v_amount <= 0.01 THEN
          CONTINUE;
        END IF;

        IF NOT p_dry_run THEN
          INSERT INTO public.payment_allocations (
            company_id, payment_id, allocation_type, target_id, amount,
            allocated_date, allocation_method, allocation_order, notes
          ) VALUES (
            p_company_id, v_payment.id, 'invoice', v_invoice.id, v_amount,
            now(), 'auto_fifo', v_order, 'Daily audit agent FIFO allocation of unallocated receipt'
          );
        END IF;

        v_order := v_order + 1;
        v_allocations_created := v_allocations_created + 1;
        v_allocated_total := round((v_allocated_total + v_amount)::numeric, 2);
        v_remainder := round((v_remainder - v_amount)::numeric, 2);
        v_affected_invoices := array_append(v_affected_invoices, v_invoice.id);
        v_affected_contracts := array_append(v_affected_contracts, v_invoice.contract_id);
      END LOOP;

      IF v_allocations_created > 0 AND NOT p_dry_run THEN
        PERFORM public.sync_payment_allocation_state(v_payment.id);
      END IF;
      v_payments_processed := v_payments_processed + 1;
    EXCEPTION
      WHEN OTHERS THEN
        v_warnings := array_append(
          v_warnings,
          format('Payment %s skipped: %s', COALESCE(v_payment.payment_number, v_payment.id::text), SQLERRM)
        );
    END;
  END LOOP;

  PERFORM set_config('app.payment_allocation_batch_mode', v_previous_batch, true);

  IF NOT p_dry_run THEN
    DECLARE
      v_invoice_id uuid;
      v_contract_id uuid;
    BEGIN
      FOREACH v_invoice_id IN ARRAY v_affected_invoices LOOP
        PERFORM public.recalculate_invoice_financial_state(v_invoice_id);
      END LOOP;
      FOREACH v_contract_id IN ARRAY v_affected_contracts LOOP
        PERFORM public.recalculate_contract_financial_state(v_contract_id);
      END LOOP;
    END;
  END IF;

  RETURN jsonb_build_object(
    'mode', CASE WHEN p_dry_run THEN 'dry_run' ELSE 'apply' END,
    'payments_processed', v_payments_processed,
    'allocations_created', v_allocations_created,
    'amount_allocated', v_allocated_total,
    'warnings', to_jsonb(v_warnings)
  );
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('app.payment_allocation_batch_mode', v_previous_batch, true);
    RAISE;
END;
$function$;

REVOKE ALL ON FUNCTION public.allocate_contract_receipts_fifo(uuid, uuid, boolean, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_contract_receipts_fifo(uuid, uuid, boolean, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.sync_contract_schedule_payment_state(
  p_contract_id uuid,
  p_dry_run boolean DEFAULT false
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_schedule record;
  v_paid numeric;
  v_status text;
  v_paid_date date;
  v_today date := CURRENT_DATE;
  v_changed integer := 0;
  v_previous_bypass text := COALESCE(current_setting('app.financial_controls_bypass', true), '');
BEGIN
  IF p_contract_id IS NULL THEN
    RETURN 0;
  END IF;

  PERFORM set_config('app.financial_controls_bypass', 'on', true);

  FOR v_schedule IN
    SELECT schedule.id, schedule.amount, schedule.due_date, schedule.status,
           schedule.paid_amount, schedule.paid_date, schedule.invoice_id
    FROM public.contract_payment_schedules schedule
    WHERE schedule.contract_id = p_contract_id
      AND schedule.invoice_id IS NOT NULL
      AND lower(COALESCE(schedule.status, '')) NOT IN ('cancelled', 'canceled')
  LOOP
    v_paid := round(public.canonical_invoice_paid_amount(v_schedule.invoice_id)::numeric, 2);

    v_status := CASE
      WHEN v_paid >= COALESCE(v_schedule.amount, 0) - 0.01 THEN 'paid'
      WHEN v_paid > 0.01 THEN 'partially_paid'
      WHEN v_schedule.due_date IS NOT NULL AND v_schedule.due_date < v_today THEN 'overdue'
      ELSE 'pending'
    END;

    v_paid_date := NULL;
    IF v_status = 'paid' THEN
      SELECT MAX(source.payment_date)
      INTO v_paid_date
      FROM (
        SELECT payment.payment_date
        FROM public.payments payment
        WHERE payment.invoice_id = v_schedule.invoice_id
          AND lower(COALESCE(payment.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded')
          AND lower(COALESCE(payment.transaction_type::text, 'receipt')) = 'receipt'
          AND NOT EXISTS (
            SELECT 1 FROM public.payment_allocations allocation
            WHERE allocation.payment_id = payment.id AND allocation.is_active = true
          )
        UNION ALL
        SELECT payment.payment_date
        FROM public.payment_allocations allocation
        JOIN public.payments payment ON payment.id = allocation.payment_id
        WHERE allocation.allocation_type = 'invoice'
          AND allocation.target_id = v_schedule.invoice_id
          AND allocation.is_active = true
          AND lower(COALESCE(payment.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded')
          AND lower(COALESCE(payment.transaction_type::text, 'receipt')) = 'receipt'
      ) source;
    END IF;

    IF COALESCE(v_schedule.status, '') IS DISTINCT FROM v_status
       OR round(COALESCE(v_schedule.paid_amount, 0)::numeric, 2) IS DISTINCT FROM least(v_paid, COALESCE(v_schedule.amount, v_paid))
       OR v_schedule.paid_date IS DISTINCT FROM v_paid_date
    THEN
      IF NOT p_dry_run THEN
        UPDATE public.contract_payment_schedules schedule
        SET
          status = v_status,
          paid_amount = least(v_paid, COALESCE(v_schedule.amount, v_paid)),
          paid_date = v_paid_date,
          updated_at = now()
        WHERE schedule.id = v_schedule.id;
      END IF;
      v_changed := v_changed + 1;
    END IF;
  END LOOP;

  PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
  RETURN v_changed;
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
    RAISE;
END;
$function$;

REVOKE ALL ON FUNCTION public.sync_contract_schedule_payment_state(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_contract_schedule_payment_state(uuid, boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.invoice_balance_drift_report(
  p_company_id uuid,
  p_contract_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
  invoice_id uuid,
  canonical_paid numeric,
  expected_balance numeric,
  expected_payment_status text,
  expected_status text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    invoice.id,
    round(public.canonical_invoice_paid_amount(invoice.id)::numeric, 2) AS canonical_paid,
    round(GREATEST(COALESCE(invoice.total_amount, 0) - public.canonical_invoice_paid_amount(invoice.id), 0)::numeric, 2) AS expected_balance,
    CASE
      WHEN round(GREATEST(COALESCE(invoice.total_amount, 0) - public.canonical_invoice_paid_amount(invoice.id), 0)::numeric, 2) <= 1 THEN 'paid'
      WHEN public.canonical_invoice_paid_amount(invoice.id) > 0 THEN 'partial'
      ELSE 'unpaid'
    END AS expected_payment_status,
    CASE
      WHEN round(GREATEST(COALESCE(invoice.total_amount, 0) - public.canonical_invoice_paid_amount(invoice.id), 0)::numeric, 2) <= 1 THEN 'paid'
      WHEN lower(COALESCE(invoice.status, '')) = 'draft' THEN 'draft'
      WHEN invoice.due_date IS NOT NULL AND invoice.due_date < CURRENT_DATE THEN 'overdue'
      ELSE 'sent'
    END AS expected_status
  FROM public.invoices invoice
  WHERE invoice.company_id = p_company_id
    AND lower(COALESCE(invoice.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
    AND (p_contract_ids IS NULL OR invoice.contract_id = ANY(p_contract_ids))
    AND (
      abs(COALESCE(invoice.paid_amount, 0) - round(public.canonical_invoice_paid_amount(invoice.id)::numeric, 2)) > 0.01
      OR abs(COALESCE(invoice.balance_due, 0) - round(GREATEST(COALESCE(invoice.total_amount, 0) - public.canonical_invoice_paid_amount(invoice.id), 0)::numeric, 2)) > 0.01
      OR lower(COALESCE(invoice.payment_status, '')) IS DISTINCT FROM (
        CASE
          WHEN round(GREATEST(COALESCE(invoice.total_amount, 0) - public.canonical_invoice_paid_amount(invoice.id), 0)::numeric, 2) <= 1 THEN 'paid'
          WHEN public.canonical_invoice_paid_amount(invoice.id) > 0 THEN 'partial'
          ELSE 'unpaid'
        END
      )
      OR lower(COALESCE(invoice.status, '')) IS DISTINCT FROM (
        CASE
          WHEN round(GREATEST(COALESCE(invoice.total_amount, 0) - public.canonical_invoice_paid_amount(invoice.id), 0)::numeric, 2) <= 1 THEN 'paid'
          WHEN lower(COALESCE(invoice.status, '')) = 'draft' THEN 'draft'
          WHEN invoice.due_date IS NOT NULL AND invoice.due_date < CURRENT_DATE THEN 'overdue'
          ELSE 'sent'
        END
      )
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.invoice_balance_drift_report(uuid, uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.invoice_balance_drift_report(uuid, uuid[]) TO service_role;

CREATE OR REPLACE FUNCTION public.merge_duplicate_invoice_into_survivor(
  p_duplicate_id uuid,
  p_survivor_id uuid,
  p_reason text,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_duplicate public.invoices%ROWTYPE;
  v_survivor public.invoices%ROWTYPE;
  v_duplicate_paid numeric;
  v_survivor_paid numeric;
  v_moved_allocations integer := 0;
  v_repointed_payments integer := 0;
  v_cancel_result jsonb;
  v_previous_batch text := COALESCE(current_setting('app.payment_allocation_batch_mode', true), '');
  v_previous_bypass text := COALESCE(current_setting('app.financial_controls_bypass', true), '');
BEGIN
  IF p_duplicate_id IS NULL OR p_survivor_id IS NULL OR p_duplicate_id = p_survivor_id
     OR NULLIF(BTRIM(COALESCE(p_reason, '')), '') IS NULL
  THEN
    RAISE EXCEPTION 'Duplicate, survivor, and merge reason are required' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_duplicate FROM public.invoices invoice WHERE invoice.id = p_duplicate_id FOR UPDATE;
  SELECT * INTO v_survivor FROM public.invoices invoice WHERE invoice.id = p_survivor_id FOR UPDATE;

  IF NOT FOUND OR v_duplicate.id IS NULL OR v_survivor.id IS NULL THEN
    RAISE EXCEPTION 'Both invoices must exist' USING ERRCODE = 'P0001';
  END IF;
  IF v_duplicate.company_id IS DISTINCT FROM v_survivor.company_id
     OR v_duplicate.contract_id IS DISTINCT FROM v_survivor.contract_id
     OR (v_duplicate.customer_id IS NOT NULL AND v_survivor.customer_id IS NOT NULL
         AND v_duplicate.customer_id IS DISTINCT FROM v_survivor.customer_id)
  THEN
    RAISE EXCEPTION 'Duplicate and survivor must belong to the same company, contract, and customer' USING ERRCODE = 'P0001';
  END IF;
  IF lower(COALESCE(v_duplicate.status, '')) IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
     OR lower(COALESCE(v_survivor.status, '')) IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
  THEN
    RAISE EXCEPTION 'Both invoices must be active' USING ERRCODE = 'P0001';
  END IF;

  v_duplicate_paid := round(public.canonical_invoice_paid_amount(p_duplicate_id)::numeric, 2);
  v_survivor_paid := round(public.canonical_invoice_paid_amount(p_survivor_id)::numeric, 2);

  IF v_survivor_paid + v_duplicate_paid > COALESCE(v_survivor.total_amount, 0) + 0.01 THEN
    RAISE EXCEPTION 'Merge would overpay survivor invoice % by QAR %; refund/credit decision required',
      COALESCE(v_survivor.invoice_number, p_survivor_id::text),
      round((v_survivor_paid + v_duplicate_paid - COALESCE(v_survivor.total_amount, 0))::numeric, 2)
      USING ERRCODE = 'P0001';
  END IF;

  PERFORM set_config('app.payment_allocation_batch_mode', 'on', true);
  PERFORM set_config('app.financial_controls_bypass', 'on', true);

  INSERT INTO public.payment_allocations (
    company_id, payment_id, allocation_type, target_id, amount,
    allocated_date, allocation_method, allocation_order, notes
  )
  SELECT
    allocation.company_id,
    allocation.payment_id,
    allocation.allocation_type,
    p_survivor_id,
    allocation.amount,
    now(),
    'merge_reallocation',
    allocation.allocation_order,
    format('Merged from duplicate invoice %s: %s', COALESCE(v_duplicate.invoice_number, p_duplicate_id::text), BTRIM(p_reason))
  FROM public.payment_allocations allocation
  WHERE allocation.target_id = p_duplicate_id
    AND allocation.allocation_type = 'invoice'
    AND allocation.is_active = true;
  GET DIAGNOSTICS v_moved_allocations = ROW_COUNT;

  UPDATE public.payment_allocations allocation
  SET
    is_active = false,
    voided_at = now(),
    voided_by = p_actor_id,
    void_reason = format('Merged into survivor invoice %s: %s', COALESCE(v_survivor.invoice_number, p_survivor_id::text), BTRIM(p_reason)),
    updated_at = now()
  WHERE allocation.target_id = p_duplicate_id
    AND allocation.allocation_type = 'invoice'
    AND allocation.is_active = true;

  UPDATE public.payments payment
  SET invoice_id = p_survivor_id, updated_at = now()
  WHERE payment.invoice_id = p_duplicate_id
    AND NOT EXISTS (
      SELECT 1 FROM public.payment_allocations allocation
      WHERE allocation.payment_id = payment.id AND allocation.is_active = true
    );
  GET DIAGNOSTICS v_repointed_payments = ROW_COUNT;

  UPDATE public.contract_payment_schedules schedule
  SET invoice_id = p_survivor_id, updated_at = now()
  WHERE schedule.invoice_id = p_duplicate_id;

  PERFORM set_config('app.payment_allocation_batch_mode', v_previous_batch, true);
  PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);

  v_cancel_result := public.cancel_invoice_with_reversal(
    p_duplicate_id,
    v_duplicate.company_id,
    format('Merged into survivor invoice %s: %s', COALESCE(v_survivor.invoice_number, p_survivor_id::text), BTRIM(p_reason))
  );

  PERFORM public.recalculate_invoice_financial_state(p_survivor_id);
  IF v_survivor.contract_id IS NOT NULL THEN
    PERFORM public.recalculate_contract_financial_state(v_survivor.contract_id);
  END IF;

  RETURN jsonb_build_object(
    'duplicate_id', p_duplicate_id,
    'survivor_id', p_survivor_id,
    'moved_allocations', v_moved_allocations,
    'repointed_payments', v_repointed_payments,
    'duplicate_paid_moved', v_duplicate_paid,
    'cancellation', v_cancel_result
  );
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('app.payment_allocation_batch_mode', v_previous_batch, true);
    PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
    RAISE;
END;
$function$;

REVOKE ALL ON FUNCTION public.merge_duplicate_invoice_into_survivor(uuid, uuid, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.merge_duplicate_invoice_into_survivor(uuid, uuid, text, uuid) TO service_role;;
