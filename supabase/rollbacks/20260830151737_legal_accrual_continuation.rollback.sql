-- Revert the legal-accrual engine to the evidence-only calculation that was in
-- force before 20260830150243.  The two corrected return flags are restored to
-- their prior values; generated legal records are cancelled rather than erased.

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
  WITH due_invoices AS (
    SELECT i.due_date,
      GREATEST(COALESCE(i.balance_due, i.total_amount - COALESCE(i.paid_amount, 0)), 0) AS amount
    FROM public.invoices i
    WHERE i.company_id = p_company_id
      AND i.contract_id = p_contract_id
      AND i.due_date <= p_as_of_date
      AND LOWER(COALESCE(i.status, '')) NOT IN ('cancelled', 'canceled', 'voided', 'reversed')
      AND LOWER(COALESCE(i.payment_status, '')) NOT IN ('cancelled', 'canceled', 'voided', 'reversed')
  ),
  due_schedules AS (
    SELECT s.due_date, GREATEST(s.amount - COALESCE(s.paid_amount, 0), 0) AS amount
    FROM public.contract_payment_schedules s
    WHERE s.company_id = p_company_id
      AND s.contract_id = p_contract_id
      AND s.due_date <= p_as_of_date
      AND s.invoice_id IS NULL
      AND LOWER(COALESCE(s.status, '')) NOT IN ('paid', 'cancelled', 'canceled', 'voided', 'reversed')
      AND NOT EXISTS (
        SELECT 1 FROM public.invoices i
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
  profile AS (
    SELECT p.* FROM public.legal_case_litigation_profile p
    WHERE p.company_id = p_company_id AND p.contract_id = p_contract_id
  ),
  contractual_raw AS (
    SELECT CASE p.contractual_compensation_method
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
      COALESCE((SELECT CASE WHEN cap IS NULL THEN amount
        ELSE LEAST(amount, GREATEST(cap, 0)) END FROM contractual_raw), 0) AS contractual_amount,
      COALESCE((
        SELECT SUM(GREATEST(
          d.amount - COALESCE(d.depreciation_deduction, 0) - COALESCE(d.insurance_recovery, 0), 0
        ))
        FROM public.legal_case_damage_costs d
        WHERE d.company_id = p_company_id
          AND d.contract_id = p_contract_id
          AND d.verified
          AND d.evidence_document_id IS NOT NULL
      ), 0) AS damage_amount,
      CASE WHEN EXISTS (
        SELECT 1 FROM public.contract_documents d
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
        SELECT GREATEST(p_as_of_date - p.termination_date, 0) * p.retention_daily_rate
        FROM profile p
        WHERE p.vehicle_custody = 'with_defendant'
          AND p.rescission_strategy IN ('natural_expiry', 'documented_termination')
          AND p.termination_date IS NOT NULL
          AND p.termination_date_status = 'confirmed'
          AND p.termination_supporting_document_id IS NOT NULL
          AND p.retention_daily_rate > 0
          AND p.retention_rate_source IS NOT NULL
          AND NULLIF(BTRIM(p.retention_rate_source_ref), '') IS NOT NULL
          AND p.retention_rate_source_document_id IS NOT NULL
      ), 0) AS retention_amount,
      COALESCE((SELECT CASE WHEN p.apply_security_deposit
        THEN GREATEST(COALESCE(p.security_deposit_amount, 0), 0)
        ELSE 0 END FROM profile p), 0) AS deposit_deduction
  )
  SELECT GREATEST(
    COALESCE((SELECT SUM(amount) FROM claim_rows), 0)
      + contractual_amount + damage_amount + violations_amount + retention_amount - deposit_deduction,
    0
  )
  FROM extras;
$$;

REVOKE ALL ON FUNCTION public.calculate_legal_claim_amount_v1(UUID, UUID, DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.calculate_legal_claim_amount_v1(UUID, UUID, DATE) FROM anon;
GRANT EXECUTE ON FUNCTION public.calculate_legal_claim_amount_v1(UUID, UUID, DATE) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.calculate_legal_claim_breakdown_v2(UUID, UUID, DATE);

DO $rollback$
DECLARE
  v_company_id CONSTANT UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4'::UUID;
BEGIN
  UPDATE public.contracts c
  SET vehicle_returned = TRUE,
      updated_at = NOW()
  WHERE c.company_id = v_company_id
    AND c.contract_number IN ('C-ALF-0025', 'HIST-XLS-T77-5900');

  DELETE FROM public.legal_case_litigation_profile p
  USING public.contracts c
  WHERE p.company_id = v_company_id
    AND p.contract_id = c.id
    AND c.company_id = v_company_id
    AND COALESCE(p.notes, '') LIKE '%[system-seed:legal-filing-readiness]%'
    AND COALESCE(p.notes, '') LIKE '%[system-seed:legal-accrual-continuation:20260830150243]%'
    AND p.legal_review_status = 'draft';

  UPDATE public.legal_case_litigation_profile p
  SET notes = BTRIM(REPLACE(
        COALESCE(p.notes, ''),
        '[system-seed:legal-accrual-continuation:20260830150243] المركبة ما زالت في حيازة المدعى عليه؛ تستمر الأجرة حتى صيرورة الفسخ منتجاً لآثاره، ثم يبدأ تعويض الاحتباس دون تداخل وبعد استكمال دليله.',
        ''
      )),
      updated_at = NOW()
  FROM public.contracts c
  WHERE p.company_id = v_company_id
    AND p.contract_id = c.id
    AND c.company_id = v_company_id
    AND COALESCE(p.notes, '') LIKE '%[system-seed:legal-accrual-continuation:20260830150243]%';
END;
$rollback$;
