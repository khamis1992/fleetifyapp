-- Repair the RPCs used by /legal/delinquency and the WhatsApp report tab.

CREATE OR REPLACE FUNCTION public.update_delinquent_customers(p_company_id uuid DEFAULT NULL)
RETURNS TABLE(processed_count integer, added_count integer, updated_count integer, removed_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company record;
  v_result record;
BEGIN
  processed_count := 0;
  added_count := 0;
  updated_count := 0;
  removed_count := 0;

  IF p_company_id IS NULL THEN
    IF COALESCE(auth.role(), '') <> 'service_role' THEN
      RAISE EXCEPTION 'A company is required' USING ERRCODE = '42501';
    END IF;
    FOR v_company IN SELECT company.id FROM public.companies company ORDER BY company.id LOOP
      SELECT * INTO v_result FROM public.update_delinquent_customers(v_company.id);
      processed_count := processed_count + COALESCE(v_result.processed_count, 0);
      added_count := added_count + COALESCE(v_result.added_count, 0);
      updated_count := updated_count + COALESCE(v_result.updated_count, 0);
      removed_count := removed_count + COALESCE(v_result.removed_count, 0);
    END LOOP;
    RETURN NEXT;
    RETURN;
  END IF;

  PERFORM public.assert_finance_rpc_company_access_v1(p_company_id);
  PERFORM pg_advisory_xact_lock(hashtextextended(p_company_id::text || ':delinquency-refresh', 0));

  WITH contract_facts AS (
    SELECT contract.id AS contract_id,
      contract.company_id,
      contract.customer_id,
      contract.contract_number,
      contract.start_date,
      contract.monthly_amount,
      contract.vehicle_id,
      vehicle.plate_number AS vehicle_plate,
      customer.customer_code,
      customer.customer_type,
      customer.first_name,
      customer.last_name,
      customer.first_name_ar,
      customer.last_name_ar,
      customer.company_name,
      customer.company_name_ar,
      customer.phone,
      customer.email,
      COALESCE(customer.credit_limit, 0) AS credit_limit,
      COALESCE(customer.is_blacklisted, false) AS is_blacklisted,
      overdue.months_unpaid,
      overdue.overdue_amount,
      overdue.first_due_date,
      invoice_totals.expected_count,
      payments.actual_count,
      payments.last_payment_date,
      payments.last_payment_amount,
      violations.violation_count,
      violations.violation_amount,
      legal.legal_count,
      fees.late_penalty
    FROM public.contracts contract
    JOIN public.customers customer
      ON customer.id = contract.customer_id AND customer.company_id = contract.company_id
    LEFT JOIN public.vehicles vehicle
      ON vehicle.id = contract.vehicle_id AND vehicle.company_id = contract.company_id
    CROSS JOIN LATERAL (
      SELECT count(*)::integer AS months_unpaid,
        COALESCE(sum(invoice.balance_due), 0)::numeric AS overdue_amount,
        min(invoice.due_date) AS first_due_date
      FROM public.invoices invoice
      WHERE invoice.company_id = contract.company_id AND invoice.contract_id = contract.id
        AND invoice.due_date < CURRENT_DATE AND COALESCE(invoice.balance_due, 0) > 0
        AND lower(COALESCE(invoice.status, '')) NOT IN ('cancelled','canceled','void')
    ) overdue
    CROSS JOIN LATERAL (
      SELECT count(*)::integer AS expected_count
      FROM public.invoices invoice
      WHERE invoice.company_id = contract.company_id AND invoice.contract_id = contract.id
        AND invoice.due_date <= CURRENT_DATE
        AND lower(COALESCE(invoice.status, '')) NOT IN ('cancelled','canceled','void')
    ) invoice_totals
    CROSS JOIN LATERAL (
      SELECT count(*)::integer AS actual_count,
        max(payment.payment_date)::date AS last_payment_date,
        COALESCE((array_agg(payment.amount ORDER BY payment.payment_date DESC, payment.created_at DESC))[1], 0)::numeric AS last_payment_amount
      FROM public.payments payment
      WHERE payment.company_id = contract.company_id AND payment.contract_id = contract.id
        AND lower(COALESCE(payment.payment_status, '')) = 'completed'
    ) payments
    CROSS JOIN LATERAL (
      SELECT count(*)::integer AS violation_count,
        COALESCE(sum(violation.fine_amount), 0)::numeric AS violation_amount
      FROM public.traffic_violations violation
      WHERE violation.company_id = contract.company_id AND violation.contract_id = contract.id
        AND lower(COALESCE(violation.status, '')) <> 'paid'
    ) violations
    CROSS JOIN LATERAL (
      SELECT count(*)::integer AS legal_count
      FROM public.legal_cases legal_case
      WHERE legal_case.company_id = contract.company_id AND legal_case.client_id = contract.customer_id
    ) legal
    CROSS JOIN LATERAL (
      SELECT COALESCE(sum(fee.fee_amount), 0)::numeric AS late_penalty
      FROM public.late_fees fee
      JOIN public.invoices invoice ON invoice.id = fee.invoice_id
      WHERE fee.company_id = contract.company_id AND invoice.contract_id = contract.id
        AND lower(COALESCE(fee.status, 'pending')) NOT IN ('waived','rejected','cancelled')
    ) fees
    WHERE contract.company_id = p_company_id AND contract.status = 'active'
      AND contract.start_date IS NOT NULL AND overdue.overdue_amount > 0
  ), scored AS (
    SELECT facts.*,
      GREATEST(CURRENT_DATE - facts.first_due_date, 0)::integer AS days_overdue,
      LEAST(100, GREATEST(0,
        LEAST(GREATEST(CURRENT_DATE - facts.first_due_date, 0) / 120.0 * 40, 40)
        + CASE WHEN facts.credit_limit > 0
            THEN LEAST(facts.overdue_amount / facts.credit_limit * 30, 30) ELSE 30 END
        + LEAST(facts.violation_count / 5.0 * 15, 15)
        + CASE WHEN facts.expected_count > 0
            THEN LEAST(facts.months_unpaid::numeric / facts.expected_count * 10, 10) ELSE 0 END
        + CASE WHEN facts.legal_count > 0 THEN 5 ELSE 0 END
      ))::numeric AS risk_score
    FROM contract_facts facts
  ), prepared AS (
    SELECT scored.*,
      scored.overdue_amount + scored.late_penalty + scored.violation_amount AS total_debt,
      CASE
        WHEN scored.customer_type = 'individual' THEN concat_ws(' ',
          COALESCE(scored.first_name_ar, scored.first_name),
          COALESCE(scored.last_name_ar, scored.last_name))
        ELSE COALESCE(scored.company_name_ar, scored.company_name, '')
      END AS customer_name,
      CASE WHEN scored.risk_score >= 85 THEN 'CRITICAL'
        WHEN scored.risk_score >= 70 THEN 'HIGH'
        WHEN scored.risk_score >= 60 THEN 'MEDIUM'
        WHEN scored.risk_score >= 40 THEN 'LOW' ELSE 'MONITOR' END AS risk_level,
      CASE WHEN scored.risk_score >= 85 THEN 'Critical'
        WHEN scored.risk_score >= 70 THEN 'High'
        WHEN scored.risk_score >= 60 THEN 'Medium'
        WHEN scored.risk_score >= 40 THEN 'Low' ELSE 'Monitor' END AS risk_level_en,
      CASE WHEN scored.risk_score >= 70 THEN 'red'
        WHEN scored.risk_score >= 60 THEN 'orange'
        WHEN scored.risk_score >= 40 THEN 'yellow' ELSE 'green' END AS risk_color,
      CASE WHEN scored.risk_score >= 85 THEN 'BLACKLIST_AND_FILE_CASE'
        WHEN scored.risk_score >= 70 THEN 'FILE_LEGAL_CASE'
        WHEN scored.risk_score >= 60 THEN 'SEND_FORMAL_NOTICE'
        WHEN scored.risk_score >= 40 THEN 'SEND_WARNING' ELSE 'MONITOR' END AS recommended_action
    FROM scored
  ), upserted AS (
    INSERT INTO public.delinquent_customers (
      company_id, customer_id, customer_name, customer_code, customer_type, phone, email,
      credit_limit, is_blacklisted, contract_id, contract_number, contract_start_date,
      monthly_rent, vehicle_id, vehicle_plate, months_unpaid, overdue_amount,
      last_payment_date, last_payment_amount, actual_payments_count, expected_payments_count,
      days_overdue, late_penalty, violations_count, violations_amount, total_debt,
      risk_score, risk_level, risk_level_en, risk_color, recommended_action,
      has_previous_legal_cases, previous_legal_cases_count, last_updated_at, is_active
    )
    SELECT prepared.company_id, prepared.customer_id, prepared.customer_name,
      prepared.customer_code, prepared.customer_type, prepared.phone, prepared.email,
      prepared.credit_limit, prepared.is_blacklisted, prepared.contract_id,
      prepared.contract_number, prepared.start_date, prepared.monthly_amount,
      prepared.vehicle_id, prepared.vehicle_plate, prepared.months_unpaid,
      prepared.overdue_amount, prepared.last_payment_date, prepared.last_payment_amount,
      prepared.actual_count, prepared.expected_count, prepared.days_overdue,
      prepared.late_penalty, prepared.violation_count, prepared.violation_amount,
      prepared.total_debt, prepared.risk_score, prepared.risk_level,
      prepared.risk_level_en, prepared.risk_color, prepared.recommended_action,
      prepared.legal_count > 0, prepared.legal_count, now(), true
    FROM prepared
    ON CONFLICT (company_id, customer_id, contract_id) DO UPDATE SET
      customer_name=EXCLUDED.customer_name, customer_code=EXCLUDED.customer_code,
      customer_type=EXCLUDED.customer_type, phone=EXCLUDED.phone, email=EXCLUDED.email,
      credit_limit=EXCLUDED.credit_limit, is_blacklisted=EXCLUDED.is_blacklisted,
      contract_number=EXCLUDED.contract_number, contract_start_date=EXCLUDED.contract_start_date,
      monthly_rent=EXCLUDED.monthly_rent, vehicle_id=EXCLUDED.vehicle_id,
      vehicle_plate=EXCLUDED.vehicle_plate, months_unpaid=EXCLUDED.months_unpaid,
      overdue_amount=EXCLUDED.overdue_amount, last_payment_date=EXCLUDED.last_payment_date,
      last_payment_amount=EXCLUDED.last_payment_amount,
      actual_payments_count=EXCLUDED.actual_payments_count,
      expected_payments_count=EXCLUDED.expected_payments_count,
      days_overdue=EXCLUDED.days_overdue, late_penalty=EXCLUDED.late_penalty,
      violations_count=EXCLUDED.violations_count, violations_amount=EXCLUDED.violations_amount,
      total_debt=EXCLUDED.total_debt, risk_score=EXCLUDED.risk_score,
      risk_level=EXCLUDED.risk_level, risk_level_en=EXCLUDED.risk_level_en,
      risk_color=EXCLUDED.risk_color, recommended_action=EXCLUDED.recommended_action,
      has_previous_legal_cases=EXCLUDED.has_previous_legal_cases,
      previous_legal_cases_count=EXCLUDED.previous_legal_cases_count,
      last_updated_at=now(), is_active=true
    RETURNING (xmax = 0) AS was_inserted
  )
  SELECT count(*)::integer,
    count(*) FILTER (WHERE was_inserted)::integer,
    count(*) FILTER (WHERE NOT was_inserted)::integer
  INTO processed_count, added_count, updated_count
  FROM upserted;

  UPDATE public.delinquent_customers delinquent
  SET is_active = false, last_updated_at = now()
  WHERE delinquent.company_id = p_company_id AND delinquent.is_active
    AND NOT EXISTS (
      SELECT 1 FROM public.invoices invoice
      WHERE invoice.company_id = p_company_id AND invoice.contract_id = delinquent.contract_id
        AND invoice.due_date < CURRENT_DATE AND COALESCE(invoice.balance_due, 0) > 0
        AND lower(COALESCE(invoice.status, '')) NOT IN ('cancelled','canceled','void')
    );
  GET DIAGNOSTICS removed_count = ROW_COUNT;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_whatsapp_statistics()
RETURNS TABLE(
  total_reminders bigint,
  sent_count bigint,
  failed_count bigint,
  pending_count bigint,
  cancelled_count bigint,
  unique_customers bigint,
  unique_invoices bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_company_id uuid;
BEGIN
  IF COALESCE(auth.role(), '') = 'service_role' THEN
    v_company_id := NULL;
  ELSE
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication is required' USING ERRCODE='42501'; END IF;
    v_company_id := public.get_user_company_id();
    IF v_company_id IS NULL THEN RAISE EXCEPTION 'Company access denied' USING ERRCODE='42501'; END IF;
  END IF;
  RETURN QUERY SELECT count(*)::bigint,
    count(*) FILTER (WHERE schedule.status='sent')::bigint,
    count(*) FILTER (WHERE schedule.status='failed')::bigint,
    count(*) FILTER (WHERE schedule.status='pending')::bigint,
    count(*) FILTER (WHERE schedule.status='cancelled')::bigint,
    count(DISTINCT schedule.customer_id)::bigint,
    count(DISTINCT schedule.invoice_id)::bigint
  FROM public.reminder_schedules schedule
  WHERE v_company_id IS NULL OR schedule.company_id=v_company_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_delinquent_customers(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.get_whatsapp_statistics() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.update_delinquent_customers(uuid) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_whatsapp_statistics() TO authenticated,service_role;
