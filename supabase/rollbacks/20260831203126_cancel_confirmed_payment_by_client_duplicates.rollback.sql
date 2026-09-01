-- Guarded compensating rollback for the 105 confirmed PBC cancellations.
-- It restores only the exact payment/allocation snapshot captured by the
-- migration and reverses every cancellation reversal journal.

BEGIN;

DO $rollback$
DECLARE
  v_company_id constant uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_actor_id constant uuid := '2a2b3a8a-35dd-4251-a8ba-09f70538c920';
  v_key constant text := '20260831203126_cancel_confirmed_payment_by_client_duplicates';
  v_audit public.audit_logs%rowtype;
  v_payment_ids uuid[];
  v_contract_ids uuid[];
  v_invoice_ids uuid[];
  v_payment jsonb;
  v_allocation jsonb;
  v_cancellation public.payment_cancellation_audit%rowtype;
  v_reversal_id uuid;
  v_invoice_id uuid;
  v_contract_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_company_id::text || ':payment-by-client-confirmed-duplicates', 0)
  );

  SELECT audit.* INTO v_audit
  FROM public.audit_logs audit
  WHERE audit.company_id = v_company_id
    AND audit.action = 'cancel_confirmed_payment_by_client_duplicates_started'
    AND audit.metadata ->> 'migration_key' = v_key
    AND audit.status = 'completed'
  ORDER BY audit.created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_audit.id IS NULL THEN
    RAISE NOTICE 'Confirmed PBC cancellation audit is absent; nothing to roll back';
    RETURN;
  END IF;

  SELECT array_agg((item.value #>> '{}')::uuid ORDER BY item.ordinality)
  INTO v_payment_ids
  FROM jsonb_array_elements(v_audit.old_values -> 'payment_ids') WITH ORDINALITY item(value, ordinality);

  SELECT array_agg((item.value #>> '{}')::uuid ORDER BY item.ordinality)
  INTO v_contract_ids
  FROM jsonb_array_elements(v_audit.old_values -> 'contract_ids') WITH ORDINALITY item(value, ordinality);

  SELECT array_agg((item.value #>> '{}')::uuid ORDER BY item.ordinality)
  INTO v_invoice_ids
  FROM jsonb_array_elements(v_audit.old_values -> 'invoice_ids') WITH ORDINALITY item(value, ordinality);

  IF coalesce(array_length(v_payment_ids, 1), 0) <> 105
     OR EXISTS (
       SELECT 1
       FROM unnest(v_payment_ids) requested(payment_id)
       LEFT JOIN public.payments payment ON payment.id = requested.payment_id
       WHERE payment.id IS NULL
          OR payment.company_id <> v_company_id
          OR payment.payment_status <> 'cancelled'
          OR payment.allocation_status <> 'cancelled'
     )
  THEN
    RAISE EXCEPTION 'Rollback refused: payment snapshot is incomplete or changed after cancellation';
  END IF;

  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  PERFORM set_config('app.financial_controls_bypass', 'on', true);
  PERFORM set_config('app.payment_allocation_batch_mode', 'on', true);

  FOR v_payment IN
    SELECT item.value
    FROM jsonb_array_elements(v_audit.old_values -> 'payments') item(value)
  LOOP
    SELECT cancellation.* INTO v_cancellation
    FROM public.payment_cancellation_audit cancellation
    WHERE cancellation.company_id = v_company_id
      AND cancellation.payment_id = (v_payment ->> 'id')::uuid
      AND cancellation.reason = v_audit.metadata ->> 'reason'
    ORDER BY cancellation.created_at DESC
    LIMIT 1;

    IF v_cancellation.id IS NULL OR v_cancellation.bank_reversal_transaction_id IS NOT NULL THEN
      RAISE EXCEPTION 'Rollback refused: cancellation audit missing or has a bank reversal for %',
        v_payment ->> 'payment_number';
    END IF;

    FOREACH v_reversal_id IN ARRAY coalesce(v_cancellation.reversal_entry_ids, ARRAY[]::uuid[])
    LOOP
      PERFORM public.reverse_journal_entry(
        v_reversal_id,
        'Rollback of confirmed Payment By Client duplicate cancellation',
        v_actor_id
      );
    END LOOP;

    UPDATE public.payments payment
    SET payment_status = v_payment ->> 'payment_status',
        allocation_status = v_payment ->> 'allocation_status',
        processing_status = v_payment ->> 'processing_status',
        processing_notes = v_payment ->> 'processing_notes',
        updated_at = now()
    WHERE payment.id = (v_payment ->> 'id')::uuid
      AND payment.company_id = v_company_id;
  END LOOP;

  FOR v_allocation IN
    SELECT item.value
    FROM jsonb_array_elements(v_audit.old_values -> 'active_allocations') item(value)
  LOOP
    UPDATE public.payment_allocations allocation
    SET is_active = true,
        voided_at = null,
        voided_by = null,
        void_reason = null,
        updated_at = now()
    WHERE allocation.id = (v_allocation ->> 'id')::uuid
      AND allocation.company_id = v_company_id
      AND allocation.payment_id = (v_allocation ->> 'payment_id')::uuid;
  END LOOP;

  PERFORM set_config('app.payment_allocation_batch_mode', '', true);
  PERFORM set_config('app.financial_controls_bypass', '', true);

  FOREACH v_invoice_id IN ARRAY coalesce(v_invoice_ids, ARRAY[]::uuid[])
  LOOP
    PERFORM public.recalculate_invoice_financial_state(v_invoice_id);
  END LOOP;

  FOREACH v_contract_id IN ARRAY coalesce(v_contract_ids, ARRAY[]::uuid[])
  LOOP
    PERFORM public.recalculate_contract_financial_state(v_contract_id);
  END LOOP;

  UPDATE public.audit_logs
  SET status = 'rolled_back',
      notes = concat_ws(E'\n', notes,
        'تم تنفيذ rollback تعويضي وإعادة الدفعات والتخصيصات وعكس قيود الإلغاء بتاريخ ' || now()::text)
  WHERE id = v_audit.id;
END;
$rollback$;

COMMIT;
