BEGIN;

DO $$
DECLARE
  v_company_id constant uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_contract_id constant uuid := 'd00185fb-df9a-4abd-975a-cc99aab7bf77';
  v_old_contract jsonb;
  v_old_schedules jsonb;
  v_old_profile jsonb;
  v_schedule_count integer;
  v_schedule_total numeric;
BEGIN
  SELECT pg_catalog.to_jsonb(contract.*)
  INTO v_old_contract
  FROM public.contracts contract
  WHERE contract.id = v_contract_id
    AND contract.company_id = v_company_id
  FOR UPDATE;

  IF v_old_contract IS NULL THEN
    RAISE EXCEPTION 'LTO2024276 was not found';
  END IF;

  IF v_old_contract ->> 'contract_number' <> 'LTO2024276'
     OR (v_old_contract ->> 'start_date')::date <> DATE '2024-08-15'
     OR (v_old_contract ->> 'end_date')::date <> DATE '2027-08-15'
     OR (v_old_contract ->> 'contract_amount')::numeric <> 55500
     OR (v_old_contract ->> 'monthly_amount')::numeric <> 1500
     OR COALESCE((v_old_contract ->> 'total_paid')::numeric, 0) <> 0
  THEN
    RAISE EXCEPTION 'LTO2024276 changed after review; refusing automatic signed-schedule correction';
  END IF;

  PERFORM schedule.id
  FROM public.contract_payment_schedules schedule
  WHERE schedule.company_id = v_company_id
    AND schedule.contract_id = v_contract_id
  FOR UPDATE;

  SELECT
    pg_catalog.jsonb_agg(pg_catalog.to_jsonb(schedule.*) ORDER BY schedule.installment_number),
    count(*)::integer,
    round(COALESCE(sum(schedule.amount), 0)::numeric, 2)
  INTO v_old_schedules, v_schedule_count, v_schedule_total
  FROM public.contract_payment_schedules schedule
  WHERE schedule.company_id = v_company_id
    AND schedule.contract_id = v_contract_id
    AND lower(COALESCE(schedule.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    );

  IF v_schedule_count <> 37 OR v_schedule_total <> 55500
     OR EXISTS (
       SELECT 1
       FROM public.contract_payment_schedules schedule
       WHERE schedule.company_id = v_company_id
         AND schedule.contract_id = v_contract_id
         AND lower(COALESCE(schedule.status, '')) NOT IN (
           'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
         )
         AND (
           schedule.amount <> 1500
           OR COALESCE(schedule.paid_amount, 0) <> 0
           OR schedule.invoice_id IS NOT NULL
         )
     )
  THEN
    RAISE EXCEPTION 'LTO2024276 schedule changed after review; refusing automatic correction';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.invoices invoice
    WHERE invoice.company_id = v_company_id AND invoice.contract_id = v_contract_id
  ) OR EXISTS (
    SELECT 1 FROM public.payments payment
    WHERE payment.company_id = v_company_id AND payment.contract_id = v_contract_id
  ) OR EXISTS (
    SELECT 1 FROM public.legal_claim_snapshots snapshot
    WHERE snapshot.company_id = v_company_id AND snapshot.contract_id = v_contract_id
  ) THEN
    RAISE EXCEPTION 'LTO2024276 acquired invoices, payments, or a frozen legal snapshot; manual reconciliation is required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.legal_cases legal_case
    WHERE legal_case.company_id = v_company_id
      AND legal_case.contract_id = v_contract_id
      AND legal_case.case_number = 'CASE-26-0059'
      AND legal_case.case_status = 'pending'
      AND legal_case.workflow_stage = 'preparation'
      AND legal_case.filing_date IS NULL
  ) THEN
    RAISE EXCEPTION 'CASE-26-0059 is no longer an unfiled preparation case; refusing automatic correction';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.contract_documents document
    WHERE document.company_id = v_company_id
      AND document.contract_id = v_contract_id
      AND document.document_type IN ('signed_contract', 'signed_contract_image')
      AND document.legal_evidence_state = 'active'
      AND document.legal_identity_match_status = 'matched'
      AND NULLIF(BTRIM(document.file_path), '') IS NOT NULL
      AND LENGTH(pg_catalog.regexp_replace(COALESCE(document.legal_identity_expected_id, ''), '[^0-9]', '', 'g')) = 11
      AND pg_catalog.regexp_replace(COALESCE(document.legal_identity_expected_id, ''), '[^0-9]', '', 'g')
        = pg_catalog.regexp_replace(COALESCE(document.legal_identity_extracted_id, ''), '[^0-9]', '', 'g')
  ) THEN
    RAISE EXCEPTION 'The reviewed signed contract no longer has an exact customer QID match';
  END IF;

  SELECT pg_catalog.to_jsonb(profile.*)
  INTO v_old_profile
  FROM public.legal_case_litigation_profile profile
  WHERE profile.company_id = v_company_id
    AND profile.contract_id = v_contract_id
  FOR UPDATE;

  INSERT INTO public.audit_logs (
    company_id, action, resource_type, resource_id, entity_name,
    changes_summary, old_values, new_values, severity, status, metadata
  ) VALUES (
    v_company_id,
    'correct_lto2024276_from_signed_schedule_20260903162734',
    'contract',
    v_contract_id,
    'LTO2024276',
    'Corrected financial terms and the installment schedule from the identity-matched signed Agreement 2024/276.',
    pg_catalog.jsonb_build_object(
      'contract', v_old_contract,
      'active_schedules', COALESCE(v_old_schedules, '[]'::jsonb),
      'litigation_profile', v_old_profile
    ),
    pg_catalog.jsonb_build_object(
      'monthly_amount', 1800,
      'contract_amount', 64800,
      'schedule_count', 37,
      'schedule_pattern', '900 + 35x1800 + 900',
      'signed_agreement', '2024/276'
    ),
    'high',
    'completed',
    pg_catalog.jsonb_build_object(
      'source_document_id', '1b36a643-be95-46f7-920c-24205191ed4c',
      'migration', '20260903162734'
    )
  );

  UPDATE public.contract_payment_schedules schedule
  SET
    status = 'cancelled',
    invoice_id = NULL,
    notes = CONCAT_WS(E'\n', schedule.notes, 'Superseded by the identity-matched signed Agreement 2024/276 on 2026-09-03.'),
    updated_at = pg_catalog.now()
  WHERE schedule.company_id = v_company_id
    AND schedule.contract_id = v_contract_id
    AND lower(COALESCE(schedule.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    );

  UPDATE public.contracts contract
  SET
    monthly_amount = 1800,
    contract_amount = 64800,
    balance_due = 64800,
    total_paid = 0,
    payment_status = 'unpaid',
    updated_at = pg_catalog.now()
  WHERE contract.id = v_contract_id
    AND contract.company_id = v_company_id;

  WITH signed_schedule AS (
    SELECT 1::integer AS installment_number, DATE '2024-08-15' AS due_date, 900::numeric AS amount
    UNION ALL
    SELECT
      (pg_catalog.row_number() OVER (ORDER BY month_start) + 1)::integer,
      month_start::date,
      1800::numeric
    FROM pg_catalog.generate_series(
      DATE '2024-09-01',
      DATE '2027-07-01',
      INTERVAL '1 month'
    ) AS month_start
    UNION ALL
    SELECT 37::integer, DATE '2027-08-01', 900::numeric
  )
  INSERT INTO public.contract_payment_schedules (
    company_id, contract_id, installment_number, due_date, amount,
    paid_amount, status, description, notes, created_by
  )
  SELECT
    v_company_id,
    v_contract_id,
    signed.installment_number,
    signed.due_date,
    signed.amount,
    0,
    CASE
      WHEN signed.due_date <= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::date
        THEN 'overdue'
      ELSE 'pending'
    END,
    CASE
      WHEN signed.amount = 900 THEN 'Partial rental installment from signed Agreement 2024/276'
      ELSE 'Monthly rental installment from signed Agreement 2024/276'
    END,
    'Authoritative schedule transcribed from the identity-matched signed PDF; do not regenerate from amount/month quotient.',
    NULL
  FROM signed_schedule signed
  ORDER BY signed.installment_number;

  UPDATE public.legal_case_litigation_profile profile
  SET
    security_deposit_amount = 1800,
    updated_at = pg_catalog.now(),
    notes = CONCAT_WS(E'\n', profile.notes, 'Signed Agreement 2024/276 records a QAR 1,800 security deposit; no automatic settlement deduction was enabled.')
  WHERE profile.company_id = v_company_id
    AND profile.contract_id = v_contract_id
    AND profile.security_deposit_amount IS NULL;

  SELECT count(*)::integer, round(COALESCE(sum(schedule.amount), 0)::numeric, 2)
  INTO v_schedule_count, v_schedule_total
  FROM public.contract_payment_schedules schedule
  WHERE schedule.company_id = v_company_id
    AND schedule.contract_id = v_contract_id
    AND lower(COALESCE(schedule.status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive'
    );

  IF v_schedule_count <> 37 OR v_schedule_total <> 64800 THEN
    RAISE EXCEPTION 'Corrected LTO2024276 schedule failed post-write validation';
  END IF;
END;
$$;

COMMIT;
