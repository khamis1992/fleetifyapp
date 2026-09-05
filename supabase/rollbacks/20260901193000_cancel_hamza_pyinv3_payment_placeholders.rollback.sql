-- Guarded compensating rollback for Hamza's ten PYINV3 placeholder cancellations.

BEGIN;

DO $rollback$
DECLARE
  v_company_id constant uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_customer_id constant uuid := '14abf10e-299a-43f3-b4bd-28fafce3aea1';
  v_key constant text := '20260901193000_cancel_hamza_pyinv3_payment_placeholders';
  v_audit public.audit_logs%rowtype;
  v_invoice jsonb;
  v_journal jsonb;
  v_result jsonb;
  v_reversal_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_company_id::text || ':hamza-pyinv3-cleanup', 0)
  );

  SELECT audit.* INTO v_audit
  FROM public.audit_logs audit
  WHERE audit.company_id = v_company_id
    AND audit.action = 'hamza_pyinv3_payment_placeholders_cancelled'
    AND audit.metadata ->> 'migration_key' = v_key
    AND audit.status = 'completed'
  ORDER BY audit.created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_audit.id IS NULL THEN
    RAISE NOTICE 'Hamza PYINV3 cancellation audit is absent; nothing to roll back';
    RETURN;
  END IF;

  IF jsonb_array_length(v_audit.old_values -> 'invoices') <> 10 OR EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_audit.old_values -> 'invoices') item(value)
    LEFT JOIN public.invoices invoice ON invoice.id = (item.value ->> 'id')::uuid
    WHERE invoice.id IS NULL
       OR invoice.company_id <> v_company_id
       OR lower(invoice.status) NOT IN ('cancelled', 'canceled', 'void', 'voided')
  ) THEN
    RAISE EXCEPTION 'Rollback refused: Hamza invoice snapshot is incomplete or changed';
  END IF;

  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  PERFORM set_config('app.financial_controls_bypass', 'on', true);
  PERFORM set_config('app.approved_invoice_cancellation', 'on', true);

  FOR v_result IN
    SELECT item.value
    FROM jsonb_array_elements(v_audit.new_values -> 'cancellation_results') item(value)
  LOOP
    v_reversal_id := NULLIF(v_result ->> 'reversal_entry_id', '')::uuid;
    IF v_reversal_id IS NOT NULL THEN
      PERFORM public.reverse_journal_entry(
        v_reversal_id,
        'Rollback of Hamza PYINV3 placeholder cancellation',
        NULL
      );
    END IF;
  END LOOP;

  FOR v_journal IN
    SELECT item.value
    FROM jsonb_array_elements(COALESCE(v_audit.old_values -> 'journals', '[]'::jsonb)) item(value)
  LOOP
    UPDATE public.journal_entries entry
    SET status = v_journal ->> 'status',
        rejection_reason = v_journal ->> 'rejection_reason',
        updated_by = NULLIF(v_journal ->> 'updated_by', '')::uuid,
        updated_at = (v_journal ->> 'updated_at')::timestamptz
    WHERE entry.id = (v_journal ->> 'id')::uuid
      AND entry.company_id = v_company_id
      AND lower(entry.status) IN ('cancelled', 'reversed', 'posted');
  END LOOP;

  FOR v_invoice IN
    SELECT item.value
    FROM jsonb_array_elements(v_audit.old_values -> 'invoices') item(value)
  LOOP
    UPDATE public.invoices invoice
    SET status = v_invoice ->> 'status',
        payment_status = v_invoice ->> 'payment_status',
        paid_amount = (v_invoice ->> 'paid_amount')::numeric,
        balance_due = (v_invoice ->> 'balance_due')::numeric,
        notes = v_invoice ->> 'notes',
        updated_at = (v_invoice ->> 'updated_at')::timestamptz
    WHERE invoice.id = (v_invoice ->> 'id')::uuid
      AND invoice.company_id = v_company_id;
  END LOOP;

  UPDATE public.customer_balances balance
  SET current_balance = live.current_balance,
      overdue_amount = live.overdue_amount,
      days_overdue = live.days_overdue,
      last_payment_date = live.last_payment_date,
      last_payment_amount = live.last_payment_amount,
      updated_at = now()
  FROM (
    SELECT
      COALESCE(sum(invoice.balance_due), 0) AS current_balance,
      COALESCE(sum(invoice.balance_due) FILTER (
        WHERE invoice.due_date < CURRENT_DATE AND invoice.balance_due > 0.01
      ), 0) AS overdue_amount,
      COALESCE(GREATEST(CURRENT_DATE - min(invoice.due_date) FILTER (
        WHERE invoice.due_date < CURRENT_DATE AND invoice.balance_due > 0.01
      ), 0), 0) AS days_overdue,
      latest.payment_date AS last_payment_date,
      latest.amount AS last_payment_amount
    FROM public.invoices invoice
    CROSS JOIN LATERAL (
      SELECT payment.payment_date, payment.amount
      FROM public.payments payment
      WHERE payment.company_id = v_company_id
        AND payment.customer_id = v_customer_id
        AND lower(payment.payment_status) IN ('completed', 'paid', 'success', 'succeeded')
      ORDER BY payment.payment_date DESC, payment.created_at DESC, payment.id DESC
      LIMIT 1
    ) latest
    WHERE invoice.company_id = v_company_id
      AND invoice.customer_id = v_customer_id
      AND lower(invoice.status) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
      AND lower(invoice.payment_status) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
    GROUP BY latest.payment_date, latest.amount
  ) live
  WHERE balance.company_id = v_company_id
    AND balance.customer_id = v_customer_id;

  UPDATE public.audit_logs
  SET status = 'rolled_back',
      notes = concat_ws(E'\n', notes, 'تم تنفيذ rollback تعويضي بتاريخ ' || now()::text)
  WHERE id = v_audit.id;
END;
$rollback$;

COMMIT;
