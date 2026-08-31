-- Correct the operational and financial history for vehicle 7038.
--
-- Approved business truth:
--   * Mahdi Mohammed Al-Qatari rents vehicle 7038 from 2026-01-01 through
--     2028-06-01 for QAR 1,600 per month (30 installments / QAR 48,000).
--   * Thamer Mohammed Al-Sayed is billable only through 2025-12-31 and is
--     transferred to legal affairs for QAR 17,240.
--   * HIST-XLS-T77-7038 was an erroneous recovery placeholder. Its immutable
--     row is corrected in place so that valid 2026 receipts and their posted
--     accounting history are preserved, while the wrong identifier disappears.

BEGIN;

DO $repair$
DECLARE
  v_company_id constant uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_vehicle_id constant uuid := 'f27ffd71-a8fa-4127-9501-a6220e4749c8';
  v_thamer_customer_id constant uuid := '508f6e9f-1df5-4c98-b9c9-2afc6e3e0e7f';
  v_mahdi_customer_id constant uuid := 'bce84d00-5b27-4bca-a071-6f19d2b07590';
  v_thamer_contract_id constant uuid := 'b88a2ae9-b579-4b32-9f88-ec525d528642';
  v_mahdi_contract_id constant uuid := '6dbc94e2-b900-4052-aa0a-a2b29a7179a0';
  v_legal_case_id constant uuid := '4013611e-eaaa-460e-800f-9b67932f9f21';
  v_actor_id constant uuid := '2a2b3a8a-35dd-4251-a8ba-09f70538c920';
  v_new_contract_number constant text := 'CNT-26-7038';
  v_cutoff_date constant date := DATE '2025-12-31';
  v_mahdi_start constant date := DATE '2026-01-01';
  v_mahdi_end constant date := DATE '2028-06-01';
  v_thamer_claim constant numeric := 17240;
  v_result jsonb;
  v_payment_id uuid;
  v_invoice_id uuid;
  v_snapshot jsonb;
  v_phase text := 'preconditions';
  v_previous_vehicle_identity_repair text := COALESCE(
    current_setting('fleetify.vehicle_identity_repair', true),
    ''
  );
  v_thamer_duplicate_payment_ids constant uuid[] := ARRAY[
    'ce30a419-c495-4336-bcee-b1f1fe7cc5d7',
    '9af0ca0f-ab60-4796-85d0-16edd887ee5f',
    'ee98a972-edc0-4113-b6cf-b05287638cb2',
    'a158001c-0122-4263-bfff-fd69f826c725',
    '6a5e6cc7-5112-4cbf-8422-de18109458a5',
    'dd053820-3797-4a09-9155-f336a2cc2ad2',
    '4ff75e26-4aa2-4642-a0d2-11657e55b756',
    '695e0943-a0ee-4982-967e-e97055113b7d',
    'a9c8f61e-729f-4627-ace3-74d8ebb423aa',
    '6f8f2a82-5ac5-4942-919d-794897f9ed5d',
    '098026e6-ba24-4477-aad3-eebd577f6df4'
  ]::uuid[];
  v_mahdi_receipts_on_thamer_ids constant uuid[] := ARRAY[
    '58615bc6-e040-477c-b657-1cf765f9124c',
    '6afd6674-0159-4f65-90b2-00a716490c4a',
    '51097d28-4575-437f-b617-3e5058cd7c83',
    'a400fb94-3ce7-4d35-85b9-123be1e95cd4',
    '3c23845f-ab2f-4b44-b289-ad1beebfa0ce'
  ]::uuid[];
  v_duplicate_receipts_on_mahdi_ids constant uuid[] := ARRAY[
    'aad2320f-c908-4b39-bebe-bb739783ec77',
    'ca3937b1-86f0-4ba6-b0da-5c757e77b3b1',
    '8c9868b5-7991-440e-8843-67de268c947d',
    '6df5b545-77fc-4174-a28e-0796dce045b9',
    'f0f21e8e-ce58-4b15-afab-accaf1f912e5',
    'd58c4322-8a47-479d-9953-e4900f8a5155',
    'ddbea47a-5486-4009-a4e5-9a3df3c38cc4',
    '1bd9fa96-aa45-4894-a7a1-c7b5ce573b73',
    '0c743bb9-b5f5-4f68-9c26-98b58c8a5082',
    '30e1c96b-1fde-49dd-a9fe-1e1a6cef026d',
    '04bab06f-41ac-4716-974c-3e6467e717ce'
  ]::uuid[];
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_company_id::text || ':vehicle-7038-contract-correction', 0)
  );

  -- The canonical cancellation functions authorize service-role migration
  -- sessions and keep payments, allocations, invoices, journals, and audit
  -- rows synchronized atomically.
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  PERFORM set_config('fleetify.atomic_contract_creation', 'on', true);
  -- Production has several verbose accounting triggers. Keep the deployment
  -- output focused on the exact failing phase while retaining all exceptions.
  PERFORM set_config('client_min_messages', 'warning', true);

  IF NOT EXISTS (
    SELECT 1
    FROM public.vehicles vehicle
    WHERE vehicle.id = v_vehicle_id
      AND vehicle.company_id = v_company_id
      AND public.normalize_vehicle_plate(vehicle.plate_number) = '7038'
  ) THEN
    RAISE EXCEPTION 'Precondition failed: vehicle 7038 was not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.contracts contract
    WHERE contract.id = v_thamer_contract_id
      AND contract.company_id = v_company_id
      AND contract.customer_id = v_thamer_customer_id
      AND contract.vehicle_id = v_vehicle_id
      AND contract.contract_number = 'C-ALF-0048'
      AND contract.status = 'active'
      AND contract.start_date = DATE '2024-03-02'
      AND contract.end_date = DATE '2026-12-31'
      AND contract.monthly_amount = 2100
  ) THEN
    RAISE EXCEPTION 'Precondition failed: the expected active Thamer contract was not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.contracts contract
    WHERE contract.id = v_mahdi_contract_id
      AND contract.company_id = v_company_id
      AND contract.customer_id = v_mahdi_customer_id
      AND contract.vehicle_id = v_vehicle_id
      AND contract.contract_number = 'HIST-XLS-T77-7038'
      AND contract.status = 'cancelled'
      AND contract.start_date = v_mahdi_start
      AND contract.monthly_amount = 1600
  ) THEN
    RAISE EXCEPTION 'Precondition failed: the expected Mahdi recovery placeholder was not found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.contracts contract
    WHERE contract.company_id = v_company_id
      AND contract.contract_number = v_new_contract_number
      AND contract.id <> v_mahdi_contract_id
  ) THEN
    RAISE EXCEPTION 'Precondition failed: contract number % already exists', v_new_contract_number;
  END IF;

  IF (
    SELECT count(*) FROM public.payments payment
    WHERE payment.id = ANY(v_thamer_duplicate_payment_ids)
      AND payment.company_id = v_company_id
      AND payment.contract_id = v_thamer_contract_id
      AND lower(payment.payment_status) = 'completed'
  ) <> 11 OR (
    SELECT COALESCE(sum(payment.amount), 0) FROM public.payments payment
    WHERE payment.id = ANY(v_thamer_duplicate_payment_ids)
      AND payment.company_id = v_company_id
      AND lower(payment.payment_status) = 'completed'
  ) <> 8360 THEN
    RAISE EXCEPTION 'Precondition failed: the QAR 8,360 Thamer duplicate set drifted';
  END IF;

  IF (
    SELECT count(*) FROM public.payments payment
    WHERE payment.id = ANY(v_mahdi_receipts_on_thamer_ids)
      AND payment.company_id = v_company_id
      AND payment.contract_id = v_thamer_contract_id
      AND lower(payment.payment_status) = 'completed'
  ) <> 5 OR (
    SELECT COALESCE(sum(payment.amount), 0) FROM public.payments payment
    WHERE payment.id = ANY(v_mahdi_receipts_on_thamer_ids)
      AND payment.company_id = v_company_id
      AND lower(payment.payment_status) = 'completed'
  ) <> 6300 THEN
    RAISE EXCEPTION 'Precondition failed: the QAR 6,300 Mahdi-on-Thamer receipt set drifted';
  END IF;

  IF (
    SELECT count(*) FROM public.payments payment
    WHERE payment.id = ANY(v_duplicate_receipts_on_mahdi_ids)
      AND payment.company_id = v_company_id
      AND payment.contract_id = v_mahdi_contract_id
      AND lower(payment.payment_status) = 'completed'
  ) <> 11 OR (
    SELECT COALESCE(sum(payment.amount), 0) FROM public.payments payment
    WHERE payment.id = ANY(v_duplicate_receipts_on_mahdi_ids)
      AND payment.company_id = v_company_id
      AND lower(payment.payment_status) = 'completed'
  ) <> 9360 THEN
    RAISE EXCEPTION 'Precondition failed: the QAR 9,360 Mahdi duplicate set drifted';
  END IF;

  IF (
    SELECT count(*)
    FROM public.invoices invoice
    WHERE invoice.company_id = v_company_id
      AND invoice.contract_id = v_thamer_contract_id
      AND invoice.invoice_type = 'sales'
      AND invoice.invoice_month BETWEEN DATE '2026-01-01' AND DATE '2026-12-01'
      AND lower(invoice.status) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
  ) <> 12 OR (
    SELECT COALESCE(sum(invoice.total_amount), 0)
    FROM public.invoices invoice
    WHERE invoice.company_id = v_company_id
      AND invoice.contract_id = v_thamer_contract_id
      AND invoice.invoice_type = 'sales'
      AND invoice.invoice_month BETWEEN DATE '2026-01-01' AND DATE '2026-12-01'
      AND lower(invoice.status) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
  ) <> 25200 THEN
    RAISE EXCEPTION 'Precondition failed: the twelve post-cutoff Thamer invoices drifted';
  END IF;

  IF (
    SELECT count(*) FROM public.penalties penalty
    WHERE penalty.company_id = v_company_id
      AND penalty.contract_id = v_thamer_contract_id
      AND penalty.customer_id = v_thamer_customer_id
  ) <> 9 OR (
    SELECT COALESCE(sum(penalty.amount), 0) FROM public.penalties penalty
    WHERE penalty.company_id = v_company_id
      AND penalty.contract_id = v_thamer_contract_id
      AND penalty.customer_id = v_thamer_customer_id
  ) <> 3900 THEN
    RAISE EXCEPTION 'Precondition failed: the verified QAR 3,900 penalty set drifted';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.penalties penalty
    JOIN public.invoices invoice ON invoice.penalty_id = penalty.id
    WHERE penalty.id = '99f7c241-1fec-464d-8260-184646520cae'
      AND penalty.company_id = v_company_id
      AND penalty.vehicle_id = v_vehicle_id
      AND penalty.penalty_date = DATE '2024-02-26'
      AND penalty.amount = 100
      AND penalty.contract_id IS NULL
      AND penalty.customer_id IS NULL
      AND invoice.id = '8fd8402e-af42-4436-8518-da22b58f7d37'
      AND invoice.company_id = v_company_id
      AND invoice.contract_id = v_thamer_contract_id
      AND invoice.customer_id = v_thamer_customer_id
      AND invoice.total_amount = 100
  ) THEN
    RAISE EXCEPTION 'Precondition failed: the unassigned QAR 100 Thamer penalty/invoice pair was not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.late_fees fee
    WHERE fee.id = '75025f41-63fe-446e-865e-28597080c0cf'
      AND fee.company_id = v_company_id
      AND fee.contract_id = v_thamer_contract_id
      AND fee.invoice_id = '1dce95b4-2633-4bf8-93e7-66fe174ae0d3'
      AND fee.fee_amount = 360
      AND fee.status = 'applied'
  ) THEN
    RAISE EXCEPTION 'Precondition failed: the post-cutoff QAR 360 late fee was not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.legal_cases legal_case
    WHERE legal_case.id = v_legal_case_id
      AND legal_case.company_id = v_company_id
      AND legal_case.contract_id = v_thamer_contract_id
      AND legal_case.workflow_stage = 'cancelled'
  ) THEN
    RAISE EXCEPTION 'Precondition failed: the cancelled Thamer legal case was not found';
  END IF;

  IF (
    SELECT count(*)
    FROM public.invoices invoice
    WHERE invoice.company_id = v_company_id
      AND invoice.contract_id = v_mahdi_contract_id
      AND invoice.invoice_type = 'sales'
      AND invoice.invoice_month BETWEEN DATE '2026-01-01' AND DATE '2026-06-01'
      AND lower(invoice.status) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
  ) <> 6 OR (
    SELECT COALESCE(sum(invoice.total_amount), 0)
    FROM public.invoices invoice
    WHERE invoice.company_id = v_company_id
      AND invoice.contract_id = v_mahdi_contract_id
      AND invoice.invoice_type = 'sales'
      AND invoice.invoice_month BETWEEN DATE '2026-01-01' AND DATE '2026-06-01'
      AND lower(invoice.status) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
  ) <> 9600 THEN
    RAISE EXCEPTION 'Precondition failed: the six valid Mahdi invoices drifted';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.invoices invoice
    LEFT JOIN public.journal_entries journal
      ON journal.id = invoice.journal_entry_id
     AND journal.company_id = invoice.company_id
     AND journal.reference_type = 'invoice'
     AND journal.reference_id = invoice.id
    LEFT JOIN LATERAL (
      SELECT count(*) AS line_count,
             COALESCE(sum(line.debit_amount), 0) AS debit,
             COALESCE(sum(line.credit_amount), 0) AS credit
      FROM public.journal_entry_lines line
      WHERE line.journal_entry_id = journal.id
    ) totals ON true
    WHERE invoice.company_id = v_company_id
      AND invoice.contract_id = v_mahdi_contract_id
      AND invoice.invoice_type = 'sales'
      AND invoice.invoice_month BETWEEN DATE '2026-01-01' AND DATE '2026-06-01'
      AND lower(invoice.status) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
      AND (
        journal.id IS NULL
        OR lower(COALESCE(journal.status, '')) NOT IN ('draft', 'posted')
        OR totals.line_count < 2
        OR totals.debit <= 0
        OR abs(totals.debit - totals.credit) > 0.01
        OR abs(journal.total_debit - totals.debit) > 0.01
        OR abs(journal.total_credit - totals.credit) > 0.01
        OR abs(journal.total_debit - invoice.total_amount) > 0.01
      )
  ) THEN
    RAISE EXCEPTION 'Precondition failed: a valid Mahdi invoice has an invalid accounting journal';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.invoices invoice
    LEFT JOIN LATERAL (
      SELECT count(*) AS journal_count,
             count(*) FILTER (
               WHERE lower(COALESCE(journal.status, '')) = 'posted'
             ) AS posted_count,
             count(*) FILTER (
               WHERE lower(COALESCE(journal.status, '')) = 'draft'
             ) AS draft_count,
             bool_and(
               totals.line_count >= 2
               AND totals.debit > 0
               AND abs(totals.debit - totals.credit) <= 0.01
               AND abs(journal.total_debit - totals.debit) <= 0.01
               AND abs(journal.total_credit - totals.credit) <= 0.01
               AND abs(journal.total_debit - invoice.total_amount) <= 0.01
             ) AS all_balanced
      FROM public.journal_entries journal
      LEFT JOIN LATERAL (
        SELECT count(*) AS line_count,
               COALESCE(sum(line.debit_amount), 0) AS debit,
               COALESCE(sum(line.credit_amount), 0) AS credit
        FROM public.journal_entry_lines line
        WHERE line.journal_entry_id = journal.id
      ) totals ON true
      WHERE journal.company_id = invoice.company_id
        AND journal.reference_type = 'invoice'
        AND journal.reference_id = invoice.id
    ) journal_set ON true
    WHERE invoice.company_id = v_company_id
      AND invoice.contract_id = v_mahdi_contract_id
      AND invoice.invoice_type = 'sales'
      AND invoice.invoice_month BETWEEN DATE '2026-01-01' AND DATE '2026-06-01'
      AND lower(invoice.status) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
      AND (
        journal_set.posted_count <> 1
        OR journal_set.journal_count NOT IN (1, 2)
        OR journal_set.draft_count <> journal_set.journal_count - 1
        OR COALESCE(journal_set.all_balanced, false) IS NOT TRUE
      )
  ) THEN
    RAISE EXCEPTION 'Precondition failed: Mahdi invoice journals are not one canonical posted journal plus at most one draft duplicate';
  END IF;

  -- Retire two deployed legacy triggers that contradict the canonical audited
  -- paths used below. The first hard-deletes an invoice during a status update,
  -- breaking payment history and payments_invoice_id_fkey. The second creates
  -- schedules from start+1 month and conflicts with the hardened start-month
  -- billing graph used by this contract.
  --
  -- The canonical cancellation RPC persists payment_status='cancelled'. The
  -- deployed legacy check only accepts unpaid/partial/paid, so it rejects the
  -- canonical operation after the hard-delete trigger is removed. Align the
  -- database constraint with the audited lifecycle before cancelling invoices.
  EXECUTE 'ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_payment_status_check';
  EXECUTE $ddl$
    ALTER TABLE public.invoices
    ADD CONSTRAINT invoices_payment_status_check
    CHECK (payment_status = ANY (ARRAY['unpaid'::text, 'partial'::text, 'paid'::text, 'cancelled'::text]))
    NOT VALID
  $ddl$;
  EXECUTE 'ALTER TABLE public.invoices VALIDATE CONSTRAINT invoices_payment_status_check';
  EXECUTE 'DROP TRIGGER IF EXISTS trigger_auto_delete_cancelled_invoice ON public.invoices';
  EXECUTE 'DROP TRIGGER IF EXISTS trigger_create_payment_schedules ON public.contracts';

  v_phase := 'capture_pre_repair_snapshot';
  SELECT jsonb_build_object(
    'thamer_contract', (SELECT to_jsonb(contract) FROM public.contracts contract WHERE contract.id = v_thamer_contract_id),
    'mahdi_contract', (SELECT to_jsonb(contract) FROM public.contracts contract WHERE contract.id = v_mahdi_contract_id),
    'legal_case', (SELECT to_jsonb(legal_case) FROM public.legal_cases legal_case WHERE legal_case.id = v_legal_case_id),
    'vehicle', (SELECT to_jsonb(vehicle) FROM public.vehicles vehicle WHERE vehicle.id = v_vehicle_id),
    'customer_balances', COALESCE((
      SELECT jsonb_agg(to_jsonb(balance) ORDER BY balance.customer_id)
      FROM public.customer_balances balance
      WHERE balance.company_id = v_company_id
        AND balance.customer_id IN (v_thamer_customer_id, v_mahdi_customer_id)
    ), '[]'::jsonb),
    'payments_to_cancel', COALESCE((
      SELECT jsonb_agg(to_jsonb(payment) ORDER BY payment.id)
      FROM public.payments payment
      WHERE payment.id = ANY(
        v_thamer_duplicate_payment_ids
        || v_mahdi_receipts_on_thamer_ids
        || v_duplicate_receipts_on_mahdi_ids
      )
    ), '[]'::jsonb),
    'allocations_to_deactivate', COALESCE((
      SELECT jsonb_agg(to_jsonb(allocation) ORDER BY allocation.id)
      FROM public.payment_allocations allocation
      WHERE allocation.payment_id = ANY(
        v_thamer_duplicate_payment_ids
        || v_mahdi_receipts_on_thamer_ids
        || v_duplicate_receipts_on_mahdi_ids
      )
    ), '[]'::jsonb),
    'post_cutoff_invoices', COALESCE((
      SELECT jsonb_agg(to_jsonb(invoice) ORDER BY invoice.invoice_month, invoice.id)
      FROM public.invoices invoice
      WHERE invoice.company_id = v_company_id
        AND invoice.contract_id = v_thamer_contract_id
        AND (
          (invoice.invoice_type = 'sales' AND invoice.invoice_month BETWEEN DATE '2026-01-01' AND DATE '2026-12-01')
          OR invoice.id = '8fd8402e-af42-4436-8518-da22b58f7d37'
        )
    ), '[]'::jsonb),
    'late_fee', (SELECT to_jsonb(fee) FROM public.late_fees fee WHERE fee.id = '75025f41-63fe-446e-865e-28597080c0cf'),
    'mahdi_existing_invoices', COALESCE((
      SELECT jsonb_agg(to_jsonb(invoice) ORDER BY invoice.invoice_month, invoice.id)
      FROM public.invoices invoice
      WHERE invoice.company_id = v_company_id
        AND invoice.contract_id = v_mahdi_contract_id
    ), '[]'::jsonb),
    'mahdi_existing_invoice_journals', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'journal', to_jsonb(journal),
          'lines', COALESCE((
            SELECT jsonb_agg(to_jsonb(line) ORDER BY line.id)
            FROM public.journal_entry_lines line
            WHERE line.journal_entry_id = journal.id
          ), '[]'::jsonb)
        )
        ORDER BY journal.created_at, journal.id
      )
      FROM public.journal_entries journal
      JOIN public.invoices invoice
        ON invoice.company_id = journal.company_id
       AND journal.reference_type = 'invoice'
       AND journal.reference_id = invoice.id
      WHERE invoice.company_id = v_company_id
        AND invoice.contract_id = v_mahdi_contract_id
        AND invoice.invoice_month BETWEEN DATE '2026-01-01' AND DATE '2026-06-01'
    ), '[]'::jsonb)
  ) INTO v_snapshot;

  INSERT INTO public.audit_logs (
    company_id, action, resource_type, resource_id, entity_name,
    changes_summary, old_values, new_values, metadata, status, severity,
    user_name, notes
  ) VALUES (
    v_company_id,
    'plate_7038_mahdi_thamer_correction_started',
    'vehicle_contract_correction',
    v_vehicle_id,
    '7038 / C-ALF-0048 / HIST-XLS-T77-7038',
    'لقطة ذرية قبل تصحيح عقد مهدي وقطع مطالبة ثامر وتحويله للقانوني',
    v_snapshot,
    NULL,
    jsonb_build_object(
      'migration', '20260831014000_correct_plate_7038_mahdi_thamer.sql',
      'billing_cutoff', v_cutoff_date,
      'mahdi_start', v_mahdi_start,
      'mahdi_end', v_mahdi_end
    ),
    'in_progress',
    'critical',
    'Codex production repair',
    'أوقف التنفيذ تلقائياً إذا انحرفت أي قيمة عن التحقيق المعتمد.'
  );

  v_phase := 'cancel_invalid_payments';
  FOREACH v_payment_id IN ARRAY v_thamer_duplicate_payment_ids LOOP
    v_result := public.cancel_payment_with_reversal(
      v_payment_id,
      v_company_id,
      'إلغاء دفعة مكررة مثبتة بمطابقة المصدر: نسخة PBC مكررة من دفعة PAY الصحيحة لعقد ثامر 7038.',
      v_actor_id
    );
  END LOOP;

  FOREACH v_payment_id IN ARRAY v_mahdi_receipts_on_thamer_ids LOOP
    v_result := public.cancel_payment_with_reversal(
      v_payment_id,
      v_company_id,
      'إلغاء نسبة خاطئة: الدفعة تخص مهدي محمد القطاري وعقده ابتداءً من 2026-01-01 ولا تخص ثامر.',
      v_actor_id
    );
  END LOOP;

  FOREACH v_payment_id IN ARRAY v_duplicate_receipts_on_mahdi_ids LOOP
    v_result := public.cancel_payment_with_reversal(
      v_payment_id,
      v_company_id,
      'إلغاء استيراد تاريخي مكرر من سنة 2024 لا يخص عقد مهدي الذي يبدأ في 2026-01-01.',
      v_actor_id
    );
  END LOOP;

  v_phase := 'cancel_post_cutoff_thamer_invoices';
  FOR v_invoice_id IN
    SELECT invoice.id
    FROM public.invoices invoice
    WHERE invoice.company_id = v_company_id
      AND invoice.contract_id = v_thamer_contract_id
      AND invoice.invoice_type = 'sales'
      AND invoice.invoice_month BETWEEN DATE '2026-01-01' AND DATE '2026-12-01'
      AND lower(invoice.status) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
    ORDER BY invoice.invoice_month, invoice.id
  LOOP
    v_result := public.cancel_invoice_with_reversal(
      v_invoice_id,
      v_company_id,
      'قطع مطالبة ثامر عند 2025-12-31؛ تبدأ مسؤولية الإيجار الصحيحة لمهدي في 2026-01-01.'
    );
  END LOOP;

  v_phase := 'assign_verified_thamer_penalty';
  UPDATE public.penalties penalty
  SET customer_id = v_thamer_customer_id,
      contract_id = v_thamer_contract_id,
      responsible_customer_id = v_thamer_customer_id,
      original_contract_id = v_thamer_contract_id,
      original_contract_number = 'C-ALF-0048',
      responsibility_party = 'customer',
      responsibility_reason = 'المخالفة بتاريخ 2024-02-26 داخل مدة حيازة ثامر المثبتة في نسخة العقد ابتداءً من 2024-02-03، وفاتورتها مرتبطة بالعقد نفسه.',
      responsibility_decided_at = now(),
      responsibility_decided_by = v_actor_id,
      updated_at = now()
  WHERE penalty.id = '99f7c241-1fec-464d-8260-184646520cae'
    AND penalty.company_id = v_company_id;

  UPDATE public.contract_payment_schedules schedule
  SET status = 'cancelled',
      paid_amount = 0,
      paid_date = NULL,
      notes = concat_ws(
        E'\n',
        NULLIF(schedule.notes, ''),
        'Cancelled by the approved 7038 billing cutoff at 2025-12-31.'
      ),
      updated_at = now()
  WHERE schedule.company_id = v_company_id
    AND schedule.contract_id = v_thamer_contract_id
    AND schedule.due_date >= v_mahdi_start
    AND lower(schedule.status) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive');

  UPDATE public.late_fees fee
  SET status = 'cancelled',
      waive_reason = 'ألغي لأن رسم التأخير ناتج عن فاتورة يوليو 2026 الواقعة بعد نهاية مسؤولية ثامر في 2025-12-31.',
      updated_at = now()
  WHERE fee.id = '75025f41-63fe-446e-865e-28597080c0cf'
    AND fee.company_id = v_company_id;

  v_phase := 'cutoff_thamer_contract';
  UPDATE public.contracts contract
  SET contract_date = DATE '2024-02-03',
      start_date = DATE '2024-02-03',
      end_date = v_cutoff_date,
      contract_amount = 46200,
      status = 'under_legal_procedure',
      sub_status = 'legal_preparation',
      legal_status = 'under_legal_action',
      vehicle_returned = true,
      vehicle_status = NULL,
      late_fine_amount = 0,
      suspension_reason = 'نهاية مسؤولية الإيجار 2025-12-31؛ نقلت المطالبة الصحيحة إلى الشؤون القانونية.',
      description = concat_ws(
        E'\n',
        NULLIF(contract.description, ''),
        '[تصحيح 7038 - 2026-08-31] صحح بدء حيازة ثامر إلى 2024-02-03 وفق نسخة العقد. آخر يوم مطالبة إيجار 2025-12-31، ومن 2026-01-01 المركبة بعقد مهدي محمد القطاري. قيمة المطالبة القانونية 17,240 ر.ق: فواتير إيجار 46,200 + مخالفات موثقة 4,000 - دفعات صحيحة 32,960.'
      ),
      updated_at = now()
  WHERE contract.id = v_thamer_contract_id
    AND contract.company_id = v_company_id;

  PERFORM public.recalculate_contract_financial_state(v_thamer_contract_id);

  v_phase := 'reopen_thamer_legal_case';
  PERFORM public.reopen_legal_case_v1(
    v_company_id,
    v_legal_case_id,
    'preparation',
    'إعادة فتح القضية بعد تدقيق كامل لعقد المركبة 7038 وقطع إيجار ثامر في 2025-12-31 واستبعاد الدفعات والفواتير المنسوبة خطأ.',
    v_actor_id
  );

  UPDATE public.legal_cases legal_case
  SET case_value = v_thamer_claim,
      filing_date = NULL,
      outcome_type = NULL,
      outcome_amount = NULL,
      outcome_amount_type = NULL,
      payment_direction = NULL,
      outcome_date = NULL,
      outcome_notes = NULL,
      notes = concat_ws(
        E'\n',
        NULLIF(legal_case.notes, ''),
        '[تدقيق مطالبة 7038 - 2026-08-31] 46,200 ر.ق فواتير إيجار من 2024-03 حتى 2025-12 + 4,000 ر.ق مخالفات موثقة (تشمل المخالفة 1400040826 بتاريخ 2024-02-26) - 32,960 ر.ق دفعات صحيحة = 17,240 ر.ق. ملف العقد الحالي مطابق لهوية ثامر والمركبة لكنه محجور ولا يظهر عليه توقيع؛ يمنع رفع الدعوى حتى رفع نسخة موقعة واجتياز التحقق.'
      ),
      updated_at = now()
  WHERE legal_case.id = v_legal_case_id
    AND legal_case.company_id = v_company_id;

  INSERT INTO public.legal_case_activities (
    case_id, company_id, activity_type, activity_title,
    activity_description, old_values, new_values, created_by
  ) VALUES (
    v_legal_case_id,
    v_company_id,
    'claim_recalculated',
    'اعتماد مطالبة ثامر حتى نهاية 2025',
    'تم قطع الإيجار في 2025-12-31، وربط المخالفة 1400040826 ضمن مدة الحيازة، واستبعاد الدفعات المكررة والمنسوبة لمهدي. الرفع محجوب حتى وصول نسخة عقد موقعة صالحة.',
    jsonb_build_object('previous_case_value', 51860),
    jsonb_build_object(
      'rent_through_2025_12_31', 46200,
      'verified_penalties', 4000,
      'valid_payments', 32960,
      'claim_value', v_thamer_claim,
      'signed_contract_evidence_ready', false
    ),
    v_actor_id
  );

  v_phase := 'correct_mahdi_contract';
  -- The ten unpaid penalties remain assigned to Thamer and his legal claim.
  -- The rental guard provides this postgres-only, transaction-local path for
  -- audited historical identity repairs so an old renter's debt does not
  -- prevent correction of the verified successor contract.
  PERFORM set_config('fleetify.vehicle_identity_repair', 'on', true);
  UPDATE public.contracts contract
  SET contract_number = v_new_contract_number,
      contract_date = v_mahdi_start,
      start_date = v_mahdi_start,
      end_date = v_mahdi_end,
      contract_amount = 48000,
      monthly_amount = 1600,
      status = 'active',
      contract_type = 'rent_to_own',
      vehicle_returned = false,
      created_via = 'verified_fleet_contract_correction',
      legal_status = NULL,
      sub_status = NULL,
      suspension_reason = NULL,
      description = '[تصحيح معتمد 7038 - 2026-08-31] عقد مهدي محمد القطاري الصحيح من 2026-01-01 حتى 2028-06-01، 30 قسطاً شهرياً بقيمة 1,600 ر.ق وإجمالي 48,000 ر.ق. تم تصحيح سجل الاسترداد التاريخي في مكانه للحفاظ على الدفعات الصحيحة والقيود المحاسبية.',
      updated_at = now()
  WHERE contract.id = v_mahdi_contract_id
    AND contract.company_id = v_company_id;

  UPDATE public.invoices invoice
  SET invoice_number = format('INV-%s-%s', v_new_contract_number, to_char(invoice.invoice_month, 'YYYYMM')),
      notes = concat_ws(
        E'\n',
        NULLIF(invoice.notes, ''),
        'Renamed after correction of HIST-XLS-T77-7038 to ' || v_new_contract_number || '.'
      ),
      updated_at = now()
  WHERE invoice.company_id = v_company_id
    AND invoice.contract_id = v_mahdi_contract_id
    AND invoice.invoice_month BETWEEN DATE '2026-01-01' AND DATE '2026-06-01'
    AND lower(invoice.status) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted');

  v_phase := 'deduplicate_mahdi_invoice_journals';
  PERFORM set_config('app.financial_controls_bypass', 'on', true);

  UPDATE public.invoices invoice
  SET journal_entry_id = (
        SELECT journal.id
        FROM public.journal_entries journal
        WHERE journal.company_id = invoice.company_id
          AND journal.reference_type = 'invoice'
          AND journal.reference_id = invoice.id
          AND lower(journal.status) = 'posted'
        ORDER BY journal.created_at, journal.id
        LIMIT 1
      ),
      notes = concat_ws(
        E'\n',
        NULLIF(invoice.notes, ''),
        'Relinked to the single canonical posted journal; later draft duplicate retained as retired audit history.'
      ),
      updated_at = now()
  WHERE invoice.company_id = v_company_id
    AND invoice.contract_id = v_mahdi_contract_id
    AND invoice.invoice_type = 'sales'
    AND invoice.invoice_month BETWEEN DATE '2026-01-01' AND DATE '2026-06-01'
    AND lower(invoice.status) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted');

  UPDATE public.journal_entries journal
  SET reference_type = 'retired_duplicate_invoice_journal',
      workflow_notes = concat_ws(
        E'\n',
        NULLIF(journal.workflow_notes, ''),
        'Retired unposted duplicate during verified plate 7038 correction; original invoice remains in reference_id.'
      ),
      updated_by = v_actor_id,
      updated_at = now()
  FROM public.invoices invoice
  WHERE invoice.company_id = v_company_id
    AND invoice.contract_id = v_mahdi_contract_id
    AND invoice.invoice_type = 'sales'
    AND invoice.invoice_month BETWEEN DATE '2026-01-01' AND DATE '2026-06-01'
    AND journal.company_id = invoice.company_id
    AND journal.reference_type = 'invoice'
    AND journal.reference_id = invoice.id
    AND lower(journal.status) = 'draft';

  v_phase := 'generate_mahdi_billing_graph';
  v_result := public.generate_payment_schedules_for_contract(v_mahdi_contract_id, false);
  PERFORM public.generate_invoices_from_payment_schedule(v_mahdi_contract_id);
  PERFORM public.recalculate_contract_financial_state(v_mahdi_contract_id);
  PERFORM set_config(
    'fleetify.vehicle_identity_repair',
    v_previous_vehicle_identity_repair,
    true
  );

  v_phase := 'set_vehicle_and_assignment_state';
  UPDATE public.fleet_reconciliation_assignments assignment
  SET supporting_contract_id = v_mahdi_contract_id,
      is_active = false,
      closed_at = now(),
      closed_reason = 'superseded_by_verified_contract:' || v_new_contract_number
  WHERE assignment.company_id = v_company_id
    AND assignment.vehicle_id = v_vehicle_id
    AND assignment.is_active;

  UPDATE public.vehicles vehicle
  SET status = 'rented'::public.vehicle_status,
      location = NULL,
      notes = concat_ws(
        E'\n',
        NULLIF(vehicle.notes, ''),
        '[تصحيح 7038 - 2026-08-31] العقد التشغيلي الحالي ' || v_new_contract_number || ' لمهدي محمد القطاري من 2026-01-01 حتى 2028-06-01.'
      ),
      updated_at = now()
  WHERE vehicle.id = v_vehicle_id
    AND vehicle.company_id = v_company_id;

  v_phase := 'refresh_customer_and_delinquency_summaries';
  -- Refresh both summaries from active invoices and completed receipts. Invoice
  -- balances already include canonical allocation/direct-payment effects, so
  -- receipts must not be subtracted a second time.
  UPDATE public.customer_balances balance
  SET current_balance = derived.current_balance,
      overdue_amount = derived.overdue_amount,
      days_overdue = derived.days_overdue,
      last_payment_date = derived.last_payment_date,
      last_payment_amount = derived.last_payment_amount,
      updated_at = now()
  FROM (
    SELECT customer.id AS customer_id,
      COALESCE((
        SELECT sum(COALESCE(invoice.balance_due, 0))
        FROM public.invoices invoice
        WHERE invoice.company_id = v_company_id
          AND invoice.customer_id = customer.id
          AND lower(invoice.status) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
          AND lower(invoice.payment_status) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
      ), 0) AS current_balance,
      COALESCE((
        SELECT sum(COALESCE(invoice.balance_due, 0))
        FROM public.invoices invoice
        WHERE invoice.company_id = v_company_id
          AND invoice.customer_id = customer.id
          AND invoice.due_date <= CURRENT_DATE
          AND COALESCE(invoice.balance_due, 0) > 0.01
          AND lower(invoice.status) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
          AND lower(invoice.payment_status) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
      ), 0) AS overdue_amount,
      COALESCE((
        SELECT GREATEST(CURRENT_DATE - min(invoice.due_date), 0)
        FROM public.invoices invoice
        WHERE invoice.company_id = v_company_id
          AND invoice.customer_id = customer.id
          AND invoice.due_date <= CURRENT_DATE
          AND COALESCE(invoice.balance_due, 0) > 0.01
          AND lower(invoice.status) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
          AND lower(invoice.payment_status) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
      ), 0) AS days_overdue,
      last_payment.payment_date AS last_payment_date,
      last_payment.amount AS last_payment_amount
    FROM public.customers customer
    LEFT JOIN LATERAL (
      SELECT payment.payment_date, payment.amount
      FROM public.payments payment
      WHERE payment.company_id = v_company_id
        AND payment.customer_id = customer.id
        AND lower(payment.payment_status) IN ('completed', 'paid', 'success', 'succeeded')
        AND lower(COALESCE(payment.transaction_type::text, 'receipt')) = 'receipt'
      ORDER BY payment.payment_date DESC, payment.created_at DESC, payment.id DESC
      LIMIT 1
    ) last_payment ON true
    WHERE customer.company_id = v_company_id
      AND customer.id IN (v_thamer_customer_id, v_mahdi_customer_id)
  ) derived
  WHERE balance.company_id = v_company_id
    AND balance.customer_id = derived.customer_id;

  PERFORM public.update_delinquent_customers(v_company_id);

  v_phase := 'write_operation_audit';
  INSERT INTO public.contract_operations_log (
    company_id, contract_id, operation_type, operation_details,
    old_values, new_values, notes, performed_by, performed_at
  ) VALUES
  (
    v_company_id,
    v_thamer_contract_id,
    'legal_transfer_after_billing_cutoff',
    jsonb_build_object('vehicle_plate', '7038', 'cutoff', v_cutoff_date, 'case_id', v_legal_case_id),
    v_snapshot -> 'thamer_contract',
    (SELECT to_jsonb(contract) FROM public.contracts contract WHERE contract.id = v_thamer_contract_id),
    'مطالبة قانونية معتمدة بقيمة 17,240 ر.ق؛ آخر يوم إيجار 2025-12-31.',
    v_actor_id,
    now()
  ),
  (
    v_company_id,
    v_mahdi_contract_id,
    'historical_placeholder_corrected_to_verified_contract',
    jsonb_build_object('vehicle_plate', '7038', 'old_number', 'HIST-XLS-T77-7038', 'new_number', v_new_contract_number),
    v_snapshot -> 'mahdi_contract',
    (SELECT to_jsonb(contract) FROM public.contracts contract WHERE contract.id = v_mahdi_contract_id),
    'عقد مهدي الصحيح: 2026-01-01 إلى 2028-06-01، قسط 1,600 ر.ق.',
    v_actor_id,
    now()
  );

  v_phase := 'verify_postconditions';
  IF EXISTS (
    SELECT 1 FROM public.contracts contract
    WHERE contract.company_id = v_company_id
      AND contract.contract_number = 'HIST-XLS-T77-7038'
  ) THEN
    RAISE EXCEPTION 'Postcondition failed: HIST-XLS-T77-7038 still exists';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.contracts contract
    WHERE contract.id = v_mahdi_contract_id
      AND contract.contract_number = v_new_contract_number
      AND contract.customer_id = v_mahdi_customer_id
      AND contract.vehicle_id = v_vehicle_id
      AND contract.start_date = v_mahdi_start
      AND contract.end_date = v_mahdi_end
      AND contract.monthly_amount = 1600
      AND contract.contract_amount = 48000
      AND contract.status = 'active'
      AND contract.total_paid = 7900
      AND contract.balance_due = 40100
  ) THEN
    RAISE EXCEPTION 'Postcondition failed: Mahdi contract terms or totals are incorrect';
  END IF;

  IF (
    SELECT count(*) FROM public.contract_payment_schedules schedule
    WHERE schedule.company_id = v_company_id
      AND schedule.contract_id = v_mahdi_contract_id
      AND lower(schedule.status) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive')
  ) <> 30 OR (
    SELECT COALESCE(sum(schedule.amount), 0) FROM public.contract_payment_schedules schedule
    WHERE schedule.company_id = v_company_id
      AND schedule.contract_id = v_mahdi_contract_id
      AND lower(schedule.status) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive')
  ) <> 48000 THEN
    RAISE EXCEPTION 'Postcondition failed: Mahdi must have 30 active installments totaling QAR 48,000';
  END IF;

  IF (
    SELECT count(*) FROM public.invoices invoice
    WHERE invoice.company_id = v_company_id
      AND invoice.contract_id = v_mahdi_contract_id
      AND lower(COALESCE(invoice.invoice_type, '')) IN ('sales', 'service', 'rental', 'monthly')
      AND invoice.penalty_id IS NULL
      AND invoice.invoice_month BETWEEN v_mahdi_start AND v_mahdi_end
      AND abs(invoice.total_amount - 1600) <= 0.01
      AND lower(invoice.status) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
  ) <> 30 OR (
    SELECT COALESCE(sum(invoice.total_amount), 0) FROM public.invoices invoice
    WHERE invoice.company_id = v_company_id
      AND invoice.contract_id = v_mahdi_contract_id
      AND lower(COALESCE(invoice.invoice_type, '')) IN ('sales', 'service', 'rental', 'monthly')
      AND invoice.penalty_id IS NULL
      AND invoice.invoice_month BETWEEN v_mahdi_start AND v_mahdi_end
      AND abs(invoice.total_amount - 1600) <= 0.01
      AND lower(invoice.status) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
  ) <> 48000 THEN
    RAISE EXCEPTION 'Postcondition failed: Mahdi must have 30 active invoices totaling QAR 48,000';
  END IF;

  IF (
    SELECT count(*)
    FROM public.invoices invoice
    WHERE invoice.company_id = v_company_id
      AND invoice.contract_id = v_mahdi_contract_id
      AND lower(COALESCE(invoice.invoice_type, '')) IN ('sales', 'service', 'rental', 'monthly')
      AND invoice.penalty_id IS NULL
      AND invoice.invoice_month BETWEEN v_mahdi_start AND v_mahdi_end
      AND abs(invoice.total_amount - 1600) <= 0.01
      AND lower(invoice.status) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
      AND public.system_invoice_has_single_balanced_posted_journal(
        invoice.company_id,
        invoice.id,
        invoice.total_amount
      )
  ) <> 30 THEN
    RAISE EXCEPTION 'Postcondition failed: every Mahdi invoice must have one balanced posted journal';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.invoices invoice
    WHERE invoice.company_id = v_company_id
      AND invoice.contract_id = v_thamer_contract_id
      AND invoice.invoice_type = 'sales'
      AND invoice.invoice_month >= v_mahdi_start
      AND lower(invoice.status) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
  ) THEN
    RAISE EXCEPTION 'Postcondition failed: Thamer still has active rent after the cutoff';
  END IF;

  IF (
    SELECT COALESCE(sum(payment.amount), 0)
    FROM public.payments payment
    WHERE payment.company_id = v_company_id
      AND payment.contract_id = v_thamer_contract_id
      AND lower(payment.payment_status) IN ('completed', 'paid', 'success', 'succeeded')
      AND lower(COALESCE(payment.transaction_type::text, 'receipt')) = 'receipt'
  ) <> 32960 THEN
    RAISE EXCEPTION 'Postcondition failed: Thamer valid receipts must total QAR 32,960';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.contracts contract
    WHERE contract.id = v_thamer_contract_id
      AND contract.start_date = DATE '2024-02-03'
      AND contract.end_date = v_cutoff_date
      AND contract.status = 'under_legal_procedure'
      AND contract.vehicle_returned = true
      AND contract.contract_amount = 46200
      AND contract.total_paid = 32960
      AND contract.balance_due = 13240
  ) THEN
    RAISE EXCEPTION 'Postcondition failed: Thamer cutoff contract totals are incorrect';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.legal_cases legal_case
    WHERE legal_case.id = v_legal_case_id
      AND legal_case.workflow_stage = 'preparation'
      AND legal_case.case_status = 'pending'
      AND legal_case.case_value = v_thamer_claim
  ) THEN
    RAISE EXCEPTION 'Postcondition failed: Thamer legal case was not reopened for QAR 17,240';
  END IF;

  IF (
    SELECT count(*) FROM public.penalties penalty
    WHERE penalty.company_id = v_company_id
      AND penalty.contract_id = v_thamer_contract_id
      AND penalty.customer_id = v_thamer_customer_id
  ) <> 10 OR (
    SELECT COALESCE(sum(penalty.amount), 0) FROM public.penalties penalty
    WHERE penalty.company_id = v_company_id
      AND penalty.contract_id = v_thamer_contract_id
      AND penalty.customer_id = v_thamer_customer_id
  ) <> 4000 THEN
    RAISE EXCEPTION 'Postcondition failed: Thamer must have ten verified penalties totaling QAR 4,000';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.vehicles vehicle
    WHERE vehicle.id = v_vehicle_id
      AND vehicle.company_id = v_company_id
      AND vehicle.status = 'rented'::public.vehicle_status
  ) THEN
    RAISE EXCEPTION 'Postcondition failed: vehicle 7038 is not rented';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_trigger trigger_definition
    JOIN pg_catalog.pg_class relation
      ON relation.oid = trigger_definition.tgrelid
    JOIN pg_catalog.pg_namespace namespace
      ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public'
      AND (
        (relation.relname = 'invoices'
         AND trigger_definition.tgname = 'trigger_auto_delete_cancelled_invoice')
        OR
        (relation.relname = 'contracts'
         AND trigger_definition.tgname = 'trigger_create_payment_schedules')
      )
      AND NOT trigger_definition.tgisinternal
  ) THEN
    RAISE EXCEPTION 'Postcondition failed: conflicting legacy billing triggers are still active';
  END IF;

  UPDATE public.audit_logs audit
  SET status = 'completed',
      new_values = jsonb_build_object(
        'mahdi_contract', (SELECT to_jsonb(contract) FROM public.contracts contract WHERE contract.id = v_mahdi_contract_id),
        'thamer_contract', (SELECT to_jsonb(contract) FROM public.contracts contract WHERE contract.id = v_thamer_contract_id),
        'legal_case', (SELECT to_jsonb(legal_case) FROM public.legal_cases legal_case WHERE legal_case.id = v_legal_case_id),
        'vehicle', (SELECT to_jsonb(vehicle) FROM public.vehicles vehicle WHERE vehicle.id = v_vehicle_id),
        'claim_breakdown', jsonb_build_object(
          'rent', 46200,
          'penalties', 4000,
          'valid_payments', 32960,
          'claim', v_thamer_claim
        )
      ),
      notes = 'اكتملت جميع شروط ما بعد التنفيذ داخل المعاملة نفسها.'
  WHERE audit.company_id = v_company_id
    AND audit.action = 'plate_7038_mahdi_thamer_correction_started'
    AND audit.resource_id = v_vehicle_id
    AND audit.status = 'in_progress';
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config(
      'fleetify.vehicle_identity_repair',
      v_previous_vehicle_identity_repair,
      true
    );
    RAISE EXCEPTION 'Plate 7038 correction failed during phase "%": %', v_phase, SQLERRM
      USING ERRCODE = SQLSTATE;
END;
$repair$;

COMMIT;
