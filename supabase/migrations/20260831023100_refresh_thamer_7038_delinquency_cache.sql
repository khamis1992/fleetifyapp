-- Refresh only Thamer's 7038 delinquency cache from the verified live ledgers.
-- This deliberately avoids changing the company-wide SECURITY DEFINER refresh
-- function as part of a single-customer production correction.

BEGIN;

DO $repair$
DECLARE
  v_company_id constant uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_customer_id constant uuid := '508f6e9f-1df5-4c98-b9c9-2afc6e3e0e7f';
  v_contract_id constant uuid := 'b88a2ae9-b579-4b32-9f88-ec525d528642';
  v_case_id constant uuid := '4013611e-eaaa-460e-800f-9b67932f9f21';
  v_vehicle_id constant uuid := 'f27ffd71-a8fa-4127-9501-a6220e4749c8';
  v_updated integer;
  v_before jsonb;
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_company_id::text || ':thamer-7038-delinquency-cache', 0)
  );

  IF NOT EXISTS (
    SELECT 1
    FROM public.contracts contract
    JOIN public.legal_cases legal_case
      ON legal_case.id = v_case_id
     AND legal_case.company_id = contract.company_id
     AND legal_case.contract_id = contract.id
    WHERE contract.id = v_contract_id
      AND contract.company_id = v_company_id
      AND contract.customer_id = v_customer_id
      AND contract.vehicle_id = v_vehicle_id
      AND contract.status = 'under_legal_procedure'
      AND contract.start_date = DATE '2024-02-03'
      AND contract.end_date = DATE '2025-12-31'
      AND contract.total_paid = 32960
      AND contract.balance_due = 13240
      AND legal_case.workflow_stage = 'preparation'
      AND legal_case.case_status = 'pending'
      AND legal_case.case_value = 17240
  ) THEN
    RAISE EXCEPTION 'Precondition failed: the verified Thamer contract/case state was not found';
  END IF;

  SELECT to_jsonb(delinquent)
  INTO v_before
  FROM public.delinquent_customers delinquent
  WHERE delinquent.company_id = v_company_id
    AND delinquent.customer_id = v_customer_id
    AND delinquent.contract_id = v_contract_id
  FOR UPDATE;

  IF v_before IS NULL THEN
    RAISE EXCEPTION 'Precondition failed: Thamer delinquency cache row was not found';
  END IF;

  WITH live AS (
    SELECT
      rent.months_unpaid,
      rent.overdue_amount,
      rent.first_due_date,
      rent.expected_count,
      receipts.actual_count,
      receipts.last_payment_date,
      receipts.last_payment_amount,
      penalties.penalty_count,
      penalties.penalty_amount,
      fees.late_penalty,
      legal.legal_count
    FROM LATERAL (
      SELECT count(*) FILTER (WHERE invoice.balance_due > 0.01)::integer AS months_unpaid,
        COALESCE(sum(invoice.balance_due) FILTER (WHERE invoice.balance_due > 0.01), 0)::numeric AS overdue_amount,
        min(invoice.due_date) FILTER (WHERE invoice.balance_due > 0.01) AS first_due_date,
        count(*)::integer AS expected_count
      FROM public.invoices invoice
      WHERE invoice.company_id = v_company_id
        AND invoice.contract_id = v_contract_id
        AND invoice.penalty_id IS NULL
        AND invoice.due_date < CURRENT_DATE
        AND lower(COALESCE(invoice.status, '')) NOT IN (
          'cancelled', 'canceled', 'void', 'voided', 'deleted'
        )
        AND lower(COALESCE(invoice.payment_status, '')) NOT IN (
          'cancelled', 'canceled', 'void', 'voided', 'deleted'
        )
    ) rent
    CROSS JOIN LATERAL (
      SELECT count(*)::integer AS actual_count,
        max(payment.payment_date)::date AS last_payment_date,
        COALESCE((array_agg(
          payment.amount
          ORDER BY payment.payment_date DESC, payment.created_at DESC, payment.id DESC
        ))[1], 0)::numeric AS last_payment_amount
      FROM public.payments payment
      WHERE payment.company_id = v_company_id
        AND payment.contract_id = v_contract_id
        AND lower(COALESCE(payment.payment_status, '')) IN (
          'completed', 'paid', 'success', 'succeeded'
        )
        AND lower(COALESCE(payment.transaction_type::text, 'receipt')) = 'receipt'
    ) receipts
    CROSS JOIN LATERAL (
      SELECT count(*)::integer AS penalty_count,
        COALESCE(sum(penalty.amount), 0)::numeric AS penalty_amount
      FROM public.penalties penalty
      WHERE penalty.company_id = v_company_id
        AND penalty.contract_id = v_contract_id
        AND penalty.customer_id = v_customer_id
        AND lower(COALESCE(penalty.payment_status, '')) NOT IN (
          'paid', 'completed', 'cancelled', 'canceled', 'void', 'voided'
        )
    ) penalties
    CROSS JOIN LATERAL (
      SELECT COALESCE(sum(fee.fee_amount), 0)::numeric AS late_penalty
      FROM public.late_fees fee
      JOIN public.invoices invoice ON invoice.id = fee.invoice_id
      WHERE fee.company_id = v_company_id
        AND invoice.contract_id = v_contract_id
        AND lower(COALESCE(fee.status, 'pending')) NOT IN (
          'waived', 'rejected', 'cancelled', 'canceled', 'void', 'voided'
        )
    ) fees
    CROSS JOIN LATERAL (
      SELECT count(*)::integer AS legal_count
      FROM public.legal_cases legal_case
      WHERE legal_case.company_id = v_company_id
        AND legal_case.client_id = v_customer_id
    ) legal
  )
  UPDATE public.delinquent_customers delinquent
  SET months_unpaid = live.months_unpaid,
      overdue_amount = live.overdue_amount,
      last_payment_date = live.last_payment_date,
      last_payment_amount = live.last_payment_amount,
      actual_payments_count = live.actual_count,
      expected_payments_count = live.expected_count,
      days_overdue = GREATEST(CURRENT_DATE - live.first_due_date, 0),
      late_penalty = live.late_penalty,
      violations_count = live.penalty_count,
      violations_amount = live.penalty_amount,
      total_debt = live.overdue_amount + live.late_penalty + live.penalty_amount,
      risk_score = 100,
      risk_level = 'CRITICAL',
      risk_level_en = 'Critical',
      risk_color = 'red',
      recommended_action = 'BLACKLIST_AND_FILE_CASE',
      has_previous_legal_cases = live.legal_count > 0,
      previous_legal_cases_count = live.legal_count,
      is_active = true,
      last_updated_at = now()
  FROM live
  WHERE delinquent.company_id = v_company_id
    AND delinquent.customer_id = v_customer_id
    AND delinquent.contract_id = v_contract_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN
    RAISE EXCEPTION 'Repair failed: expected one Thamer cache row, updated %', v_updated;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.delinquent_customers delinquent
    WHERE delinquent.company_id = v_company_id
      AND delinquent.customer_id = v_customer_id
      AND delinquent.contract_id = v_contract_id
      AND delinquent.is_active = true
      AND delinquent.months_unpaid = 11
      AND delinquent.expected_payments_count = 22
      AND delinquent.actual_payments_count = 23
      AND delinquent.overdue_amount = 13240
      AND delinquent.late_penalty = 0
      AND delinquent.violations_count = 10
      AND delinquent.violations_amount = 4000
      AND delinquent.total_debt = 17240
  ) THEN
    RAISE EXCEPTION 'Postcondition failed: Thamer cache does not match the live QAR 17,240 claim';
  END IF;

  INSERT INTO public.audit_logs (
    company_id, action, resource_type, resource_id, entity_name,
    changes_summary, old_values, new_values, metadata, status, severity,
    user_name, notes
  ) VALUES (
    v_company_id,
    'thamer_7038_delinquency_cache_refreshed',
    'delinquent_customer',
    v_contract_id,
    'C-ALF-0048 / 7038',
    'تحديث كاش تعثر ثامر من فواتير الإيجار والمخالفات الحية بعد قطع المطالبة في 2025-12-31',
    v_before,
    (SELECT to_jsonb(delinquent) FROM public.delinquent_customers delinquent
      WHERE delinquent.company_id = v_company_id
        AND delinquent.customer_id = v_customer_id
        AND delinquent.contract_id = v_contract_id),
    jsonb_build_object(
      'rent_due', 13240,
      'verified_penalties', 4000,
      'legal_claim', 17240,
      'scope', 'single_customer_safe_refresh'
    ),
    'completed',
    'high',
    'Codex production repair',
    'لم يتم تغيير دالة التحديث العامة أو كاش أي عميل آخر.'
  );
END;
$repair$;

COMMIT;
