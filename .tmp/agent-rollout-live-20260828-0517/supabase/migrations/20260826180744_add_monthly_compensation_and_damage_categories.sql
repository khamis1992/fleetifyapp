-- Extend the evidence-gated legal memo model with a monthly contractual
-- compensation method and two separately provable damage categories.

ALTER TABLE public.legal_case_litigation_profile
    DROP CONSTRAINT IF EXISTS chk_contractual_compensation_evidence,
    ADD CONSTRAINT chk_contractual_compensation_evidence CHECK (
        contractual_compensation_enabled = false
        OR (
            NULLIF(BTRIM(contractual_compensation_clause_number), '') IS NOT NULL
            AND NULLIF(BTRIM(contractual_compensation_clause_text), '') IS NOT NULL
            AND contractual_compensation_method IN ('fixed', 'daily', 'monthly', 'per_invoice')
            AND contractual_compensation_rate > 0
            AND contractual_compensation_document_id IS NOT NULL
        )
    );

ALTER TABLE public.legal_case_damage_costs
    DROP CONSTRAINT IF EXISTS legal_case_damage_costs_cost_type_check,
    ADD CONSTRAINT legal_case_damage_costs_cost_type_check CHECK (cost_type IN (
        'recovery_towing',
        'non_standard_repairs',
        'parts_insurance_burden',
        'inspection_transport_storage',
        'monetary_delay_damage',
        'financing_burden_damage',
        'operational_loss',
        'early_termination_damage',
        'other'
    ));

-- Keep the database-side filing total identical to the TypeScript calculation.
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
          AND date_trunc('month', COALESCE(i.invoice_month, i.due_date)::timestamp)
              = date_trunc('month', s.due_date::timestamp)
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
        SELECT COUNT(DISTINCT date_trunc('month', r.due_date::timestamp))
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
          AND (
            p.rescission_strategy = 'natural_expiry'
            OR EXISTS (
              SELECT 1 FROM public.legal_case_formal_notices n
              WHERE n.company_id = p_company_id
                AND n.contract_id = p_contract_id
                AND n.notice_type = 'termination_notice'
                AND n.delivery_confirmed
                AND n.proof_document_id IS NOT NULL
                AND n.delivered_on IS NOT NULL
                AND p.termination_date >= n.delivered_on + COALESCE(n.grace_period_days, 0)
            )
          )
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

COMMENT ON COLUMN public.legal_case_litigation_profile.contractual_compensation_method IS
    'Evidence-backed calculation method: fixed, daily, monthly by distinct unpaid due month, or per_invoice.';

COMMENT ON COLUMN public.legal_case_damage_costs.cost_type IS
    'Evidence-backed damage category; financing burden and operational loss remain separate to prevent double recovery.';

;
