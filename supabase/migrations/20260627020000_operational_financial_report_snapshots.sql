-- Extend auditable report snapshots to operational finance reports.

CREATE TABLE IF NOT EXISTS public.financial_report_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  as_of_date DATE,
  currency TEXT NOT NULL DEFAULT 'QAR',
  source_fingerprint TEXT NOT NULL,
  report_payload JSONB NOT NULL,
  total_debit NUMERIC(14, 3),
  total_credit NUMERIC(14, 3),
  total_assets NUMERIC(14, 3),
  total_liabilities NUMERIC(14, 3),
  total_equity NUMERIC(14, 3),
  total_revenue NUMERIC(14, 3),
  total_expenses NUMERIC(14, 3),
  net_income NUMERIC(14, 3),
  imbalance NUMERIC(14, 3) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published'
    CHECK (status IN ('draft', 'published', 'approved', 'archived', 'voided')),
  generated_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT financial_report_snapshot_date_scope CHECK (
    as_of_date IS NOT NULL OR (period_start IS NOT NULL AND period_end IS NOT NULL AND period_end >= period_start)
  )
);

ALTER TABLE public.financial_report_snapshots
  DROP CONSTRAINT IF EXISTS financial_report_snapshots_report_type_check;

ALTER TABLE public.financial_report_snapshots
  ADD CONSTRAINT financial_report_snapshots_report_type_check
  CHECK (report_type IN (
    'trial_balance',
    'income_statement',
    'balance_sheet',
    'cash_flow',
    'general_ledger',
    'receivables_aging',
    'bank_reconciliation',
    'consolidated_trial_balance'
  ));

CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_report_snapshots_unique_source
  ON public.financial_report_snapshots(company_id, report_type, COALESCE(period_start, as_of_date), COALESCE(period_end, as_of_date), source_fingerprint)
  WHERE status <> 'voided';

CREATE INDEX IF NOT EXISTS idx_financial_report_snapshots_company_type_date
  ON public.financial_report_snapshots(company_id, report_type, created_at DESC);

ALTER TABLE public.financial_report_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS financial_report_snapshots_company_access ON public.financial_report_snapshots;
CREATE POLICY financial_report_snapshots_company_access
  ON public.financial_report_snapshots
  FOR ALL
  TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE OR REPLACE FUNCTION public.publish_financial_report_snapshot(
  p_company_id UUID,
  p_report_type TEXT,
  p_period_start DATE,
  p_period_end DATE,
  p_as_of_date DATE,
  p_currency TEXT,
  p_source_fingerprint TEXT,
  p_report_payload JSONB,
  p_totals JSONB DEFAULT '{}'::jsonb,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_snapshot_id UUID;
BEGIN
  IF p_company_id <> get_user_company_id() THEN
    RAISE EXCEPTION 'Cannot publish a financial report snapshot for another company';
  END IF;

  IF p_report_type NOT IN (
    'trial_balance',
    'income_statement',
    'balance_sheet',
    'cash_flow',
    'general_ledger',
    'receivables_aging',
    'bank_reconciliation',
    'consolidated_trial_balance'
  ) THEN
    RAISE EXCEPTION 'Unsupported financial report type';
  END IF;

  IF p_source_fingerprint IS NULL OR length(trim(p_source_fingerprint)) = 0 THEN
    RAISE EXCEPTION 'Financial report source fingerprint is required';
  END IF;

  INSERT INTO public.financial_report_snapshots (
    company_id,
    report_type,
    period_start,
    period_end,
    as_of_date,
    currency,
    source_fingerprint,
    report_payload,
    total_debit,
    total_credit,
    total_assets,
    total_liabilities,
    total_equity,
    total_revenue,
    total_expenses,
    net_income,
    imbalance,
    status,
    generated_by,
    notes
  )
  VALUES (
    p_company_id,
    p_report_type,
    p_period_start,
    p_period_end,
    p_as_of_date,
    COALESCE(NULLIF(trim(p_currency), ''), 'QAR'),
    p_source_fingerprint,
    p_report_payload,
    NULLIF(p_totals->>'totalDebit', '')::numeric,
    NULLIF(p_totals->>'totalCredit', '')::numeric,
    NULLIF(p_totals->>'totalAssets', '')::numeric,
    NULLIF(p_totals->>'totalLiabilities', '')::numeric,
    NULLIF(p_totals->>'totalEquity', '')::numeric,
    NULLIF(p_totals->>'revenue', '')::numeric,
    NULLIF(p_totals->>'expenses', '')::numeric,
    NULLIF(p_totals->>'netIncome', '')::numeric,
    COALESCE(NULLIF(p_totals->>'imbalance', '')::numeric, 0),
    'published',
    auth.uid(),
    p_notes
  )
  RETURNING id INTO v_snapshot_id;

  RETURN v_snapshot_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.publish_operational_financial_report_snapshot(
  p_company_id UUID,
  p_report_type TEXT,
  p_as_of_date DATE,
  p_currency TEXT,
  p_source_fingerprint TEXT,
  p_report_payload JSONB,
  p_totals JSONB DEFAULT '{}'::jsonb,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_snapshot_id UUID;
BEGIN
  IF p_report_type NOT IN ('general_ledger', 'receivables_aging', 'bank_reconciliation') THEN
    RAISE EXCEPTION 'Unsupported operational financial report type';
  END IF;

  v_snapshot_id := public.publish_financial_report_snapshot(
    p_company_id,
    p_report_type,
    NULL,
    NULL,
    p_as_of_date,
    p_currency,
    p_source_fingerprint,
    p_report_payload,
    p_totals,
    p_notes
  );

  RETURN v_snapshot_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.publish_financial_report_snapshot(UUID, TEXT, DATE, DATE, DATE, TEXT, TEXT, JSONB, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_operational_financial_report_snapshot(UUID, TEXT, DATE, TEXT, TEXT, JSONB, JSONB, TEXT) TO authenticated;
