-- Legal accrual continuation for vehicles that remain with defendants.
--
-- Accounting invoices and the original contract graph remain immutable.  This
-- function adds a separate legal-only rent component after the last covered
-- contract month, stops it when rescission/judgment becomes effective, and only
-- then permits evidence-backed retention compensation.  The two periods can
-- therefore never overlap.

CREATE OR REPLACE FUNCTION public.calculate_legal_claim_breakdown_v2(
  p_company_id UUID,
  p_contract_id UUID,
  p_as_of_date DATE DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::DATE)
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
  WITH contract_row AS (
    SELECT c.*
    FROM public.contracts c
    WHERE c.company_id = p_company_id
      AND c.id = p_contract_id
  ),
  profile AS (
    SELECT p.*
    FROM public.legal_case_litigation_profile p
    WHERE p.company_id = p_company_id
      AND p.contract_id = p_contract_id
  ),
  case_dates AS (
    SELECT
      MIN(lc.judgment_final_at::DATE) FILTER (
        WHERE lc.judgment_final_at IS NOT NULL
          AND LOWER(COALESCE(lc.case_status, '')) <> 'cancelled'
      ) AS judgment_date,
      MIN(lc.outcome_date) FILTER (
        WHERE lc.outcome_date IS NOT NULL
          AND lc.workflow_stage IN ('judgment_issued', 'closed')
          AND LOWER(COALESCE(lc.case_status, '')) <> 'cancelled'
      ) AS outcome_date
    FROM public.legal_cases lc
    WHERE lc.company_id = p_company_id
      AND lc.contract_id = p_contract_id
  ),
  due_invoices AS (
    SELECT
      i.due_date,
      GREATEST(COALESCE(i.balance_due, i.total_amount - COALESCE(i.paid_amount, 0)), 0) AS amount
    FROM public.invoices i
    WHERE i.company_id = p_company_id
      AND i.contract_id = p_contract_id
      AND i.due_date <= p_as_of_date
      AND LOWER(COALESCE(i.status, '')) NOT IN ('cancelled', 'canceled', 'voided', 'reversed')
      AND LOWER(COALESCE(i.payment_status, '')) NOT IN ('cancelled', 'canceled', 'voided', 'reversed')
  ),
  due_schedules AS (
    SELECT
      s.due_date,
      GREATEST(s.amount - COALESCE(s.paid_amount, 0), 0) AS amount
    FROM public.contract_payment_schedules s
    WHERE s.company_id = p_company_id
      AND s.contract_id = p_contract_id
      AND s.due_date <= p_as_of_date
      AND s.invoice_id IS NULL
      AND LOWER(COALESCE(s.status, '')) NOT IN ('paid', 'cancelled', 'canceled', 'voided', 'reversed')
      AND NOT EXISTS (
        SELECT 1
        FROM public.invoices i
        WHERE i.company_id = s.company_id
          AND i.contract_id = s.contract_id
          AND LOWER(COALESCE(i.status, '')) NOT IN ('cancelled', 'canceled', 'voided', 'reversed')
          AND LOWER(COALESCE(i.payment_status, '')) NOT IN ('cancelled', 'canceled', 'voided', 'reversed')
          AND DATE_TRUNC('month', COALESCE(i.invoice_month, i.due_date)::TIMESTAMP)
              = DATE_TRUNC('month', s.due_date::TIMESTAMP)
      )
  ),
  claim_rows AS (
    SELECT due_date, amount FROM due_invoices WHERE amount > 0
    UNION ALL
    SELECT due_date, amount FROM due_schedules WHERE amount > 0
  ),
  covered_months AS (
    SELECT DATE_TRUNC('month', COALESCE(i.invoice_month, i.due_date)::TIMESTAMP)::DATE AS month_start
    FROM public.invoices i
    WHERE i.company_id = p_company_id
      AND i.contract_id = p_contract_id
      AND LOWER(COALESCE(i.status, '')) NOT IN ('cancelled', 'canceled', 'voided', 'reversed')
      AND LOWER(COALESCE(i.payment_status, '')) NOT IN ('cancelled', 'canceled', 'voided', 'reversed')
    UNION
    SELECT DATE_TRUNC('month', s.due_date::TIMESTAMP)::DATE
    FROM public.contract_payment_schedules s
    WHERE s.company_id = p_company_id
      AND s.contract_id = p_contract_id
      AND LOWER(COALESCE(s.status, '')) NOT IN ('cancelled', 'canceled', 'voided', 'reversed')
  ),
  legal_period AS (
    SELECT
      c.id AS contract_id,
      c.status AS contract_status,
      c.monthly_amount,
      c.vehicle_returned,
      p.vehicle_custody,
      p.vehicle_returned_at,
      p.termination_date,
      p.termination_date_status,
      p.retention_daily_rate,
      p.retention_rate_source,
      p.retention_rate_source_ref,
      p.retention_rate_source_document_id,
      GREATEST(
        (DATE_TRUNC('month', c.end_date::TIMESTAMP) + INTERVAL '1 month')::DATE,
        COALESCE(
          ((SELECT MAX(month_start) FROM covered_months) + INTERVAL '1 month')::DATE,
          (DATE_TRUNC('month', c.end_date::TIMESTAMP) + INTERVAL '1 month')::DATE
        )
      ) AS extension_start_date,
      LEAST(
        p_as_of_date,
        COALESCE(p.vehicle_returned_at, p_as_of_date),
        COALESCE(
          CASE WHEN p.termination_date_status = 'confirmed' THEN p.termination_date END,
          p_as_of_date
        ),
        COALESCE(cd.judgment_date, p_as_of_date),
        COALESCE(cd.outcome_date, p_as_of_date)
      ) AS rent_cutoff_date,
      (
        SELECT MIN(event_date)
        FROM (VALUES
          (CASE WHEN p.termination_date_status = 'confirmed' THEN p.termination_date END),
          (cd.judgment_date),
          (cd.outcome_date)
        ) AS rescission_events(event_date)
        WHERE event_date IS NOT NULL
      ) AS rescission_effective_date
    FROM contract_row c
    LEFT JOIN profile p ON TRUE
    CROSS JOIN case_dates cd
  ),
  extension_months AS (
    SELECT
      lp.*,
      month_start::DATE,
      (month_start + INTERVAL '1 month - 1 day')::DATE AS month_end
    FROM legal_period lp
    CROSS JOIN LATERAL GENERATE_SERIES(
      DATE_TRUNC('month', lp.extension_start_date::TIMESTAMP),
      DATE_TRUNC('month', lp.rent_cutoff_date::TIMESTAMP),
      INTERVAL '1 month'
    ) month_start
    WHERE lp.contract_status = 'under_legal_procedure'
      AND lp.monthly_amount > 0
      AND lp.vehicle_returned IS NOT TRUE
      AND lp.vehicle_custody = 'with_defendant'
      AND lp.extension_start_date <= lp.rent_cutoff_date
  ),
  extension_amount AS (
    SELECT COALESCE(SUM(
      em.monthly_amount
      * (
          LEAST(em.rent_cutoff_date, em.month_end)
          - GREATEST(em.extension_start_date, em.month_start)
          + 1
        )::NUMERIC
      / EXTRACT(DAY FROM em.month_end)::NUMERIC
    ), 0) AS amount
    FROM extension_months em
  ),
  contractual_raw AS (
    SELECT
      CASE p.contractual_compensation_method
        WHEN 'fixed' THEN p.contractual_compensation_rate
        WHEN 'daily' THEN COALESCE((
          SELECT SUM(GREATEST(p_as_of_date - r.due_date, 0) * p.contractual_compensation_rate)
          FROM claim_rows r
        ), 0)
        WHEN 'monthly' THEN COALESCE((
          SELECT COUNT(DISTINCT DATE_TRUNC('month', r.due_date::TIMESTAMP))
            * p.contractual_compensation_rate
          FROM claim_rows r
        ), 0)
        WHEN 'per_invoice' THEN (
          SELECT COUNT(*) * p.contractual_compensation_rate FROM claim_rows
        )
        ELSE 0
      END AS amount,
      p.contractual_compensation_cap AS cap
    FROM profile p
    WHERE p.contractual_compensation_enabled
      AND NULLIF(BTRIM(p.contractual_compensation_clause_number), '') IS NOT NULL
      AND NULLIF(BTRIM(p.contractual_compensation_clause_text), '') IS NOT NULL
      AND p.contractual_compensation_method IN ('fixed', 'daily', 'monthly', 'per_invoice')
      AND p.contractual_compensation_rate > 0
      AND p.contractual_compensation_document_id IS NOT NULL
  ),
  extras AS (
    SELECT
      COALESCE((
        SELECT CASE WHEN cap IS NULL THEN amount ELSE LEAST(amount, GREATEST(cap, 0)) END
        FROM contractual_raw
      ), 0) AS contractual_amount,
      COALESCE((
        SELECT SUM(GREATEST(
          d.amount - COALESCE(d.depreciation_deduction, 0) - COALESCE(d.insurance_recovery, 0),
          0
        ))
        FROM public.legal_case_damage_costs d
        WHERE d.company_id = p_company_id
          AND d.contract_id = p_contract_id
          AND d.verified
          AND d.evidence_document_id IS NOT NULL
      ), 0) AS damage_amount,
      CASE WHEN EXISTS (
        SELECT 1
        FROM public.contract_documents d
        WHERE d.company_id = p_company_id
          AND d.contract_id = p_contract_id
          AND d.document_type = 'violations_proof'
          AND d.file_path IS NOT NULL
      ) THEN COALESCE((
        SELECT SUM(COALESCE(pe.amount, 0))
        FROM public.penalties pe
        WHERE pe.company_id = p_company_id
          AND pe.contract_id = p_contract_id
          AND COALESCE(pe.payment_status, '') <> 'paid'
          AND COALESCE(pe.status, '') <> 'cancelled'
      ), 0) ELSE 0 END AS violations_amount,
      COALESCE((
        SELECT
          GREATEST(
            LEAST(p_as_of_date, COALESCE(lp.vehicle_returned_at, p_as_of_date))
              - (lp.rescission_effective_date + 1) + 1,
            0
          ) * lp.retention_daily_rate
        FROM legal_period lp
        WHERE lp.vehicle_custody = 'with_defendant'
          AND lp.vehicle_returned IS NOT TRUE
          AND lp.rescission_effective_date IS NOT NULL
          AND lp.rescission_effective_date < LEAST(
            p_as_of_date,
            COALESCE(lp.vehicle_returned_at, p_as_of_date)
          )
          AND lp.retention_daily_rate > 0
          AND lp.retention_rate_source IS NOT NULL
          AND NULLIF(BTRIM(lp.retention_rate_source_ref), '') IS NOT NULL
          AND lp.retention_rate_source_document_id IS NOT NULL
      ), 0) AS retention_amount,
      COALESCE((
        SELECT CASE WHEN p.apply_security_deposit
          THEN GREATEST(COALESCE(p.security_deposit_amount, 0), 0)
          ELSE 0
        END
        FROM profile p
      ), 0) AS deposit_deduction
  ),
  totals AS (
    SELECT
      COALESCE((SELECT SUM(amount) FROM claim_rows), 0) AS recorded_due_amount,
      COALESCE((SELECT amount FROM extension_amount), 0) AS legal_extension_rent_amount,
      e.contractual_amount,
      e.damage_amount,
      e.violations_amount,
      e.retention_amount,
      e.deposit_deduction
    FROM extras e
  )
  SELECT JSONB_BUILD_OBJECT(
    'recorded_due_amount', ROUND(t.recorded_due_amount, 2),
    'legal_extension_rent_amount', ROUND(t.legal_extension_rent_amount, 2),
    'contractual_compensation_amount', ROUND(t.contractual_amount, 2),
    'damage_amount', ROUND(t.damage_amount, 2),
    'violations_amount', ROUND(t.violations_amount, 2),
    'retention_amount', ROUND(t.retention_amount, 2),
    'deposit_deduction', ROUND(t.deposit_deduction, 2),
    'total', ROUND(GREATEST(
      t.recorded_due_amount
        + t.legal_extension_rent_amount
        + t.contractual_amount
        + t.damage_amount
        + t.violations_amount
        + t.retention_amount
        - t.deposit_deduction,
      0
    ), 2),
    'extension_start_date', (SELECT extension_start_date FROM legal_period),
    'rent_cutoff_date', (SELECT rent_cutoff_date FROM legal_period),
    'retention_start_date', (
      SELECT rescission_effective_date + 1 FROM legal_period
    ),
    'as_of_date', p_as_of_date
  )
  FROM totals t;
