-- Read-only capture from production on 2026-09-06. No customer records.
-- after_payment_allocation_change; prosrc MD5 46a6743ce3269aad6491918cbe7f44f6
CREATE OR REPLACE FUNCTION public.after_payment_allocation_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_contract_id uuid;
BEGIN
  IF COALESCE(current_setting('app.payment_allocation_batch_mode', true), '') = 'on' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM public.sync_payment_allocation_state(OLD.payment_id);
    IF OLD.allocation_type = 'invoice' THEN
      PERFORM public.recalculate_invoice_financial_state(OLD.target_id);
      SELECT invoice.contract_id
      INTO v_contract_id
      FROM public.invoices invoice
      WHERE invoice.id = OLD.target_id;
      PERFORM public.recalculate_contract_financial_state(v_contract_id);
    END IF;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.sync_payment_allocation_state(NEW.payment_id);
    IF NEW.allocation_type = 'invoice' THEN
      PERFORM public.recalculate_invoice_financial_state(NEW.target_id);
      SELECT invoice.contract_id
      INTO v_contract_id
      FROM public.invoices invoice
      WHERE invoice.id = NEW.target_id;
      PERFORM public.recalculate_contract_financial_state(v_contract_id);
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$
;

-- canonical_contract_paid_amount; prosrc MD5 3c1d786f1ca26c117a7c0ff20f1ccba9
CREATE OR REPLACE FUNCTION public.canonical_contract_paid_amount(p_contract_id uuid)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(SUM(source.amount), 0)::numeric
  FROM (
    SELECT allocation.amount
    FROM public.payment_allocations allocation
    JOIN public.payments payment ON payment.id = allocation.payment_id
    JOIN public.invoices invoice
      ON allocation.allocation_type = 'invoice'
     AND invoice.id = allocation.target_id
    WHERE invoice.contract_id = p_contract_id
      AND allocation.is_active = true
      AND lower(COALESCE(payment.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded')
      AND lower(COALESCE(payment.transaction_type::text, 'receipt')) = 'receipt'
      AND lower(COALESCE(invoice.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')

    UNION ALL

    SELECT allocation.amount
    FROM public.payment_allocations allocation
    JOIN public.payments payment ON payment.id = allocation.payment_id
    WHERE allocation.allocation_type = 'contract'
      AND allocation.target_id = p_contract_id
      AND allocation.is_active = true
      AND lower(COALESCE(payment.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded')
      AND lower(COALESCE(payment.transaction_type::text, 'receipt')) = 'receipt'

    UNION ALL

    SELECT payment.amount
    FROM public.payments payment
    JOIN public.invoices invoice ON invoice.id = payment.invoice_id
    WHERE invoice.contract_id = p_contract_id
      AND lower(COALESCE(payment.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded')
      AND lower(COALESCE(payment.transaction_type::text, 'receipt')) = 'receipt'
      AND lower(COALESCE(invoice.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
      AND NOT EXISTS (
        SELECT 1
        FROM public.payment_allocations allocation
        WHERE allocation.payment_id = payment.id
          AND allocation.is_active = true
      )

    UNION ALL

    SELECT payment.amount
    FROM public.payments payment
    WHERE payment.contract_id = p_contract_id
      AND payment.invoice_id IS NULL
      AND lower(COALESCE(payment.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded')
      AND lower(COALESCE(payment.transaction_type::text, 'receipt')) = 'receipt'
      AND NOT EXISTS (
        SELECT 1
        FROM public.payment_allocations allocation
        WHERE allocation.payment_id = payment.id
          AND allocation.is_active = true
      )
  ) source;
$function$
;

-- recalculate_contract_financial_state; prosrc MD5 26e1d042941b2d30e09d68f1abd987e9
CREATE OR REPLACE FUNCTION public.recalculate_contract_financial_state(p_contract_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_contract public.contracts%ROWTYPE;
  v_canonical_paid numeric := 0;
  v_paid numeric := 0;
  v_previous_bypass text := COALESCE(current_setting('app.financial_controls_bypass', true), '');
BEGIN
  IF p_contract_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT *
  INTO v_contract
  FROM public.contracts contract
  WHERE contract.id = p_contract_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  v_canonical_paid := public.canonical_contract_paid_amount(p_contract_id);
  v_paid := CASE
    WHEN COALESCE(v_contract.contract_amount, 0) > 0
      THEN LEAST(v_canonical_paid, v_contract.contract_amount)
    ELSE v_canonical_paid
  END;

  PERFORM set_config('app.financial_controls_bypass', 'on', true);

  UPDATE public.contracts contract
  SET
    total_paid = v_paid,
    balance_due = GREATEST(COALESCE(v_contract.contract_amount, 0) - v_paid, 0),
    payment_status = CASE
      WHEN v_paid <= 0.01 THEN 'unpaid'
      WHEN v_paid >= COALESCE(v_contract.contract_amount, 0) - 0.01 THEN 'paid'
      ELSE 'partial'
    END,
    updated_at = now()
  WHERE contract.id = p_contract_id;

  PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
  RETURN v_paid;
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
    RAISE;
END;
$function$
;

-- reconcile_contract_rental_schedule_invoice_state; prosrc MD5 4bae220787e76ff2e7779c9da79782d4
CREATE OR REPLACE FUNCTION public.reconcile_contract_rental_schedule_invoice_state(p_company_id uuid, p_contract_id uuid, p_affected_invoice_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_schedule public.contract_payment_schedules%ROWTYPE;
  v_invoice public.invoices%ROWTYPE;
  v_candidate_ids uuid[];
  v_paid numeric;
  v_status text;
  v_paid_date date;
  v_updated integer := 0;
  v_relinked integer := 0;
  v_amount_normalized integer := 0;
  v_ambiguous_months date[] := ARRAY[]::date[];
BEGIN
  IF p_company_id IS NULL OR p_contract_id IS NULL THEN
    RETURN jsonb_build_object(
      'updated', 0,
      'relinked', 0,
      'amounts_normalized', 0,
      'ambiguous_months', '[]'::jsonb
    );
  END IF;

  FOR v_schedule IN
    SELECT schedule.*
    FROM public.contract_payment_schedules schedule
    WHERE schedule.company_id = p_company_id
      AND schedule.contract_id = p_contract_id
      AND lower(COALESCE(schedule.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
      AND (
        p_affected_invoice_ids IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.invoices affected
          WHERE affected.id = ANY(COALESCE(p_affected_invoice_ids, ARRAY[]::uuid[]))
            AND affected.company_id = p_company_id
            AND affected.contract_id = p_contract_id
            AND date_trunc(
              'month',
              COALESCE(affected.invoice_month, affected.due_date, affected.invoice_date)::timestamp without time zone
            )::date = date_trunc(
              'month',
              schedule.due_date::timestamp without time zone
            )::date
        )
      )
    ORDER BY schedule.due_date, schedule.installment_number, schedule.id
    FOR UPDATE OF schedule
  LOOP
    SELECT array_agg(invoice.id ORDER BY invoice.created_at, invoice.id)
    INTO v_candidate_ids
    FROM public.invoices invoice
    WHERE invoice.company_id = p_company_id
      AND invoice.contract_id = p_contract_id
      AND invoice.penalty_id IS NULL
      AND COALESCE(invoice.total_amount, 0) > 0.01
      AND date_trunc(
        'month',
        COALESCE(invoice.invoice_month, invoice.due_date, invoice.invoice_date)::timestamp without time zone
      )::date = date_trunc(
        'month',
        v_schedule.due_date::timestamp without time zone
      )::date
      AND lower(COALESCE(invoice.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
      AND lower(COALESCE(invoice.payment_status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      );

    IF COALESCE(cardinality(v_candidate_ids), 0) = 0 THEN
      CONTINUE;
    END IF;

    IF cardinality(v_candidate_ids) > 1 THEN
      v_ambiguous_months := array_append(
        v_ambiguous_months,
        date_trunc('month', v_schedule.due_date::timestamp without time zone)::date
      );
      CONTINUE;
    END IF;

    SELECT invoice.*
    INTO STRICT v_invoice
    FROM public.invoices invoice
    WHERE invoice.id = v_candidate_ids[1]
      AND invoice.company_id = p_company_id
      AND invoice.contract_id = p_contract_id
    FOR UPDATE;

    v_paid := round(
      GREATEST(public.canonical_invoice_paid_amount(v_invoice.id, NULL), 0)::numeric,
      2
    );

    v_status := CASE
      WHEN v_paid >= COALESCE(v_invoice.total_amount, 0) - 0.01 THEN 'paid'
      WHEN v_paid > 0.01 THEN 'partially_paid'
      WHEN v_schedule.due_date < CURRENT_DATE THEN 'overdue'
      ELSE 'pending'
    END;

    v_paid_date := NULL;
    IF v_status = 'paid' THEN
      SELECT max(source.payment_date)
      INTO v_paid_date
      FROM (
        SELECT payment.payment_date
        FROM public.payments payment
        WHERE payment.company_id = p_company_id
          AND payment.invoice_id = v_invoice.id
          AND lower(COALESCE(payment.payment_status, '')) IN (
            'completed', 'paid', 'success', 'succeeded', 'cleared'
          )
          AND lower(COALESCE(payment.transaction_type::text, 'receipt')) = 'receipt'
          AND NOT EXISTS (
            SELECT 1
            FROM public.payment_allocations allocation
            WHERE allocation.company_id = p_company_id
              AND allocation.payment_id = payment.id
              AND allocation.is_active = true
          )

        UNION ALL

        SELECT payment.payment_date
        FROM public.payment_allocations allocation
        JOIN public.payments payment
          ON payment.id = allocation.payment_id
         AND payment.company_id = p_company_id
        WHERE allocation.company_id = p_company_id
          AND allocation.allocation_type = 'invoice'
          AND allocation.target_id = v_invoice.id
          AND allocation.is_active = true
          AND lower(COALESCE(payment.payment_status, '')) IN (
            'completed', 'paid', 'success', 'succeeded', 'cleared'
          )
          AND lower(COALESCE(payment.transaction_type::text, 'receipt')) = 'receipt'
      ) source;
    END IF;

    IF v_schedule.invoice_id IS DISTINCT FROM v_invoice.id THEN
      v_relinked := v_relinked + 1;
    END IF;
    IF round(COALESCE(v_schedule.amount, 0)::numeric, 2)
       IS DISTINCT FROM round(COALESCE(v_invoice.total_amount, 0)::numeric, 2)
    THEN
      v_amount_normalized := v_amount_normalized + 1;
    END IF;

    IF v_schedule.invoice_id IS DISTINCT FROM v_invoice.id
       OR round(COALESCE(v_schedule.amount, 0)::numeric, 2)
          IS DISTINCT FROM round(COALESCE(v_invoice.total_amount, 0)::numeric, 2)
       OR round(COALESCE(v_schedule.paid_amount, 0)::numeric, 2)
          IS DISTINCT FROM LEAST(v_paid, COALESCE(v_invoice.total_amount, v_paid))
       OR COALESCE(v_schedule.status, '') IS DISTINCT FROM v_status
       OR v_schedule.paid_date IS DISTINCT FROM v_paid_date
    THEN
      UPDATE public.contract_payment_schedules schedule
      SET invoice_id = v_invoice.id,
          amount = round(v_invoice.total_amount::numeric, 2),
          paid_amount = LEAST(v_paid, COALESCE(v_invoice.total_amount, v_paid)),
          paid_date = v_paid_date,
          status = v_status,
          updated_at = now()
      WHERE schedule.id = v_schedule.id
        AND schedule.company_id = p_company_id
        AND schedule.contract_id = p_contract_id;

      v_updated := v_updated + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'updated', v_updated,
    'relinked', v_relinked,
    'amounts_normalized', v_amount_normalized,
    'ambiguous_months', to_jsonb(v_ambiguous_months)
  );
END;
$function$
;
