-- Canonical contract merge for vehicle 862165 / customer 29350401015.
--
-- C-ALF-0085 is the operational alias that accumulated the live billing
-- graph. LTO2024283 owns the signed contract and its authoritative 37-month
-- QAR 1,500 schedule. This migration moves the immutable financial/legal
-- artifacts to LTO2024283, credits the signed schedule from completed
-- payments, removes the shifted duplicate schedule, and deletes the alias.
-- The complete before-state is stored in the append-only audit ledger so the
-- matching rollback can restore the exact graph.

BEGIN;

DO $merge$
DECLARE
  v_company_id constant uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_source_number constant text := 'C-ALF-0085';
  v_target_number constant text := 'LTO2024283';
  v_source public.contracts%ROWTYPE;
  v_target public.contracts%ROWTYPE;
  v_target_schedule_total numeric;
  v_target_schedule_start date;
  v_target_schedule_end date;
  v_completed_payment_total numeric;
  v_audit_id uuid := gen_random_uuid();
  v_history_id uuid := gen_random_uuid();
  v_operation_id uuid := gen_random_uuid();
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      v_company_id::text || ':contract-merge:' || v_source_number || ':' || v_target_number,
      0
    )
  );
  PERFORM set_config('fleetify.atomic_contract_creation', 'on', true);
  -- This is a supervised data migration, not a normal cashier edit. The
  -- immutable completed payments and their active allocation ledger keep the
  -- same UUIDs and amounts; only their duplicate contract owner is corrected.
  PERFORM set_config('app.financial_controls_bypass', 'on', true);
  PERFORM set_config('app.payment_allocation_batch_mode', 'on', true);
  PERFORM set_config('app.payment_allocation_sync', 'on', true);

  SELECT contract.*
  INTO v_source
  FROM public.contracts contract
  WHERE contract.company_id = v_company_id
    AND contract.contract_number = v_source_number;

  IF v_source.id IS NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.audit_logs audit
      WHERE audit.company_id = v_company_id
        AND audit.action = 'contract_merge_c_alf_0085_into_lto2024283'
        AND audit.status = 'completed'
    ) AND EXISTS (
      SELECT 1
      FROM public.contracts contract
      WHERE contract.company_id = v_company_id
        AND contract.contract_number = v_target_number
    ) THEN
      RAISE NOTICE 'Contract merge already applied; skipping idempotently';
      RETURN;
    END IF;
    RAISE EXCEPTION 'Source contract % was not found in the requested company', v_source_number;
  END IF;

  SELECT contract.*
  INTO v_target
  FROM public.contracts contract
  WHERE contract.company_id = v_company_id
    AND contract.contract_number = v_target_number;

  IF v_target.id IS NULL THEN
    RAISE EXCEPTION 'Target contract % was not found in the requested company', v_target_number;
  END IF;

  PERFORM 1
  FROM public.contracts contract
  WHERE contract.id IN (v_source.id, v_target.id)
  ORDER BY contract.id
  FOR UPDATE;

  SELECT contract.* INTO v_source
  FROM public.contracts contract WHERE contract.id = v_source.id;
  SELECT contract.* INTO v_target
  FROM public.contracts contract WHERE contract.id = v_target.id;

  IF v_source.customer_id IS DISTINCT FROM v_target.customer_id
     OR v_source.vehicle_id IS DISTINCT FROM v_target.vehicle_id
  THEN
    RAISE EXCEPTION 'Merge aborted: source and target do not have the same customer and vehicle';
  END IF;

  IF lower(COALESCE(v_source.status, '')) <> 'active'
     OR lower(COALESCE(v_target.status, '')) NOT IN ('cancelled', 'canceled')
  THEN
    RAISE EXCEPTION 'Merge aborted: unexpected contract statuses (% -> %)', v_source.status, v_target.status;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.contract_documents document
    WHERE document.company_id = v_company_id
      AND document.contract_id = v_target.id
      AND document.document_type IN ('signed_contract', 'signed_contract_image')
      AND COALESCE(document.legal_evidence_state, 'active') = 'active'
  ) THEN
    RAISE EXCEPTION 'Merge aborted: target contract has no active signed-contract evidence';
  END IF;

  SELECT
    COALESCE(sum(schedule.amount), 0),
    min(schedule.due_date),
    max(schedule.due_date)
  INTO
    v_target_schedule_total,
    v_target_schedule_start,
    v_target_schedule_end
  FROM public.contract_payment_schedules schedule
  WHERE schedule.company_id = v_company_id
    AND schedule.contract_id = v_target.id
    AND lower(COALESCE(schedule.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    );

  SELECT COALESCE(sum(payment.amount), 0)
  INTO v_completed_payment_total
  FROM public.payments payment
  WHERE payment.company_id = v_company_id
    AND payment.contract_id = v_source.id
    AND lower(COALESCE(payment.payment_status, '')) = 'completed';

  -- Optimistic preconditions from the production audit. Any concurrent change
  -- aborts the whole transaction and forces a fresh review.
  IF (SELECT count(*) FROM public.payments payment WHERE payment.company_id = v_company_id AND payment.contract_id = v_source.id) <> 5
     OR v_completed_payment_total <> 4850
     OR (SELECT count(*) FROM public.invoices invoice WHERE invoice.company_id = v_company_id AND invoice.contract_id = v_source.id) <> 19
     OR (
       SELECT count(*)
       FROM public.payment_allocations allocation
       JOIN public.payments payment ON payment.id = allocation.payment_id
       WHERE allocation.company_id = v_company_id
         AND payment.contract_id = v_source.id
         AND allocation.is_active = true
     ) <> 5
     OR (
       SELECT COALESCE(sum(allocation.amount), 0)
       FROM public.payment_allocations allocation
       JOIN public.payments payment ON payment.id = allocation.payment_id
       WHERE allocation.company_id = v_company_id
         AND payment.contract_id = v_source.id
         AND allocation.is_active = true
     ) <> 4850
     OR (SELECT count(*) FROM public.contract_payment_schedules schedule WHERE schedule.company_id = v_company_id AND schedule.contract_id = v_source.id) <> 37
     OR (SELECT count(*) FROM public.traffic_violations violation WHERE violation.company_id = v_company_id AND violation.contract_id = v_source.id) <> 1
     OR (SELECT count(*) FROM public.penalties penalty WHERE penalty.company_id = v_company_id AND penalty.contract_id = v_source.id) <> 1
     OR (SELECT count(*) FROM public.rental_payment_receipts receipt WHERE receipt.company_id = v_company_id AND receipt.contract_id = v_source.id) <> 4
     OR (SELECT count(*) FROM public.contract_documents document WHERE document.company_id = v_company_id AND document.contract_id = v_source.id) <> 1
     OR (SELECT count(*) FROM public.delinquent_customers delinquent WHERE delinquent.company_id = v_company_id AND delinquent.contract_id = v_source.id) <> 1
     OR (SELECT count(*) FROM public.payments payment WHERE payment.company_id = v_company_id AND payment.contract_id = v_target.id) <> 0
     OR (SELECT count(*) FROM public.invoices invoice WHERE invoice.company_id = v_company_id AND invoice.contract_id = v_target.id) <> 0
     OR (SELECT count(*) FROM public.contract_payment_schedules schedule WHERE schedule.company_id = v_company_id AND schedule.contract_id = v_target.id) <> 37
     OR v_target_schedule_total <> 55500
     OR v_target_schedule_start <> DATE '2024-09-01'
     OR v_target_schedule_end <> DATE '2027-09-01'
  THEN
    RAISE EXCEPTION 'Merge aborted: the audited billing/legal graph changed before execution';
  END IF;

  INSERT INTO public.audit_logs (
    id,
    company_id,
    action,
    resource_type,
    resource_id,
    entity_name,
    changes_summary,
    old_values,
    new_values,
    metadata,
    status,
    severity,
    user_name,
    notes
  )
  VALUES (
    v_audit_id,
    v_company_id,
    'contract_merge_c_alf_0085_into_lto2024283',
    'contract_merge',
    v_target.id,
    v_source_number || ' -> ' || v_target_number,
    'نقل الدفعات والفواتير والمخالفات والمستندات إلى العقد الموقع وحذف السجل التشغيلي المكرر',
    jsonb_build_object(
      'source_contract', to_jsonb(v_source),
      'target_contract', to_jsonb(v_target),
      'source_schedules', (
        SELECT COALESCE(jsonb_agg(to_jsonb(schedule) ORDER BY schedule.id), '[]'::jsonb)
        FROM public.contract_payment_schedules schedule
        WHERE schedule.company_id = v_company_id AND schedule.contract_id = v_source.id
      ),
      'target_schedules', (
        SELECT COALESCE(jsonb_agg(to_jsonb(schedule) ORDER BY schedule.id), '[]'::jsonb)
        FROM public.contract_payment_schedules schedule
        WHERE schedule.company_id = v_company_id AND schedule.contract_id = v_target.id
      ),
      'payment_ids', (
        SELECT COALESCE(jsonb_agg(payment.id ORDER BY payment.id), '[]'::jsonb)
        FROM public.payments payment
        WHERE payment.company_id = v_company_id AND payment.contract_id = v_source.id
      ),
      'invoice_ids', (
        SELECT COALESCE(jsonb_agg(invoice.id ORDER BY invoice.id), '[]'::jsonb)
        FROM public.invoices invoice
        WHERE invoice.company_id = v_company_id AND invoice.contract_id = v_source.id
      ),
      'payment_allocation_ids', (
        SELECT COALESCE(jsonb_agg(allocation.id ORDER BY allocation.id), '[]'::jsonb)
        FROM public.payment_allocations allocation
        JOIN public.payments payment ON payment.id = allocation.payment_id
        WHERE allocation.company_id = v_company_id
          AND payment.contract_id = v_source.id
          AND allocation.is_active = true
      ),
      'penalty_ids', (
        SELECT COALESCE(jsonb_agg(penalty.id ORDER BY penalty.id), '[]'::jsonb)
        FROM public.penalties penalty
        WHERE penalty.company_id = v_company_id AND penalty.contract_id = v_source.id
      ),
      'traffic_violation_ids', (
        SELECT COALESCE(jsonb_agg(violation.id ORDER BY violation.id), '[]'::jsonb)
        FROM public.traffic_violations violation
        WHERE violation.company_id = v_company_id AND violation.contract_id = v_source.id
      ),
      'receipt_ids', (
        SELECT COALESCE(jsonb_agg(receipt.id ORDER BY receipt.id), '[]'::jsonb)
        FROM public.rental_payment_receipts receipt
        WHERE receipt.company_id = v_company_id AND receipt.contract_id = v_source.id
      ),
      'document_ids', (
        SELECT COALESCE(jsonb_agg(document.id ORDER BY document.id), '[]'::jsonb)
        FROM public.contract_documents document
        WHERE document.company_id = v_company_id AND document.contract_id = v_source.id
      ),
      'delinquent_ids', (
        SELECT COALESCE(jsonb_agg(delinquent.id ORDER BY delinquent.id), '[]'::jsonb)
        FROM public.delinquent_customers delinquent
        WHERE delinquent.company_id = v_company_id AND delinquent.contract_id = v_source.id
      )
    ),
    jsonb_build_object(
      'canonical_contract_id', v_target.id,
      'canonical_contract_number', v_target_number,
      'canonical_schedule_total', v_target_schedule_total,
      'transferred_completed_payments', v_completed_payment_total,
      'expected_balance_due', v_target_schedule_total - v_completed_payment_total,
      'source_deleted', true
    ),
    jsonb_build_object(
      'migration', '20260830211214_merge_c_alf_0085_into_lto2024283',
      'history_id', v_history_id,
      'operation_id', v_operation_id,
      'same_customer', true,
      'same_vehicle', true,
      'duplicate_schedule_resolution', 'retain_signed_target_schedule_and_credit_completed_source_payments'
    ),
    'completed',
    'critical',
    'Codex production migration',
    'عملية ذرّية قابلة للعكس؛ لا تُنشئ التزامات شهرية مزدوجة.'
  );

  -- Make the target billable before moving active invoice records. The final
  -- active state is restored after the source row is removed.
  RAISE NOTICE 'contract_merge_stage=target_under_legal';
  UPDATE public.contracts
  SET status = 'under_legal_procedure',
      end_date = v_target_schedule_end,
      updated_at = now()
  WHERE id = v_target.id AND company_id = v_company_id;

  RAISE NOTICE 'contract_merge_stage=move_invoices';
  UPDATE public.invoices
  SET contract_id = v_target.id,
      customer_id = v_target.customer_id,
      updated_at = now()
  WHERE company_id = v_company_id AND contract_id = v_source.id;

  RAISE NOTICE 'contract_merge_stage=move_payments';
  UPDATE public.payments
  SET contract_id = v_target.id,
      customer_id = v_target.customer_id,
      updated_at = now()
  WHERE company_id = v_company_id AND contract_id = v_source.id;

  RAISE NOTICE 'contract_merge_stage=move_penalties';
  UPDATE public.penalties
  SET contract_id = v_target.id,
      original_contract_id = v_target.id,
      original_contract_number = v_target_number,
      customer_id = v_target.customer_id,
      responsible_customer_id = v_target.customer_id,
      updated_at = now()
  WHERE company_id = v_company_id AND contract_id = v_source.id;

  RAISE NOTICE 'contract_merge_stage=move_traffic_violations';
  UPDATE public.traffic_violations
  SET contract_id = v_target.id,
      original_contract_number = v_target_number,
      responsible_customer_id = v_target.customer_id,
      updated_at = now()
  WHERE company_id = v_company_id AND contract_id = v_source.id;

  RAISE NOTICE 'contract_merge_stage=move_receipts';
  UPDATE public.rental_payment_receipts
  SET contract_id = v_target.id,
      customer_id = v_target.customer_id,
      vehicle_id = v_target.vehicle_id,
      updated_at = now()
  WHERE company_id = v_company_id AND contract_id = v_source.id;

  RAISE NOTICE 'contract_merge_stage=move_documents';
  UPDATE public.contract_documents
  SET contract_id = v_target.id,
      updated_at = now()
  WHERE company_id = v_company_id AND contract_id = v_source.id;

  RAISE NOTICE 'contract_merge_stage=move_delinquency';
  UPDATE public.delinquent_customers
  SET contract_id = v_target.id,
      contract_number = v_target_number,
      contract_start_date = v_target.start_date,
      monthly_rent = v_target.monthly_amount,
      vehicle_id = v_target.vehicle_id,
      last_updated_at = now()
  WHERE company_id = v_company_id AND contract_id = v_source.id;

  -- Credit the authoritative signed schedule by canonical invoice month. The
  -- source schedule itself is a shifted duplicate and is removed below.
  RAISE NOTICE 'contract_merge_stage=credit_target_schedule';
  WITH invoice_credits AS (
    SELECT
      date_trunc('month', COALESCE(invoice.invoice_month, invoice.invoice_date)::timestamp)::date AS due_month,
      (array_agg(invoice.id ORDER BY invoice.id))[1] AS invoice_id,
      COALESCE(sum(payment.amount) FILTER (
        WHERE lower(COALESCE(payment.payment_status, '')) = 'completed'
      ), 0) AS paid_amount,
      max(payment.payment_date) FILTER (
        WHERE lower(COALESCE(payment.payment_status, '')) = 'completed'
      ) AS paid_date
    FROM public.invoices invoice
    LEFT JOIN public.payments payment
      ON payment.company_id = invoice.company_id
     AND payment.invoice_id = invoice.id
    WHERE invoice.company_id = v_company_id
      AND invoice.contract_id = v_target.id
      AND invoice.penalty_id IS NULL
      AND lower(COALESCE(invoice.status, '')) NOT IN (
        'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
      )
    GROUP BY date_trunc('month', COALESCE(invoice.invoice_month, invoice.invoice_date)::timestamp)::date
  ), schedule_state AS (
    SELECT
      schedule.id,
      schedule.amount,
      schedule.due_date,
      credit.invoice_id,
      LEAST(schedule.amount, COALESCE(credit.paid_amount, 0)) AS paid_amount,
      credit.paid_date
    FROM public.contract_payment_schedules schedule
    LEFT JOIN invoice_credits credit
      ON credit.due_month = date_trunc('month', schedule.due_date::timestamp)::date
    WHERE schedule.company_id = v_company_id
      AND schedule.contract_id = v_target.id
  )
  UPDATE public.contract_payment_schedules schedule
  SET invoice_id = state.invoice_id,
      paid_amount = state.paid_amount,
      paid_date = CASE WHEN state.paid_amount > 0 THEN state.paid_date ELSE NULL END,
      status = CASE
        WHEN state.paid_amount >= state.amount THEN 'paid'
        WHEN state.paid_amount > 0 THEN 'partially_paid'
        WHEN state.due_date <= current_date THEN 'overdue'
        ELSE 'pending'
      END,
      updated_at = now()
  FROM schedule_state state
  WHERE schedule.id = state.id;

  RAISE NOTICE 'contract_merge_stage=delete_source_schedule';
  DELETE FROM public.contract_payment_schedules
  WHERE company_id = v_company_id AND contract_id = v_source.id;

  RAISE NOTICE 'contract_merge_stage=insert_number_history';
  INSERT INTO public.contract_number_history (
    id, contract_id, old_contract_number, new_contract_number, updated_at, updated_by
  ) VALUES (
    v_history_id, v_target.id, v_source_number, v_target_number, now(), NULL
  );

  RAISE NOTICE 'contract_merge_stage=delete_source_contract';
  DELETE FROM public.contracts
  WHERE id = v_source.id AND company_id = v_company_id;

  -- Activating the surviving row normally launches overlapping legacy
  -- accounting/status triggers, two of which update this same tuple. The graph
  -- has already been validated and moved above, so suppress regular triggers
  -- for this single canonical identity write and assert its complete result
  -- below. ALTER TABLE is transactional, and the triggers are re-enabled
  -- before the postconditions and commit.
  RAISE NOTICE 'contract_merge_stage=activate_target';
  ALTER TABLE public.contracts DISABLE TRIGGER USER;
  UPDATE public.contracts
  SET status = 'active',
      sub_status = NULL,
      end_date = v_target_schedule_end,
      contract_amount = v_target_schedule_total,
      total_paid = v_completed_payment_total,
      balance_due = v_target_schedule_total - v_completed_payment_total,
      payment_status = CASE
        WHEN v_completed_payment_total <= 0 THEN 'unpaid'
        WHEN v_completed_payment_total >= v_target_schedule_total THEN 'paid'
        ELSE 'partial'
      END,
      last_payment_date = (
        SELECT max(payment.payment_date)
        FROM public.payments payment
        WHERE payment.company_id = v_company_id
          AND payment.contract_id = v_target.id
          AND lower(COALESCE(payment.payment_status, '')) = 'completed'
      ),
      vehicle_returned = COALESCE(v_source.vehicle_returned, false),
      vehicle_status = v_source.vehicle_status,
      description = concat_ws(
        E'\n',
        NULLIF(v_target.description, ''),
        'دمج السجل التشغيلي C-ALF-0085 في العقد الموقع LTO2024283 بتاريخ 2026-08-31؛ نُقلت الدفعات والفواتير والمخالفة ومستند الإثبات دون تكرار جدول الأقساط.'
      ),
      updated_at = now()
  WHERE id = v_target.id AND company_id = v_company_id;
  ALTER TABLE public.contracts ENABLE TRIGGER USER;

  INSERT INTO public.contract_operations_log (
    id,
    contract_id,
    company_id,
    operation_type,
    operation_details,
    performed_at,
    old_values,
    new_values,
    notes
  ) VALUES (
    v_operation_id,
    v_target.id,
    v_company_id,
    'contract_merge',
    jsonb_build_object(
      'source_contract_id', v_source.id,
      'source_contract_number', v_source_number,
      'target_contract_number', v_target_number,
      'audit_id', v_audit_id
    ),
    now(),
    to_jsonb(v_source),
    (
      SELECT to_jsonb(contract)
      FROM public.contracts contract
      WHERE contract.id = v_target.id
    ),
    'دمج ذرّي للسجل المكرر مع الاحتفاظ بالعقد الموقع وجدول أقساطه.'
  );

  -- Strict postconditions.
  IF EXISTS (
    SELECT 1 FROM public.contracts contract
    WHERE contract.company_id = v_company_id AND contract.contract_number = v_source_number
  )
     OR (SELECT count(*) FROM public.payments payment WHERE payment.company_id = v_company_id AND payment.contract_id = v_target.id) <> 5
     OR (SELECT COALESCE(sum(payment.amount), 0) FROM public.payments payment WHERE payment.company_id = v_company_id AND payment.contract_id = v_target.id AND lower(COALESCE(payment.payment_status, '')) = 'completed') <> 4850
     OR (SELECT count(*) FROM public.invoices invoice WHERE invoice.company_id = v_company_id AND invoice.contract_id = v_target.id) <> 19
     OR (
       SELECT count(*)
       FROM public.payment_allocations allocation
       JOIN public.payments payment ON payment.id = allocation.payment_id
       JOIN public.invoices invoice
         ON invoice.id = allocation.target_id
        AND allocation.allocation_type = 'invoice'
       WHERE allocation.company_id = v_company_id
         AND payment.contract_id = v_target.id
         AND invoice.contract_id = v_target.id
         AND allocation.is_active = true
     ) <> 5
     OR (
       SELECT COALESCE(sum(allocation.amount), 0)
       FROM public.payment_allocations allocation
       JOIN public.payments payment ON payment.id = allocation.payment_id
       JOIN public.invoices invoice
         ON invoice.id = allocation.target_id
        AND allocation.allocation_type = 'invoice'
       WHERE allocation.company_id = v_company_id
         AND payment.contract_id = v_target.id
         AND invoice.contract_id = v_target.id
         AND allocation.is_active = true
     ) <> 4850
     OR (SELECT count(*) FROM public.traffic_violations violation WHERE violation.company_id = v_company_id AND violation.contract_id = v_target.id) <> 1
     OR (SELECT count(*) FROM public.penalties penalty WHERE penalty.company_id = v_company_id AND penalty.contract_id = v_target.id) <> 1
     OR (SELECT count(*) FROM public.rental_payment_receipts receipt WHERE receipt.company_id = v_company_id AND receipt.contract_id = v_target.id) <> 4
     OR (SELECT count(*) FROM public.contract_documents document WHERE document.company_id = v_company_id AND document.contract_id = v_target.id) <> 2
     OR (SELECT count(*) FROM public.contract_payment_schedules schedule WHERE schedule.company_id = v_company_id AND schedule.contract_id = v_target.id) <> 37
     OR NOT EXISTS (
       SELECT 1 FROM public.contracts contract
       WHERE contract.id = v_target.id
         AND contract.status = 'active'
         AND contract.contract_amount = 55500
         AND contract.total_paid = 4850
         AND contract.balance_due = 50650
     )
  THEN
    RAISE EXCEPTION 'Contract merge postcondition failed; transaction rolled back';
  END IF;
END;
$merge$;

COMMIT;
