BEGIN;

-- Payment cancellation is a reversal of a receipt, not the creation of a new
-- obligation. Keep the proven accounting reversal implementation intact and
-- wrap it with an invoice/schedule reconciliation step.
DO $preflight$
BEGIN
  IF to_regprocedure(
    'public.cancel_payment_with_reversal(uuid,uuid,text,uuid)'
  ) IS NULL THEN
    RAISE EXCEPTION 'cancel_payment_with_reversal(uuid,uuid,text,uuid) is required';
  END IF;

  IF to_regprocedure(
    'public.cancel_payment_with_reversal_before_invoice_restore(uuid,uuid,text,uuid)'
  ) IS NOT NULL THEN
    RAISE EXCEPTION 'payment cancellation invoice-restore wrapper is already installed';
  END IF;
END;
$preflight$;

ALTER FUNCTION public.cancel_payment_with_reversal(uuid, uuid, text, uuid)
  RENAME TO cancel_payment_with_reversal_before_invoice_restore;

REVOKE ALL ON FUNCTION
  public.cancel_payment_with_reversal_before_invoice_restore(uuid, uuid, text, uuid)
FROM PUBLIC, anon, authenticated;

-- Reconcile only the contract months touched by the cancelled payment. The
-- monthly rental invoice is authoritative for the obligation amount. A
-- traffic-violation invoice is explicitly excluded even when it shares the
-- same contract and month.
CREATE FUNCTION public.reconcile_contract_rental_schedule_invoice_state(
  p_company_id uuid,
  p_contract_id uuid,
  p_affected_invoice_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;

REVOKE ALL ON FUNCTION
  public.reconcile_contract_rental_schedule_invoice_state(uuid, uuid, uuid[])
FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION
  public.reconcile_contract_rental_schedule_invoice_state(uuid, uuid, uuid[])
IS
  'Owner-only reconciliation: a schedule follows the one active non-penalty invoice in its month; receipt amounts never become new obligations.';

CREATE FUNCTION public.cancel_payment_with_reversal(
  p_payment_id uuid,
  p_company_id uuid,
  p_reason text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_result jsonb;
  v_schedule_result jsonb;
  v_invoice_id uuid;
  v_contract_id uuid;
  v_invoice_ids uuid[] := ARRAY[]::uuid[];
  v_contract_ids uuid[] := ARRAY[]::uuid[];
  v_schedule_results jsonb := '[]'::jsonb;
BEGIN
  -- Read the identity graph before the accounting implementation voids active
  -- allocations. The delegated function performs the authorization checks,
  -- journal reversal, bank reversal, audit write, and payment cancellation.
  SELECT payment.*
  INTO v_payment
  FROM public.payments payment
  WHERE payment.id = p_payment_id
    AND payment.company_id = p_company_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_payment.invoice_id IS NOT NULL THEN
      v_invoice_ids := array_append(v_invoice_ids, v_payment.invoice_id);
    END IF;
    IF v_payment.contract_id IS NOT NULL THEN
      v_contract_ids := array_append(v_contract_ids, v_payment.contract_id);
    END IF;

    SELECT v_invoice_ids || COALESCE(
      array_agg(DISTINCT allocation.target_id),
      ARRAY[]::uuid[]
    )
    INTO v_invoice_ids
    FROM public.payment_allocations allocation
    WHERE allocation.company_id = p_company_id
      AND allocation.payment_id = p_payment_id
      AND allocation.allocation_type = 'invoice';
  END IF;

  v_result := public.cancel_payment_with_reversal_before_invoice_restore(
    p_payment_id,
    p_company_id,
    p_reason,
    p_actor_id
  );

  FOR v_invoice_id IN
    SELECT DISTINCT candidate.id
    FROM unnest(COALESCE(v_invoice_ids, ARRAY[]::uuid[])) candidate(id)
    JOIN public.invoices invoice
      ON invoice.id = candidate.id
     AND invoice.company_id = p_company_id
    WHERE candidate.id IS NOT NULL
  LOOP
    PERFORM public.recalculate_invoice_financial_state(v_invoice_id);

    SELECT invoice.contract_id
    INTO v_contract_id
    FROM public.invoices invoice
    WHERE invoice.id = v_invoice_id
      AND invoice.company_id = p_company_id;

    IF v_contract_id IS NOT NULL
       AND NOT (v_contract_id = ANY(COALESCE(v_contract_ids, ARRAY[]::uuid[])))
    THEN
      v_contract_ids := array_append(v_contract_ids, v_contract_id);
    END IF;
  END LOOP;

  FOR v_contract_id IN
    SELECT DISTINCT candidate.id
    FROM unnest(COALESCE(v_contract_ids, ARRAY[]::uuid[])) candidate(id)
    JOIN public.contracts contract
      ON contract.id = candidate.id
     AND contract.company_id = p_company_id
    WHERE candidate.id IS NOT NULL
  LOOP
    v_schedule_result := public.reconcile_contract_rental_schedule_invoice_state(
      p_company_id,
      v_contract_id,
      v_invoice_ids
    );
    v_schedule_results := v_schedule_results || jsonb_build_array(
      jsonb_build_object(
        'contract_id', v_contract_id,
        'result', v_schedule_result
      )
    );
    PERFORM public.recalculate_contract_financial_state(v_contract_id);
  END LOOP;

  RETURN COALESCE(v_result, '{}'::jsonb) || jsonb_build_object(
    'restored_original_invoice_ids', to_jsonb(COALESCE(v_invoice_ids, ARRAY[]::uuid[])),
    'schedule_reconciliation', v_schedule_results,
    'created_invoice_count', 0
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_payment_with_reversal(uuid, uuid, text, uuid)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_payment_with_reversal(uuid, uuid, text, uuid)
TO authenticated, service_role;

COMMENT ON FUNCTION public.cancel_payment_with_reversal(uuid, uuid, text, uuid) IS
  'Cancels a receipt through the canonical accounting reversal, restores balances only on the original allocated invoices, and reconciles rental schedules without inserting invoices.';

-- Repair the four known LTO202437 schedule/invoice identity mismatches. The
-- function is deliberately passed the canonical rental invoice IDs, so no
-- unrelated contract month is changed.
DO $repair_lto202437$
DECLARE
  v_company_id constant uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_contract_id constant uuid := '662e4640-2b0a-4a21-a05a-b44681f8c1eb';
  v_invoice_ids constant uuid[] := ARRAY[
    '4fd6c2eb-3f33-49a4-bf53-e894c6ff91d3',
    '9cf06121-686a-4ed0-9e5f-4fc94e6c75aa',
    'f1fff785-978d-4ab4-b3bd-aead25774414',
    '34077b49-a76d-4a1c-846c-d082cd8070f9'
  ]::uuid[];
  v_result jsonb;
BEGIN
  IF (
    SELECT count(*)
    FROM public.contract_payment_schedules schedule
    WHERE schedule.company_id = v_company_id
      AND schedule.contract_id = v_contract_id
      AND schedule.id = ANY(ARRAY[
        '52810fa1-dcd0-4246-aa04-ba6867d5e62d',
        'cce220e0-ce22-48d8-87e6-464093364e15',
        'ef5acba7-5817-4fbe-9fb8-95079a991c01',
        'f596cdbb-3df9-4281-9347-24d9400ada79'
      ]::uuid[])
  ) <> 4 THEN
    RAISE EXCEPTION 'LTO202437 schedule repair precondition failed: target rows drifted';
  END IF;

  v_result := public.reconcile_contract_rental_schedule_invoice_state(
    v_company_id,
    v_contract_id,
    v_invoice_ids
  );

  IF EXISTS (
    SELECT 1
    FROM (
      VALUES
        ('52810fa1-dcd0-4246-aa04-ba6867d5e62d'::uuid, '4fd6c2eb-3f33-49a4-bf53-e894c6ff91d3'::uuid, 1060::numeric, 0::numeric, 'overdue'::text),
        ('cce220e0-ce22-48d8-87e6-464093364e15'::uuid, '9cf06121-686a-4ed0-9e5f-4fc94e6c75aa'::uuid, 1050::numeric, 1050::numeric, 'paid'::text),
        ('ef5acba7-5817-4fbe-9fb8-95079a991c01'::uuid, 'f1fff785-978d-4ab4-b3bd-aead25774414'::uuid, 1050::numeric, 1050::numeric, 'paid'::text),
        ('f596cdbb-3df9-4281-9347-24d9400ada79'::uuid, '34077b49-a76d-4a1c-846c-d082cd8070f9'::uuid, 1060::numeric, 0::numeric, 'overdue'::text)
    ) expected(schedule_id, invoice_id, amount, paid_amount, status)
    LEFT JOIN public.contract_payment_schedules schedule
      ON schedule.id = expected.schedule_id
     AND schedule.company_id = v_company_id
     AND schedule.contract_id = v_contract_id
    WHERE schedule.id IS NULL
       OR schedule.invoice_id IS DISTINCT FROM expected.invoice_id
       OR round(COALESCE(schedule.amount, 0)::numeric, 2)
          IS DISTINCT FROM expected.amount
       OR round(COALESCE(schedule.paid_amount, 0)::numeric, 2)
          IS DISTINCT FROM expected.paid_amount
       OR schedule.status IS DISTINCT FROM expected.status
  ) THEN
    RAISE EXCEPTION 'LTO202437 schedule repair postcondition failed';
  END IF;

  INSERT INTO public.audit_logs (
    company_id,
    action,
    resource_type,
    resource_id,
    entity_name,
    changes_summary,
    new_values,
    metadata,
    status,
    severity,
    user_name,
    notes
  ) VALUES (
    v_company_id,
    'payment_cancellation_original_invoice_invariant_repaired',
    'contract',
    v_contract_id,
    'LTO202437',
    'فصل مبالغ الدفعات والمخالفات عن أقساط الإيجار وإعادة الأقساط الأربعة إلى فواتير الإيجار الأصلية',
    v_result,
    jsonb_build_object(
      'migration_key', '20260902035618_payment_cancellation_restores_original_invoice',
      'canonical_invoice_ids', to_jsonb(v_invoice_ids)
    ),
    'completed',
    'high',
    'Codex financial integrity repair',
    'إلغاء الدفعة يعيد رصيد الفاتورة الأصلية ولا ينشئ فاتورة جديدة بقيمة الدفعة.'
  );
END;
$repair_lto202437$;

COMMIT;
