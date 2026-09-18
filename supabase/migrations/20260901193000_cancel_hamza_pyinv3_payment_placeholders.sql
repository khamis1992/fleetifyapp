-- Cancel the ten orphan PYINV3 invoices that mirror Hamza's imported receipts.
-- The receipts and their canonical invoice allocations remain untouched.

BEGIN;

DO $repair$
DECLARE
  v_company_id constant uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_customer_id constant uuid := '14abf10e-299a-43f3-b4bd-28fafce3aea1';
  v_contract_id constant uuid := '662e4640-2b0a-4a21-a05a-b44681f8c1eb';
  v_invoice_id uuid;
  v_result jsonb;
  v_results jsonb := '[]'::jsonb;
  v_before jsonb;
  v_expected_current numeric;
  v_expected_overdue numeric;
  v_expected_days integer;
  v_invoice_ids constant uuid[] := ARRAY[
    '9f5b4fbd-c21b-4da0-8e1c-4445bbe21277',
    'f5748281-f317-48cd-a810-e99e0a1d07fb',
    'e3368ed0-3411-451f-81e6-c1058d932e95',
    'be6761b4-5382-4355-a731-e1a083baf0cd',
    '1dda9aca-f543-43d4-a0dc-24b308c1834d',
    'f47fb39e-b784-48ed-8477-08fc99aec225',
    'eeb075af-7ca6-4cdf-900a-64b2b516c630',
    '370c41dd-3c2f-409c-bc2f-c321727cae83',
    '0d45278c-c1bc-4cbd-8187-46a543c1d2a3',
    '27ee221a-04d4-4fb5-ace2-ec9ff218146c'
  ]::uuid[];
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_company_id::text || ':hamza-pyinv3-cleanup', 0)
  );
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);

  IF (
    SELECT count(*)
    FROM public.invoices invoice
    WHERE invoice.id = ANY(v_invoice_ids)
      AND invoice.company_id = v_company_id
      AND invoice.customer_id = v_customer_id
      AND invoice.contract_id IS NULL
      AND invoice.invoice_number LIKE 'PYINV3-PAY-%'
      AND invoice.paid_amount = 0
      AND invoice.balance_due = invoice.total_amount
      AND lower(invoice.status) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
  ) <> 10 OR (
    SELECT COALESCE(sum(invoice.total_amount), 0)
    FROM public.invoices invoice
    WHERE invoice.id = ANY(v_invoice_ids)
      AND invoice.company_id = v_company_id
      AND lower(invoice.status) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
  ) <> 12720 THEN
    RAISE EXCEPTION 'Precondition failed: the ten QAR 12,720 Hamza PYINV3 placeholders drifted';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.invoices invoice
    WHERE invoice.id = ANY(v_invoice_ids)
      AND (
        NOT EXISTS (
          SELECT 1
          FROM public.payments payment
          WHERE payment.company_id = invoice.company_id
            AND invoice.invoice_number = 'PYINV3-' || payment.payment_number
            AND payment.customer_id = v_customer_id
            AND payment.contract_id = v_contract_id
            AND payment.amount = invoice.total_amount
            AND lower(COALESCE(payment.transaction_type::text, 'receipt')) = 'receipt'
        )
        OR EXISTS (
          SELECT 1 FROM public.payments payment
          WHERE payment.invoice_id = invoice.id
            AND lower(payment.payment_status) NOT IN (
              'cancelled', 'canceled', 'failed', 'void', 'voided', 'reversed', 'refunded'
            )
        )
        OR EXISTS (
          SELECT 1
          FROM public.payment_allocations allocation
          JOIN public.payments payment ON payment.id = allocation.payment_id
          WHERE allocation.allocation_type = 'invoice'
            AND allocation.target_id = invoice.id
            AND allocation.is_active = true
            AND lower(payment.payment_status) NOT IN (
              'cancelled', 'canceled', 'failed', 'void', 'voided', 'reversed', 'refunded'
            )
        )
      )
  ) THEN
    RAISE EXCEPTION 'Precondition failed: a Hamza PYINV3 placeholder lacks its matching receipt or has an active payment link';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.payments payment
    WHERE payment.company_id = v_company_id
      AND payment.customer_id = v_customer_id
      AND payment.contract_id = v_contract_id
      AND lower(payment.payment_status) IN ('completed', 'paid', 'success', 'succeeded')
    GROUP BY payment.id, payment.amount
    HAVING abs(payment.amount - COALESCE((
      SELECT sum(allocation.amount)
      FROM public.payment_allocations allocation
      WHERE allocation.payment_id = payment.id
        AND allocation.is_active = true
    ), 0)) >= 0.01
  ) THEN
    RAISE EXCEPTION 'Precondition failed: an active Hamza receipt is not fully allocated';
  END IF;

  SELECT jsonb_build_object(
    'invoices', jsonb_agg(to_jsonb(invoice) ORDER BY invoice.invoice_date, invoice.id),
    'journals', (
      SELECT jsonb_agg(to_jsonb(entry) ORDER BY entry.entry_date, entry.id)
      FROM public.journal_entries entry
      WHERE entry.id = ANY(ARRAY(
        SELECT target.journal_entry_id
        FROM public.invoices target
        WHERE target.id = ANY(v_invoice_ids)
          AND target.journal_entry_id IS NOT NULL
      ))
    ),
    'customer_balance', (
      SELECT to_jsonb(balance)
      FROM public.customer_balances balance
      WHERE balance.company_id = v_company_id
        AND balance.customer_id = v_customer_id
    ),
    'completed_receipt_count', (
      SELECT count(*) FROM public.payments payment
      WHERE payment.company_id = v_company_id
        AND payment.customer_id = v_customer_id
        AND lower(payment.payment_status) IN ('completed', 'paid', 'success', 'succeeded')
    ),
    'completed_receipt_total', (
      SELECT COALESCE(sum(payment.amount), 0) FROM public.payments payment
      WHERE payment.company_id = v_company_id
        AND payment.customer_id = v_customer_id
        AND lower(payment.payment_status) IN ('completed', 'paid', 'success', 'succeeded')
    )
  ) INTO v_before
  FROM public.invoices invoice
  WHERE invoice.id = ANY(v_invoice_ids);

  FOREACH v_invoice_id IN ARRAY v_invoice_ids LOOP
    v_result := public.cancel_invoice_with_reversal(
      v_invoice_id,
      v_company_id,
      'إلغاء فاتورة PYINV3 وهمية أُنشئت من سجل دفعة حمزة نفسه؛ تبقى الدفعة الصحيحة وتخصيصاتها ويزال الدين المكرر.'
    );
    v_results := v_results || jsonb_build_array(v_result);
  END LOOP;

  SELECT
    COALESCE(sum(invoice.balance_due), 0),
    COALESCE(sum(invoice.balance_due) FILTER (
      WHERE invoice.due_date < CURRENT_DATE AND invoice.balance_due > 0.01
    ), 0),
    COALESCE(GREATEST(CURRENT_DATE - min(invoice.due_date) FILTER (
      WHERE invoice.due_date < CURRENT_DATE AND invoice.balance_due > 0.01
    ), 0), 0)
  INTO v_expected_current, v_expected_overdue, v_expected_days
  FROM public.invoices invoice
  WHERE invoice.company_id = v_company_id
    AND invoice.customer_id = v_customer_id
    AND lower(invoice.status) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
    AND lower(invoice.payment_status) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted');

  UPDATE public.customer_balances balance
  SET current_balance = v_expected_current,
      overdue_amount = v_expected_overdue,
      days_overdue = v_expected_days,
      last_payment_date = latest.payment_date,
      last_payment_amount = latest.amount,
      updated_at = now()
  FROM LATERAL (
    SELECT payment.payment_date, payment.amount
    FROM public.payments payment
    WHERE payment.company_id = v_company_id
      AND payment.customer_id = v_customer_id
      AND lower(payment.payment_status) IN ('completed', 'paid', 'success', 'succeeded')
      AND lower(COALESCE(payment.transaction_type::text, 'receipt')) = 'receipt'
    ORDER BY payment.payment_date DESC, payment.created_at DESC, payment.id DESC
    LIMIT 1
  ) latest
  WHERE balance.company_id = v_company_id
    AND balance.customer_id = v_customer_id;

  IF EXISTS (
    SELECT 1 FROM public.invoices invoice
    WHERE invoice.id = ANY(v_invoice_ids)
      AND lower(invoice.status) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
  ) OR EXISTS (
    SELECT 1 FROM public.customer_balances balance
    WHERE balance.company_id = v_company_id
      AND balance.customer_id = v_customer_id
      AND (
        balance.current_balance <> v_expected_current
        OR balance.overdue_amount <> v_expected_overdue
        OR balance.days_overdue <> v_expected_days
      )
  ) OR (
    SELECT count(*) FROM public.payments payment
    WHERE payment.company_id = v_company_id
      AND payment.customer_id = v_customer_id
      AND lower(payment.payment_status) IN ('completed', 'paid', 'success', 'succeeded')
  ) <> 34 OR (
    SELECT COALESCE(sum(payment.amount), 0) FROM public.payments payment
    WHERE payment.company_id = v_company_id
      AND payment.customer_id = v_customer_id
      AND lower(payment.payment_status) IN ('completed', 'paid', 'success', 'succeeded')
  ) <> 36140 THEN
    RAISE EXCEPTION 'Postcondition failed: Hamza ledger does not match the verified state';
  END IF;

  INSERT INTO public.audit_logs (
    company_id, action, resource_type, resource_id, entity_name,
    changes_summary, old_values, new_values, metadata, status, severity,
    user_name, notes
  ) VALUES (
    v_company_id,
    'hamza_pyinv3_payment_placeholders_cancelled',
    'invoice_set',
    v_contract_id,
    'LTO202437 / 10 PYINV3 placeholders',
    'إلغاء 10 فواتير وهمية بقيمة 12,720 ر.ق كانت تحول سجلات دفعات حمزة إلى ديون إضافية',
    v_before,
    jsonb_build_object(
      'cancelled_invoice_ids', to_jsonb(v_invoice_ids),
      'cancellation_results', v_results,
      'customer_balance', v_expected_current,
      'customer_overdue', v_expected_overdue,
      'completed_receipts_preserved', 34,
      'completed_receipt_total_preserved', 36140
    ),
    jsonb_build_object(
      'migration_key', '20260901193000_cancel_hamza_pyinv3_payment_placeholders',
      'matching_receipts_preserved', true,
      'reversal_count', 10
    ),
    'completed',
    'critical',
    'Codex production repair',
    'الفواتير الوهمية ألغيت بقيود عكسية؛ لم تُلغَ أي دفعة صحيحة.'
  );
END;
$repair$;

COMMIT;
