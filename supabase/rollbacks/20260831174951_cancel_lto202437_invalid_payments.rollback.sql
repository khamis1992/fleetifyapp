-- Guarded compensating rollback for the LTO202437 payment cancellation.
-- It restores only the payment/allocation snapshot captured by the migration
-- and refuses to run if the cancellation graph has changed afterwards.

BEGIN;

DO $rollback$
DECLARE
  v_company_id constant uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_contract_id constant uuid := '662e4640-2b0a-4a21-a05a-b44681f8c1eb';
  v_actor_id constant uuid := '2a2b3a8a-35dd-4251-a8ba-09f70538c920';
  v_key constant text := '20260831174951_cancel_lto202437_invalid_payments';
  v_audit public.audit_logs%rowtype;
  v_payment jsonb;
  v_allocation jsonb;
  v_cancellation public.payment_cancellation_audit%rowtype;
  v_reversal_id uuid;
  v_invoice_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(v_company_id::text || ':payment-repair:LTO202437', 0));

  SELECT audit.* INTO v_audit
  FROM public.audit_logs audit
  WHERE audit.company_id = v_company_id
    AND audit.resource_id = v_contract_id
    AND audit.action = 'cancel_lto202437_invalid_payments_started'
    AND audit.metadata ->> 'migration_key' = v_key
    AND audit.status = 'completed'
  ORDER BY audit.created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_audit.id IS NULL THEN
    RAISE NOTICE 'LTO202437 invalid-payment cancellation audit is absent; nothing to roll back';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_audit.old_values -> 'payments') snapshot(payment)
    JOIN public.payments current_payment ON current_payment.id = (snapshot.payment ->> 'id')::uuid
    WHERE current_payment.company_id <> v_company_id
       OR current_payment.contract_id <> v_contract_id
       OR current_payment.payment_status <> 'cancelled'
       OR current_payment.allocation_status <> 'cancelled'
  ) THEN
    RAISE EXCEPTION 'Rollback refused: one or more cancelled payments changed after correction';
  END IF;

  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  PERFORM set_config('app.financial_controls_bypass', 'on', true);
  PERFORM set_config('app.payment_allocation_batch_mode', 'on', true);

  FOR v_payment IN
    SELECT snapshot.payment
    FROM jsonb_array_elements(v_audit.old_values -> 'payments') snapshot(payment)
  LOOP
    SELECT cancellation.* INTO v_cancellation
    FROM public.payment_cancellation_audit cancellation
    WHERE cancellation.company_id = v_company_id
      AND cancellation.payment_id = (v_payment ->> 'id')::uuid
      AND cancellation.reason = v_audit.metadata ->> 'reason'
    ORDER BY cancellation.created_at DESC
    LIMIT 1;

    IF v_cancellation.id IS NULL OR v_cancellation.bank_reversal_transaction_id IS NOT NULL THEN
      RAISE EXCEPTION 'Rollback refused: cancellation audit missing or contains a bank reversal for payment %',
        v_payment ->> 'payment_number';
    END IF;

    FOREACH v_reversal_id IN ARRAY coalesce(v_cancellation.reversal_entry_ids, ARRAY[]::uuid[])
    LOOP
      PERFORM public.reverse_journal_entry(
        v_reversal_id,
        'Rollback of LTO202437 invalid-payment correction',
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
    SELECT snapshot.allocation
    FROM jsonb_array_elements(v_audit.old_values -> 'active_allocations') snapshot(allocation)
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

  FOR v_invoice_id IN
    SELECT DISTINCT (snapshot.allocation ->> 'target_id')::uuid
    FROM jsonb_array_elements(v_audit.old_values -> 'active_allocations') snapshot(allocation)
    WHERE snapshot.allocation ->> 'allocation_type' = 'invoice'
  LOOP
    PERFORM public.recalculate_invoice_financial_state(v_invoice_id);
  END LOOP;

  PERFORM public.recalculate_contract_financial_state(v_contract_id);

  UPDATE public.audit_logs
  SET status = 'rolled_back',
      notes = concat_ws(E'\n', notes, 'تم تنفيذ rollback تعويضي وإعادة الدفعات والتخصيصات والقيود بتاريخ ' || now()::text)
  WHERE id = v_audit.id;
END;
$rollback$;

COMMIT;
