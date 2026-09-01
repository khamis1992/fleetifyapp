-- Cancel eight invalid receipts on LTO202437 through the canonical atomic
-- cancellation workflow. Rows are retained as cancelled for auditability;
-- journals and allocations are reversed and affected balances recalculated.

BEGIN;

DO $migration$
DECLARE
  v_company_id constant uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_contract_id constant uuid := '662e4640-2b0a-4a21-a05a-b44681f8c1eb';
  v_actor_id constant uuid := '2a2b3a8a-35dd-4251-a8ba-09f70538c920';
  v_payment_ids constant uuid[] := ARRAY[
    'a4318bbc-897e-478c-9018-b9004dd941b4'::uuid, -- PBC-368
    '62fce005-9abd-4819-9c59-321397b10d7b'::uuid, -- PBC-522
    'bdfb609b-c6e0-4f21-82db-21bcb7276dc3'::uuid, -- PBC-949
    '7fa4fded-ec5b-4096-bee8-0b750c40b5cb'::uuid, -- PBC-1125
    '5c67735a-251f-46c0-9cd9-9602cbc27abb'::uuid, -- PBC-1240
    '718ff1cc-d503-4a88-8cf3-8cce225971f0'::uuid, -- PBC-1350
    '11df4bec-afc3-484f-b6b7-692b0ac62d21'::uuid, -- duplicate generated 1,060
    '90efdbee-cdda-40b8-a98b-b3e1e040346e'::uuid  -- synthetic late-payment record
  ];
  v_reason constant text := 'تصحيح عقد LTO202437: إلغاء ست نسخ PBC مكررة من إيصالات PAY الأصلية، وإلغاء سجل 1,060 الزائد المرتبط بالمصدر 522، وإلغاء سجل تأخير مولد آلياً لا يمثل قبضاً فعلياً.';
  v_snapshot jsonb;
  v_result jsonb;
  v_count integer;
  v_amount numeric;
  v_allocated numeric;
  v_overdue numeric;
  v_future numeric;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(v_company_id::text || ':payment-repair:LTO202437', 0));

  SELECT count(*), coalesce(sum(payment.amount), 0)
  INTO v_count, v_amount
  FROM public.payments payment
  WHERE payment.company_id = v_company_id
    AND payment.contract_id = v_contract_id
    AND payment.id = ANY(v_payment_ids)
    AND payment.payment_status = 'completed';

  SELECT coalesce(sum(allocation.amount), 0)
  INTO v_allocated
  FROM public.payment_allocations allocation
  WHERE allocation.company_id = v_company_id
    AND allocation.payment_id = ANY(v_payment_ids)
    AND allocation.is_active = true;

  IF v_count <> 8 OR v_amount <> 10600 OR v_allocated <> 10050 THEN
    RAISE EXCEPTION 'LTO202437 invalid-payment graph changed: count %, amount %, allocated %',
      v_count, v_amount, v_allocated;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.payments payment
    WHERE payment.id = ANY(v_payment_ids)
      AND (
        payment.company_id <> v_company_id
        OR payment.contract_id <> v_contract_id
        OR payment.payment_status <> 'completed'
        OR payment.journal_entry_id IS NULL
      )
  ) OR EXISTS (
    SELECT 1
    FROM unnest(v_payment_ids) requested(payment_id)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.journal_entries entry
      JOIN public.payments payment ON payment.id = requested.payment_id
      WHERE entry.company_id = v_company_id
        AND lower(coalesce(entry.status::text, '')) IN ('posted', 'reversed')
        AND (
          entry.id = payment.journal_entry_id
          OR (entry.reference_type = 'payment' AND entry.reference_id = payment.id)
        )
    )
  ) THEN
    RAISE EXCEPTION 'One or more LTO202437 target payments lost their accounting evidence';
  END IF;

  -- Six PBC rows are exact source duplicates of legacy PAY receipts. The
  -- matching report saw the existing receipt one day later, but the importer
  -- compared exact dates and inserted a second row.
  IF (
    SELECT count(*)
    FROM (VALUES
      ('PBC-368',  'PAY-1758229515500-773', 1060::numeric, date '2024-04-28', date '2024-04-29'),
      ('PBC-522',  'PAY-1758229515495-463', 3180::numeric, date '2024-05-29', date '2024-05-30'),
      ('PBC-949',  'PAY-1758229515531-2592', 1060::numeric, date '2024-08-27', date '2024-08-28'),
      ('PBC-1125', 'PAY-1758229515526-2326', 1060::numeric, date '2024-09-29', date '2024-09-30'),
      ('PBC-1240', 'PAY-1758229515522-2189', 1060::numeric, date '2024-10-27', date '2024-10-28'),
      ('PBC-1350', 'PAY-1758229515509-1294', 1060::numeric, date '2024-11-27', date '2024-11-28')
    ) expected(pbc_number, legacy_number, amount, pbc_date, legacy_date)
    JOIN public.payments pbc
      ON pbc.company_id = v_company_id
     AND pbc.contract_id = v_contract_id
     AND pbc.payment_number = expected.pbc_number
     AND pbc.amount = expected.amount
     AND pbc.payment_date = expected.pbc_date
    JOIN public.payments legacy
      ON legacy.company_id = pbc.company_id
     AND legacy.contract_id = pbc.contract_id
     AND legacy.payment_number = expected.legacy_number
     AND legacy.amount = expected.amount
     AND legacy.payment_date = expected.legacy_date
     AND legacy.payment_status = 'completed'
  ) <> 6 THEN
    RAISE EXCEPTION 'The six reviewed PBC/legacy duplicate pairs no longer match';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public._audit_excel_old_payments source
    WHERE regexp_replace(coalesce(source.plate, ''), '\D', '', 'g') = '676281'
      AND source.pdate = date '2024-05-30'
      AND source.amount = 1060
  ) OR NOT EXISTS (
    SELECT 1 FROM public.payments payment
    WHERE payment.id = '11df4bec-afc3-484f-b6b7-692b0ac62d21'
      AND payment.notes = 'June , July , August rent'
      AND payment.created_at BETWEEN timestamptz '2025-09-18 21:05:17.490+00'
                                 AND timestamptz '2025-09-18 21:05:17.500+00'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.payments payment
    WHERE payment.id = '90efdbee-cdda-40b8-a98b-b3e1e040346e'
      AND payment.notes LIKE 'Auto-generated late payment record%'
  ) THEN
    RAISE EXCEPTION 'The two reviewed synthetic/excess payment findings changed';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.payment_cancellation_audit audit
    WHERE audit.company_id = v_company_id
      AND audit.payment_id = ANY(v_payment_ids)
  ) THEN
    RAISE EXCEPTION 'A target payment already has a cancellation audit';
  END IF;

  SELECT jsonb_build_object(
    'payments', (
      SELECT jsonb_agg(to_jsonb(payment) ORDER BY payment.payment_number)
      FROM public.payments payment
      WHERE payment.company_id = v_company_id AND payment.id = ANY(v_payment_ids)
    ),
    'active_allocations', (
      SELECT coalesce(jsonb_agg(to_jsonb(allocation) ORDER BY allocation.id), '[]'::jsonb)
      FROM public.payment_allocations allocation
      WHERE allocation.company_id = v_company_id
        AND allocation.payment_id = ANY(v_payment_ids)
        AND allocation.is_active = true
    ),
    'contract', (
      SELECT to_jsonb(contract) FROM public.contracts contract
      WHERE contract.id = v_contract_id AND contract.company_id = v_company_id
    )
  ) INTO v_snapshot;

  INSERT INTO public.audit_logs (
    company_id, action, resource_type, resource_id, entity_name,
    changes_summary, old_values, metadata, status, severity,
    user_id, user_email, user_name, notes
  ) VALUES (
    v_company_id, 'cancel_lto202437_invalid_payments_started',
    'contract', v_contract_id, 'LTO202437',
    'بدء عكس ثماني دفعات غير صحيحة بقيمة 10,600 ر.ق مع تخصيصات فعالة 10,050 ر.ق',
    v_snapshot,
    jsonb_build_object(
      'migration_key', '20260831174951_cancel_lto202437_invalid_payments',
      'payment_ids', to_jsonb(v_payment_ids),
      'reason', v_reason
    ),
    'in_progress', 'critical', v_actor_id,
    'khamis-1992@hotmail.com', 'خميس',
    'الحذف محاسبي قابل للتدقيق: تحتفظ صفوف الدفعات بحالة cancelled.'
  );

  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  v_result := public.cancel_payments_batch_with_reversal(
    v_payment_ids,
    v_company_id,
    v_reason,
    v_actor_id
  );

  SELECT coalesce(sum(invoice.balance_due), 0)
  INTO v_overdue
  FROM public.invoices invoice
  WHERE invoice.company_id = v_company_id
    AND invoice.contract_id = v_contract_id
    AND invoice.due_date <= current_date
    AND lower(coalesce(invoice.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided');

  SELECT coalesce(sum(invoice.balance_due), 0)
  INTO v_future
  FROM public.invoices invoice
  WHERE invoice.company_id = v_company_id
    AND invoice.contract_id = v_contract_id
    AND invoice.due_date > current_date
    AND lower(coalesce(invoice.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided');

  IF coalesce((v_result ->> 'cancelled_count')::integer, 0) <> 8
     OR EXISTS (
       SELECT 1 FROM public.payments payment
       WHERE payment.company_id = v_company_id
         AND payment.id = ANY(v_payment_ids)
         AND (
           payment.payment_status <> 'cancelled'
           OR payment.allocation_status <> 'cancelled'
         )
     )
     OR EXISTS (
       SELECT 1 FROM public.payment_allocations allocation
       WHERE allocation.company_id = v_company_id
         AND allocation.payment_id = ANY(v_payment_ids)
         AND allocation.is_active = true
     )
     OR (
       SELECT count(*) FROM public.payment_cancellation_audit audit
       WHERE audit.company_id = v_company_id
         AND audit.payment_id = ANY(v_payment_ids)
     ) <> 8
     OR v_overdue <> 10050
     OR v_future <> 5300
  THEN
    RAISE EXCEPTION 'Post-cancellation verification failed: result %, overdue %, future %',
      v_result, v_overdue, v_future;
  END IF;

  UPDATE public.audit_logs audit
  SET status = 'completed',
      new_values = jsonb_build_object(
        'cancelled_count', 8,
        'cancelled_amount', 10600,
        'reversed_allocations', 10050,
        'overdue_invoice_balance', v_overdue,
        'future_invoice_balance', v_future,
        'batch_result', v_result
      ),
      notes = concat_ws(E'\n', audit.notes,
        'اكتمل العكس الذري. المتأخر في فواتير النظام 10,050 ر.ق؛ فرق تسعير 200 ر.ق عن القسط التعاقدي يحتاج تصحيحاً منفصلاً.')
  WHERE audit.company_id = v_company_id
    AND audit.resource_id = v_contract_id
    AND audit.action = 'cancel_lto202437_invalid_payments_started'
    AND audit.metadata ->> 'migration_key' = '20260831174951_cancel_lto202437_invalid_payments';
END;
$migration$;

COMMIT;
