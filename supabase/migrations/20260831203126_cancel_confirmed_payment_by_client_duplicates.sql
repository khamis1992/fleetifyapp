-- Cancel the 105 active PBC receipts proven to duplicate existing receipts
-- from Payment By Client_full.xlsx. The proof combines the one-day timezone
-- shift with either an exact normalized description, an exact PAY-XLS source
-- number, or the reviewed cross-contract handover case PBC-945.
--
-- This is an accounting cancellation, not a hard delete: the canonical
-- cancellation command reverses journals, voids allocations, recalculates
-- invoices/contracts, and writes one cancellation audit per payment.

BEGIN;

DO $migration$
DECLARE
  v_company_id constant uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_actor_id constant uuid := '2a2b3a8a-35dd-4251-a8ba-09f70538c920';
  v_key constant text := '20260831203126_cancel_confirmed_payment_by_client_duplicates';
  v_reason constant text := 'تصحيح Payment By Client_full.xlsx: إلغاء 105 دفعات PBC مؤكدة التكرار بسبب تحويل تاريخ Excel من توقيت الدوحة إلى UTC، مع الاحتفاظ بالإيصالات الأصلية الصحيحة.';
  v_payment_ids uuid[];
  v_contract_ids uuid[];
  v_invoice_ids uuid[];
  v_snapshot jsonb;
  v_result_1 jsonb;
  v_result_2 jsonb;
  v_count integer;
  v_amount numeric;
  v_allocation_count integer;
  v_allocated numeric;
  v_reversal_count integer;
  v_post_contract_paid numeric;
  v_contract_mismatches jsonb;
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_company_id::text || ':payment-by-client-confirmed-duplicates', 0)
  );

  WITH same_pairs AS (
    SELECT
      pbc.id AS pbc_id,
      pbc.payment_number AS pbc_number,
      pbc.contract_id,
      pbc.amount,
      other.id AS other_id,
      other.payment_number AS other_number,
      trim(substring(pbc.notes FROM 'Original description: ([^\n\r]*)')) AS original_description,
      other.notes AS other_notes
    FROM public.payments pbc
    JOIN public.payments other
      ON other.company_id = pbc.company_id
     AND other.contract_id = pbc.contract_id
     AND other.id <> pbc.id
     AND other.amount = pbc.amount
     AND abs(other.payment_date - pbc.payment_date) = 1
     AND other.payment_status = 'completed'
     AND other.payment_number NOT LIKE 'PBC-%'
    WHERE pbc.company_id = v_company_id
      AND pbc.payment_number LIKE 'PBC-%'
      AND pbc.payment_status = 'completed'
  ),
  confirmed_same AS (
    SELECT DISTINCT ON (pbc_id) *
    FROM same_pairs
    WHERE (
      nullif(original_description, '') IS NOT NULL
      AND lower(regexp_replace(coalesce(other_notes, ''), '\s+', ' ', 'g')) LIKE
          lower(regexp_replace(original_description, '\s+', ' ', 'g')) || '%'
    )
       OR other_number = 'PAY-XLS-' || substring(pbc_number FROM 'PBC-(\d+)$')
       OR pbc_number = 'PBC-1260'
    ORDER BY pbc_id, other_id
  ),
  cross_confirmed AS (
    SELECT
      pbc.id AS pbc_id,
      pbc.payment_number AS pbc_number,
      pbc.contract_id,
      pbc.amount,
      other.id AS other_id,
      other.payment_number AS other_number,
      ''::text AS original_description,
      ''::text AS other_notes
    FROM public.payments pbc
    JOIN public.payments other
      ON other.company_id = pbc.company_id
     AND other.customer_id = pbc.customer_id
     AND other.amount = pbc.amount
     AND abs(other.payment_date - pbc.payment_date) = 1
     AND other.payment_status = 'completed'
     AND other.payment_number = 'PAY-1758229515517-1755'
    WHERE pbc.company_id = v_company_id
      AND pbc.payment_number = 'PBC-945'
      AND pbc.payment_status = 'completed'
  ),
  targets AS (
    SELECT * FROM confirmed_same
    UNION ALL
    SELECT * FROM cross_confirmed
  )
  SELECT
    array_agg(pbc_id ORDER BY pbc_id),
    array_agg(DISTINCT contract_id ORDER BY contract_id)
  INTO v_payment_ids, v_contract_ids
  FROM targets;

  SELECT count(*), coalesce(sum(payment.amount), 0)
  INTO v_count, v_amount
  FROM public.payments payment
  WHERE payment.company_id = v_company_id
    AND payment.id = ANY(v_payment_ids)
    AND payment.payment_status = 'completed';

  SELECT count(*), coalesce(sum(allocation.amount), 0)
  INTO v_allocation_count, v_allocated
  FROM public.payment_allocations allocation
  WHERE allocation.company_id = v_company_id
    AND allocation.payment_id = ANY(v_payment_ids)
    AND allocation.is_active = true;

  IF coalesce(array_length(v_payment_ids, 1), 0) <> 105
     OR coalesce(array_length(v_contract_ids, 1), 0) <> 21
     OR v_count <> 105
     OR v_amount <> 137647
     OR v_allocation_count <> 137
     OR v_allocated <> 133547
  THEN
    RAISE EXCEPTION
      'Confirmed duplicate graph changed: ids %, contracts %, completed %, amount %, allocations %, allocated %',
      coalesce(array_length(v_payment_ids, 1), 0),
      coalesce(array_length(v_contract_ids, 1), 0),
      v_count, v_amount, v_allocation_count, v_allocated;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.payments payment
    WHERE payment.id = ANY(v_payment_ids)
      AND (
        payment.company_id <> v_company_id
        OR payment.payment_status <> 'completed'
        OR payment.payment_number NOT LIKE 'PBC-%'
        OR payment.journal_entry_id IS NULL
      )
  ) OR EXISTS (
    SELECT 1
    FROM unnest(v_payment_ids) requested(payment_id)
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.journal_entries entry
      JOIN public.payments payment ON payment.id = requested.payment_id
      WHERE entry.company_id = v_company_id
        AND lower(coalesce(entry.status::text, '')) IN ('posted', 'reversed')
        AND (
          entry.id = payment.journal_entry_id
          OR (entry.reference_type = 'payment' AND entry.reference_id = payment.id)
        )
    )
  ) THEN
    RAISE EXCEPTION 'At least one confirmed duplicate lost its payment or journal evidence';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.payment_cancellation_audit audit
    WHERE audit.company_id = v_company_id
      AND audit.payment_id = ANY(v_payment_ids)
  ) THEN
    RAISE EXCEPTION 'At least one confirmed duplicate already has a cancellation audit';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.bank_transactions transaction
    JOIN public.payments payment
      ON transaction.company_id = payment.company_id
     AND transaction.reference_number IN (payment.payment_number, payment.reference_number)
    WHERE payment.id = ANY(v_payment_ids)
  ) THEN
    RAISE EXCEPTION 'A confirmed duplicate now has a bank transaction; automatic cancellation refused';
  END IF;

  SELECT array_agg(DISTINCT invoice_id ORDER BY invoice_id)
  INTO v_invoice_ids
  FROM (
    SELECT payment.invoice_id
    FROM public.payments payment
    WHERE payment.id = ANY(v_payment_ids)
      AND payment.invoice_id IS NOT NULL
    UNION
    SELECT allocation.target_id
    FROM public.payment_allocations allocation
    WHERE allocation.payment_id = ANY(v_payment_ids)
      AND allocation.allocation_type = 'invoice'
      AND allocation.target_id IS NOT NULL
  ) affected(invoice_id);

  SELECT jsonb_build_object(
    'payments', (
      SELECT jsonb_agg(to_jsonb(payment) ORDER BY payment.payment_number)
      FROM public.payments payment
      WHERE payment.company_id = v_company_id
        AND payment.id = ANY(v_payment_ids)
    ),
    'active_allocations', (
      SELECT coalesce(jsonb_agg(to_jsonb(allocation) ORDER BY allocation.id), '[]'::jsonb)
      FROM public.payment_allocations allocation
      WHERE allocation.company_id = v_company_id
        AND allocation.payment_id = ANY(v_payment_ids)
        AND allocation.is_active = true
    ),
    'contracts', (
      SELECT jsonb_agg(to_jsonb(contract) ORDER BY contract.contract_number)
      FROM public.contracts contract
      WHERE contract.company_id = v_company_id
        AND contract.id = ANY(v_contract_ids)
    ),
    'invoices', (
      SELECT coalesce(jsonb_agg(to_jsonb(invoice) ORDER BY invoice.invoice_number), '[]'::jsonb)
      FROM public.invoices invoice
      WHERE invoice.company_id = v_company_id
        AND invoice.id = ANY(coalesce(v_invoice_ids, ARRAY[]::uuid[]))
    ),
    'payment_ids', to_jsonb(v_payment_ids),
    'contract_ids', to_jsonb(v_contract_ids),
    'invoice_ids', to_jsonb(coalesce(v_invoice_ids, ARRAY[]::uuid[]))
  ) INTO v_snapshot;

  INSERT INTO public.audit_logs (
    company_id, action, resource_type, resource_id, entity_name,
    changes_summary, old_values, metadata, status, severity,
    user_id, user_email, user_name, notes
  ) VALUES (
    v_company_id,
    'cancel_confirmed_payment_by_client_duplicates_started',
    'payment_batch',
    v_company_id,
    'Payment By Client_full.xlsx',
    'بدء عكس 105 دفعات PBC مؤكدة التكرار بقيمة 137,647 ر.ق وتخصيصات فعالة 133,547 ر.ق',
    v_snapshot,
    jsonb_build_object(
      'migration_key', v_key,
      'source_file_sha256', 'b52945aefd2106f79e0e64e7df1f609bc533211663d56d9d5a33cb5625700e76',
      'confirmed_count', 105,
      'excluded_manual_review_count', 9,
      'excluded_reference_issue_count', 16,
      'reason', v_reason
    ),
    'in_progress', 'critical', v_actor_id,
    'khamis-1992@hotmail.com', 'خميس',
    'إلغاء محاسبي قابل للتدقيق؛ لا يتم حذف صفوف الدفعات نهائياً.'
  );

  PERFORM set_config('request.jwt.claim.role', 'service_role', true);

  v_result_1 := public.cancel_payments_batch_with_reversal(
    v_payment_ids[1:100], v_company_id, v_reason, v_actor_id
  );
  v_result_2 := public.cancel_payments_batch_with_reversal(
    v_payment_ids[101:105], v_company_id, v_reason, v_actor_id
  );

  SELECT coalesce(sum(cardinality(audit.reversal_entry_ids)), 0)
  INTO v_reversal_count
  FROM public.payment_cancellation_audit audit
  WHERE audit.company_id = v_company_id
    AND audit.payment_id = ANY(v_payment_ids)
    AND audit.reason = v_reason;

  IF coalesce((v_result_1 ->> 'cancelled_count')::integer, 0) <> 100
     OR coalesce((v_result_2 ->> 'cancelled_count')::integer, 0) <> 5
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
       SELECT count(*)
       FROM public.payment_cancellation_audit audit
       WHERE audit.company_id = v_company_id
         AND audit.payment_id = ANY(v_payment_ids)
         AND audit.reason = v_reason
     ) <> 105
     OR EXISTS (
       SELECT 1
       FROM public.payment_cancellation_audit audit
       WHERE audit.company_id = v_company_id
         AND audit.payment_id = ANY(v_payment_ids)
         AND audit.reason = v_reason
         AND (
           audit.bank_reversal_transaction_id IS NOT NULL
           OR coalesce(cardinality(audit.reversal_entry_ids), 0) < 1
         )
     )
  THEN
    RAISE EXCEPTION 'Post-cancellation payment/allocation/audit verification failed';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.payment_cancellation_audit audit
    CROSS JOIN LATERAL unnest(audit.reversal_entry_ids) reversal(entry_id)
    LEFT JOIN public.journal_entries entry ON entry.id = reversal.entry_id
    LEFT JOIN LATERAL (
      SELECT
        coalesce(sum(line.debit_amount), 0) AS debit,
        coalesce(sum(line.credit_amount), 0) AS credit
      FROM public.journal_entry_lines line
      WHERE line.journal_entry_id = reversal.entry_id
    ) totals ON true
    WHERE audit.company_id = v_company_id
      AND audit.payment_id = ANY(v_payment_ids)
      AND audit.reason = v_reason
      AND (
        entry.id IS NULL
        OR lower(coalesce(entry.status::text, '')) <> 'posted'
        OR abs(totals.debit - totals.credit) >= 0.01
      )
  ) THEN
    RAISE EXCEPTION 'A cancellation reversal journal is missing, unposted, or unbalanced';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.invoices invoice
    WHERE invoice.id = ANY(coalesce(v_invoice_ids, ARRAY[]::uuid[]))
      AND (
        abs(coalesce(invoice.paid_amount, 0) - public.canonical_invoice_paid_amount(invoice.id, NULL)) >= 0.01
        OR abs(coalesce(invoice.balance_due, 0) - greatest(coalesce(invoice.total_amount, 0) - public.canonical_invoice_paid_amount(invoice.id, NULL), 0)) >= 0.01
      )
  ) THEN
    RAISE EXCEPTION 'An affected invoice was not recalculated to its canonical balance';
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'contract_number', contract.contract_number,
    'stored_total_paid', contract.total_paid,
    'canonical_total_paid', public.canonical_contract_paid_amount(contract.id),
    'expected_stored_total_paid', CASE
      WHEN coalesce(contract.contract_amount, 0) > 0
        THEN least(public.canonical_contract_paid_amount(contract.id), contract.contract_amount)
      ELSE public.canonical_contract_paid_amount(contract.id)
    END,
    'stored_balance_due', contract.balance_due,
    'expected_balance_due', greatest(
      coalesce(contract.contract_amount, 0) - CASE
        WHEN coalesce(contract.contract_amount, 0) > 0
          THEN least(public.canonical_contract_paid_amount(contract.id), contract.contract_amount)
        ELSE public.canonical_contract_paid_amount(contract.id)
      END,
      0
    )
  ) ORDER BY contract.contract_number), '[]'::jsonb)
  INTO v_contract_mismatches
  FROM public.contracts contract
  WHERE contract.id = ANY(v_contract_ids)
    AND (
      abs(coalesce(contract.total_paid, 0) - CASE
        WHEN coalesce(contract.contract_amount, 0) > 0
          THEN least(public.canonical_contract_paid_amount(contract.id), contract.contract_amount)
        ELSE public.canonical_contract_paid_amount(contract.id)
      END) >= 0.01
      OR abs(coalesce(contract.balance_due, 0) - greatest(
        coalesce(contract.contract_amount, 0) - CASE
          WHEN coalesce(contract.contract_amount, 0) > 0
            THEN least(public.canonical_contract_paid_amount(contract.id), contract.contract_amount)
          ELSE public.canonical_contract_paid_amount(contract.id)
        END,
        0
      )) >= 0.01
    );

  IF jsonb_array_length(v_contract_mismatches) > 0 THEN
    RAISE EXCEPTION 'Affected contracts were not recalculated to canonical balances: %',
      v_contract_mismatches;
  END IF;

  SELECT coalesce(sum(contract.total_paid), 0)
  INTO v_post_contract_paid
  FROM public.contracts contract
  WHERE contract.id = ANY(v_contract_ids);

  IF v_post_contract_paid <> 805943 THEN
    RAISE EXCEPTION 'Unexpected post-cancellation canonical contract total: %', v_post_contract_paid;
  END IF;

  UPDATE public.audit_logs audit
  SET status = 'completed',
      new_values = jsonb_build_object(
        'cancelled_count', 105,
        'cancelled_amount', 137647,
        'voided_allocation_count', 137,
        'voided_allocation_amount', 133547,
        'affected_invoice_count', coalesce(array_length(v_invoice_ids, 1), 0),
        'affected_contract_count', 21,
        'reversal_journal_count', v_reversal_count,
        'post_contract_total_paid', v_post_contract_paid,
        'batch_1', v_result_1,
        'batch_2', v_result_2
      ),
      notes = concat_ws(E'\n', audit.notes,
        'اكتمل الإلغاء الذري والتحقق من القيود والتخصيصات والفواتير والعقود.')
  WHERE audit.company_id = v_company_id
    AND audit.action = 'cancel_confirmed_payment_by_client_duplicates_started'
    AND audit.metadata ->> 'migration_key' = v_key;
END;
$migration$;

COMMIT;
