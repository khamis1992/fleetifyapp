-- Cancel eleven orphan PYINV3 invoices that mirror completed Thamer receipts.
-- The receipts remain valid against C-ALF-0048; the placeholder invoices are
-- reversed so customer_balances agrees with the verified legal claim.

BEGIN;

DO $repair$
DECLARE
  v_company_id constant uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_customer_id constant uuid := '508f6e9f-1df5-4c98-b9c9-2afc6e3e0e7f';
  v_contract_id constant uuid := 'b88a2ae9-b579-4b32-9f88-ec525d528642';
  v_case_id constant uuid := '4013611e-eaaa-460e-800f-9b67932f9f21';
  v_invoice_id uuid;
  v_result jsonb;
  v_before jsonb;
  v_invoice_ids constant uuid[] := ARRAY[
    '9dba1ec0-84b7-44ca-b7b7-63d881101291',
    'ca90b53f-cb86-48f3-ade7-671699a2a116',
    'fb370337-f1c2-4c7b-bbd9-4a2db6c9ce0a',
    '7c832205-b85d-4c8d-ad0a-ed98b673d368',
    '33bf575a-5f1a-4d65-a5fe-b2b9c3ee3cef',
    'a314db03-715b-4f1f-9529-fb6d0fc38dc6',
    'c7cf6037-2fa4-4706-b635-000ca1e601fa',
    'e2c770c3-6ff6-4261-8f07-e91641301de0',
    '328f1b0c-0c08-42e7-ab7b-2d7614aa1b1a',
    '388af1f4-e167-4aab-9306-b2fe796222f0',
    '7528c631-0a2e-41d5-bbf0-de1e26485d31'
  ]::uuid[];
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_company_id::text || ':thamer-pyinv3-cleanup', 0)
  );
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  PERFORM set_config('client_min_messages', 'warning', true);

  IF (
    SELECT count(*)
    FROM public.invoices invoice
    WHERE invoice.id = ANY(v_invoice_ids)
      AND invoice.company_id = v_company_id
      AND invoice.customer_id = v_customer_id
      AND invoice.contract_id IS NULL
      AND invoice.invoice_number LIKE 'PYINV3-PAY-%'
      AND lower(invoice.status) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
  ) <> 11 OR (
    SELECT COALESCE(sum(invoice.total_amount), 0)
    FROM public.invoices invoice
    WHERE invoice.id = ANY(v_invoice_ids)
      AND invoice.company_id = v_company_id
      AND lower(invoice.status) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
  ) <> 10560 THEN
    RAISE EXCEPTION 'Precondition failed: the eleven QAR 10,560 PYINV3 placeholders drifted';
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
            AND lower(payment.payment_status) IN ('completed', 'paid', 'success', 'succeeded')
            AND lower(COALESCE(payment.transaction_type::text, 'receipt')) = 'receipt'
        )
        OR EXISTS (
          SELECT 1
          FROM public.payments payment
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
    RAISE EXCEPTION 'Precondition failed: a PYINV3 placeholder lacks its matching receipt or has active payment linkage';
  END IF;

  SELECT jsonb_build_object(
    'invoices', jsonb_agg(to_jsonb(invoice) ORDER BY invoice.invoice_date, invoice.id),
    'matching_payments', (
      SELECT jsonb_agg(to_jsonb(payment) ORDER BY payment.payment_date, payment.id)
      FROM public.payments payment
      JOIN public.invoices placeholder
        ON placeholder.id = ANY(v_invoice_ids)
       AND placeholder.company_id = payment.company_id
       AND placeholder.invoice_number = 'PYINV3-' || payment.payment_number
      WHERE payment.company_id = v_company_id
    ),
    'customer_balance', (
      SELECT to_jsonb(balance)
      FROM public.customer_balances balance
      WHERE balance.company_id = v_company_id
        AND balance.customer_id = v_customer_id
    )
  )
  INTO v_before
  FROM public.invoices invoice
  WHERE invoice.id = ANY(v_invoice_ids);

  FOREACH v_invoice_id IN ARRAY v_invoice_ids LOOP
    v_result := public.cancel_invoice_with_reversal(
      v_invoice_id,
      v_company_id,
      'إلغاء فاتورة PYINV3 وهمية أُنشئت من دفعة ثامر المكتملة نفسها؛ تبقى الدفعة الصحيحة ويزال الدين المكرر.'
    );
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
      COALESCE((
        SELECT sum(invoice.balance_due)
        FROM public.invoices invoice
        WHERE invoice.company_id = v_company_id
          AND invoice.customer_id = v_customer_id
          AND lower(invoice.status) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
          AND lower(invoice.payment_status) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
      ), 0) AS current_balance,
      COALESCE((
        SELECT sum(invoice.balance_due)
        FROM public.invoices invoice
        WHERE invoice.company_id = v_company_id
          AND invoice.customer_id = v_customer_id
          AND invoice.due_date <= CURRENT_DATE
          AND invoice.balance_due > 0.01
          AND lower(invoice.status) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
          AND lower(invoice.payment_status) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
      ), 0) AS overdue_amount,
      COALESCE((
        SELECT GREATEST(CURRENT_DATE - min(invoice.due_date), 0)
        FROM public.invoices invoice
        WHERE invoice.company_id = v_company_id
          AND invoice.customer_id = v_customer_id
          AND invoice.due_date <= CURRENT_DATE
          AND invoice.balance_due > 0.01
          AND lower(invoice.status) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
          AND lower(invoice.payment_status) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
      ), 0) AS days_overdue,
      latest.payment_date AS last_payment_date,
      latest.amount AS last_payment_amount
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
  ) live
  WHERE balance.company_id = v_company_id
    AND balance.customer_id = v_customer_id;

  IF EXISTS (
    SELECT 1 FROM public.invoices invoice
    WHERE invoice.id = ANY(v_invoice_ids)
      AND lower(invoice.status) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
  ) THEN
    RAISE EXCEPTION 'Postcondition failed: an invalid PYINV3 placeholder remains active';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.customer_balances balance
    JOIN public.legal_cases legal_case ON legal_case.id = v_case_id
    JOIN public.delinquent_customers delinquent
      ON delinquent.company_id = balance.company_id
     AND delinquent.customer_id = balance.customer_id
     AND delinquent.contract_id = v_contract_id
    WHERE balance.company_id = v_company_id
      AND balance.customer_id = v_customer_id
      AND balance.current_balance = 17240
      AND balance.overdue_amount = 17240
      AND legal_case.case_value = 17240
      AND delinquent.total_debt = 17240
  ) THEN
    RAISE EXCEPTION 'Postcondition failed: customer balance, legal case, and delinquency cache do not agree at QAR 17,240';
  END IF;

  INSERT INTO public.audit_logs (
    company_id, action, resource_type, resource_id, entity_name,
    changes_summary, old_values, new_values, metadata, status, severity,
    user_name, notes
  ) VALUES (
    v_company_id,
    'thamer_pyinv3_payment_placeholders_cancelled',
    'invoice_set',
    v_contract_id,
    'C-ALF-0048 / 11 PYINV3 placeholders',
    'إلغاء 11 فاتورة وهمية بقيمة 10,560 ر.ق كانت تكرر دفعات ثامر المكتملة كديون',
    v_before,
    jsonb_build_object(
      'cancelled_invoice_ids', to_jsonb(v_invoice_ids),
      'customer_balance', 17240,
      'legal_case_value', 17240,
      'delinquency_total', 17240
    ),
    jsonb_build_object('matching_receipts_preserved', true, 'reversal_count', 11),
    'completed',
    'critical',
    'Codex production repair',
    'الفواتير ألغيت بقيود عكسية؛ الدفعات الصحيحة لم تُلغَ.'
  );
END;
$repair$;

COMMIT;