$$;

CREATE OR REPLACE FUNCTION public.calculate_legal_claim_amount_v1(
  p_company_id UUID,
  p_contract_id UUID,
  p_as_of_date DATE DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::DATE)
)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
  SELECT COALESCE(
    (public.calculate_legal_claim_breakdown_v2(
      p_company_id,
      p_contract_id,
      p_as_of_date
    ) ->> 'total')::NUMERIC,
    0
  );
$$;

REVOKE ALL ON FUNCTION public.calculate_legal_claim_breakdown_v2(UUID, UUID, DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.calculate_legal_claim_breakdown_v2(UUID, UUID, DATE) FROM anon;
GRANT EXECUTE ON FUNCTION public.calculate_legal_claim_breakdown_v2(UUID, UUID, DATE) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.calculate_legal_claim_amount_v1(UUID, UUID, DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.calculate_legal_claim_amount_v1(UUID, UUID, DATE) FROM anon;
GRANT EXECUTE ON FUNCTION public.calculate_legal_claim_amount_v1(UUID, UUID, DATE) TO authenticated, service_role;

COMMENT ON FUNCTION public.calculate_legal_claim_breakdown_v2(UUID, UUID, DATE) IS
  'Evidence-aware legal claim breakdown. Extends contractual rent only after recorded contract coverage, stops at effective rescission/judgment/return, and begins retention the next day without overlap.';

-- Production data correction explicitly authorized on 2026-08-30.  The list is
-- intentionally closed: no customer identity, customer_id, or unrelated contract
-- is updated by this block.
DO $migration$
DECLARE
  v_company_id CONSTANT UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4'::UUID;
  v_contract_numbers CONSTANT TEXT[] := ARRAY[
    'AGR-202504-400949', 'AGR-202504-406129', 'AGR-202504-424958',
    'C-ALF-0001', 'C-ALF-0008', 'C-ALF-0014', 'C-ALF-0023',
    'C-ALF-0025', 'C-ALF-0033', 'C-ALF-0039', 'C-ALF-0042',
    'C-ALF-0067', 'C-ALF-0083', 'CON-25-ZV0RA7',
    'HIST-XLS-B70-706150', 'HIST-XLS-T77-5900', 'LTO2024141',
    'LTO2024263', 'LTO2024270', 'LTO2024284'
  ];
  v_contract RECORD;
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.contracts c
  WHERE c.company_id = v_company_id
    AND c.contract_number = ANY(v_contract_numbers);

  IF v_count <> CARDINALITY(v_contract_numbers) THEN
    RAISE EXCEPTION 'Expected % authorized legal contracts, found %',
      CARDINALITY(v_contract_numbers), v_count;
  END IF;

  UPDATE public.contracts c
  SET vehicle_returned = FALSE,
      updated_at = NOW()
  WHERE c.company_id = v_company_id
    AND c.contract_number = ANY(v_contract_numbers)
    AND c.vehicle_returned IS DISTINCT FROM FALSE;

  FOR v_contract IN
    SELECT c.id
    FROM public.contracts c
    WHERE c.company_id = v_company_id
      AND c.contract_number = ANY(v_contract_numbers)
    ORDER BY c.contract_number
  LOOP
    PERFORM public.repair_legal_preparation_case_v1(
      v_company_id,
      v_contract.id,
      NULL
    );
  END LOOP;

  UPDATE public.legal_case_litigation_profile p
  SET case_id = COALESCE((
        SELECT lc.id
        FROM public.legal_cases lc
        WHERE lc.company_id = p.company_id
          AND lc.contract_id = p.contract_id
          AND LOWER(COALESCE(lc.case_status, '')) <> 'cancelled'
        ORDER BY lc.created_at DESC
        LIMIT 1
      ), p.case_id),
      rescission_strategy = 'judicial_rescission',
      termination_type = 'judicial_rescission',
      termination_date = NULL,
      termination_date_source = NULL,
      termination_date_status = 'requires_judicial_proof',
      termination_supporting_document_id = NULL,
      vehicle_custody = 'with_defendant',
      vehicle_returned_at = NULL,
      vehicle_return_document_id = NULL,
      legal_review_status = CASE
        WHEN p.legal_review_status = 'approved' THEN p.legal_review_status
        ELSE 'draft'
      END,
      notes = CASE
        WHEN COALESCE(p.notes, '') LIKE '%[system-seed:legal-accrual-continuation:20260830150243]%'
          THEN p.notes
        ELSE CONCAT_WS(E'\n', NULLIF(p.notes, ''),
          '[system-seed:legal-accrual-continuation:20260830150243] المركبة ما زالت في حيازة المدعى عليه؛ تستمر الأجرة حتى صيرورة الفسخ منتجاً لآثاره، ثم يبدأ تعويض الاحتباس دون تداخل وبعد استكمال دليله.')
      END,
      updated_at = NOW()
  FROM public.contracts c
  WHERE p.company_id = v_company_id
    AND p.contract_id = c.id
    AND c.company_id = v_company_id
    AND c.contract_number = ANY(v_contract_numbers);

  UPDATE public.legal_cases lc
  SET case_value = public.calculate_legal_claim_amount_v1(
        lc.company_id,
        lc.contract_id,
        (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Qatar')::DATE
      ),
      updated_at = NOW()
  FROM public.contracts c
  WHERE lc.company_id = v_company_id
    AND lc.contract_id = c.id
    AND c.company_id = v_company_id
    AND c.contract_number = ANY(v_contract_numbers)
    AND lc.workflow_stage = 'preparation';
END;
$migration$;
