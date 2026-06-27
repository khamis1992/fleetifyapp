-- Multi-company financial consolidation foundation.
-- Consolidation runs preserve source companies, aggregated account balances,
-- and intercompany eliminations for audit-ready group reporting.

CREATE TABLE IF NOT EXISTS public.financial_consolidation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  run_number TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  target_currency TEXT NOT NULL DEFAULT 'QAR',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'calculated', 'approved', 'locked', 'cancelled')),
  total_debit NUMERIC(14, 3) NOT NULL DEFAULT 0,
  total_credit NUMERIC(14, 3) NOT NULL DEFAULT 0,
  imbalance NUMERIC(14, 3) NOT NULL DEFAULT 0,
  company_count INTEGER NOT NULL DEFAULT 0 CHECK (company_count >= 0),
  elimination_count INTEGER NOT NULL DEFAULT 0 CHECK (elimination_count >= 0),
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT financial_consolidation_period_valid CHECK (period_end >= period_start),
  CONSTRAINT financial_consolidation_run_number_unique UNIQUE (parent_company_id, run_number)
);

CREATE TABLE IF NOT EXISTS public.financial_consolidation_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.financial_consolidation_runs(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  source_currency TEXT NOT NULL DEFAULT 'QAR',
  exchange_rate NUMERIC(18, 8) NOT NULL DEFAULT 1 CHECK (exchange_rate > 0),
  included_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  included_by UUID REFERENCES auth.users(id),
  CONSTRAINT financial_consolidation_company_unique UNIQUE (run_id, company_id)
);

CREATE TABLE IF NOT EXISTS public.financial_consolidation_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.financial_consolidation_runs(id) ON DELETE CASCADE,
  account_code TEXT NOT NULL,
  account_name TEXT,
  account_name_ar TEXT,
  account_type TEXT NOT NULL,
  source_debit NUMERIC(14, 3) NOT NULL DEFAULT 0,
  source_credit NUMERIC(14, 3) NOT NULL DEFAULT 0,
  elimination_debit NUMERIC(14, 3) NOT NULL DEFAULT 0,
  elimination_credit NUMERIC(14, 3) NOT NULL DEFAULT 0,
  consolidated_debit NUMERIC(14, 3) NOT NULL DEFAULT 0,
  consolidated_credit NUMERIC(14, 3) NOT NULL DEFAULT 0,
  consolidated_balance NUMERIC(14, 3) NOT NULL DEFAULT 0,
  source_company_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT financial_consolidation_line_unique UNIQUE (run_id, account_code)
);

CREATE TABLE IF NOT EXISTS public.financial_consolidation_eliminations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.financial_consolidation_runs(id) ON DELETE CASCADE,
  account_code TEXT NOT NULL,
  debit_amount NUMERIC(14, 3) NOT NULL DEFAULT 0 CHECK (debit_amount >= 0),
  credit_amount NUMERIC(14, 3) NOT NULL DEFAULT 0 CHECK (credit_amount >= 0),
  reason TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT financial_consolidation_elimination_amount CHECK (debit_amount > 0 OR credit_amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_financial_consolidation_runs_parent_period
  ON public.financial_consolidation_runs(parent_company_id, period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_financial_consolidation_companies_run
  ON public.financial_consolidation_companies(run_id, company_id);

CREATE INDEX IF NOT EXISTS idx_financial_consolidation_lines_run_account
  ON public.financial_consolidation_lines(run_id, account_code);

CREATE INDEX IF NOT EXISTS idx_financial_consolidation_eliminations_run
  ON public.financial_consolidation_eliminations(run_id, account_code);

ALTER TABLE public.financial_consolidation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_consolidation_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_consolidation_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_consolidation_eliminations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS financial_consolidation_runs_parent_company_access ON public.financial_consolidation_runs;
CREATE POLICY financial_consolidation_runs_parent_company_access
  ON public.financial_consolidation_runs
  FOR ALL
  TO authenticated
  USING (parent_company_id = get_user_company_id())
  WITH CHECK (parent_company_id = get_user_company_id());

DROP POLICY IF EXISTS financial_consolidation_companies_run_access ON public.financial_consolidation_companies;
CREATE POLICY financial_consolidation_companies_run_access
  ON public.financial_consolidation_companies
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.financial_consolidation_runs run
      WHERE run.id = run_id
        AND run.parent_company_id = get_user_company_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.financial_consolidation_runs run
      WHERE run.id = run_id
        AND run.parent_company_id = get_user_company_id()
    )
  );

DROP POLICY IF EXISTS financial_consolidation_lines_run_access ON public.financial_consolidation_lines;
CREATE POLICY financial_consolidation_lines_run_access
  ON public.financial_consolidation_lines
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.financial_consolidation_runs run
      WHERE run.id = run_id
        AND run.parent_company_id = get_user_company_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.financial_consolidation_runs run
      WHERE run.id = run_id
        AND run.parent_company_id = get_user_company_id()
    )
  );

DROP POLICY IF EXISTS financial_consolidation_eliminations_run_access ON public.financial_consolidation_eliminations;
CREATE POLICY financial_consolidation_eliminations_run_access
  ON public.financial_consolidation_eliminations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.financial_consolidation_runs run
      WHERE run.id = run_id
        AND run.parent_company_id = get_user_company_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.financial_consolidation_runs run
      WHERE run.id = run_id
        AND run.parent_company_id = get_user_company_id()
    )
  );

CREATE OR REPLACE FUNCTION public.recalculate_financial_consolidation_run(p_run_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run public.financial_consolidation_runs%ROWTYPE;
  v_total_debit NUMERIC(14, 3);
  v_total_credit NUMERIC(14, 3);
  v_imbalance NUMERIC(14, 3);
BEGIN
  SELECT * INTO v_run
  FROM public.financial_consolidation_runs
  WHERE id = p_run_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Financial consolidation run not found';
  END IF;

  IF v_run.status IN ('approved', 'locked') THEN
    RAISE EXCEPTION 'Approved or locked consolidation runs cannot be recalculated';
  END IF;

  DELETE FROM public.financial_consolidation_lines
  WHERE run_id = p_run_id;

  INSERT INTO public.financial_consolidation_lines (
    run_id,
    account_code,
    account_name,
    account_name_ar,
    account_type,
    source_debit,
    source_credit,
    elimination_debit,
    elimination_credit,
    consolidated_debit,
    consolidated_credit,
    consolidated_balance,
    source_company_ids
  )
  WITH source_lines AS (
    SELECT
      coa.account_code,
      MAX(coa.account_name) AS account_name,
      MAX(coa.account_name_ar) AS account_name_ar,
      MAX(coa.account_type) AS account_type,
      ROUND(SUM(COALESCE(jel.debit_amount, 0) * fcc.exchange_rate), 3) AS source_debit,
      ROUND(SUM(COALESCE(jel.credit_amount, 0) * fcc.exchange_rate), 3) AS source_credit,
      ARRAY_AGG(DISTINCT je.company_id) AS source_company_ids
    FROM public.financial_consolidation_companies fcc
    JOIN public.journal_entries je ON je.company_id = fcc.company_id
    JOIN public.journal_entry_lines jel ON jel.journal_entry_id = je.id
    JOIN public.chart_of_accounts coa ON coa.id = jel.account_id
    WHERE fcc.run_id = p_run_id
      AND je.status = 'posted'
      AND je.entry_date BETWEEN v_run.period_start AND v_run.period_end
    GROUP BY coa.account_code
  ),
  elimination_lines AS (
    SELECT
      account_code,
      ROUND(SUM(debit_amount), 3) AS elimination_debit,
      ROUND(SUM(credit_amount), 3) AS elimination_credit
    FROM public.financial_consolidation_eliminations
    WHERE run_id = p_run_id
    GROUP BY account_code
  )
  SELECT
    p_run_id,
    COALESCE(source_lines.account_code, elimination_lines.account_code),
    source_lines.account_name,
    source_lines.account_name_ar,
    COALESCE(source_lines.account_type, 'elimination'),
    COALESCE(source_lines.source_debit, 0),
    COALESCE(source_lines.source_credit, 0),
    COALESCE(elimination_lines.elimination_debit, 0),
    COALESCE(elimination_lines.elimination_credit, 0),
    COALESCE(source_lines.source_debit, 0) + COALESCE(elimination_lines.elimination_debit, 0),
    COALESCE(source_lines.source_credit, 0) + COALESCE(elimination_lines.elimination_credit, 0),
    COALESCE(source_lines.source_debit, 0)
      + COALESCE(elimination_lines.elimination_debit, 0)
      - COALESCE(source_lines.source_credit, 0)
      - COALESCE(elimination_lines.elimination_credit, 0),
    COALESCE(source_lines.source_company_ids, '{}')
  FROM source_lines
  FULL OUTER JOIN elimination_lines USING (account_code);

  SELECT
    COALESCE(ROUND(SUM(consolidated_debit), 3), 0),
    COALESCE(ROUND(SUM(consolidated_credit), 3), 0)
  INTO v_total_debit, v_total_credit
  FROM public.financial_consolidation_lines
  WHERE run_id = p_run_id;

  v_imbalance := ROUND(v_total_debit - v_total_credit, 3);

  UPDATE public.financial_consolidation_runs
  SET
    status = 'calculated',
    total_debit = v_total_debit,
    total_credit = v_total_credit,
    imbalance = v_imbalance,
    company_count = (
      SELECT COUNT(*) FROM public.financial_consolidation_companies WHERE run_id = p_run_id
    ),
    elimination_count = (
      SELECT COUNT(*) FROM public.financial_consolidation_eliminations WHERE run_id = p_run_id
    ),
    updated_at = now()
  WHERE id = p_run_id;

  RETURN jsonb_build_object(
    'run_id', p_run_id,
    'total_debit', v_total_debit,
    'total_credit', v_total_credit,
    'imbalance', v_imbalance,
    'is_balanced', ABS(v_imbalance) <= 0.01
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_financial_consolidation_run(p_run_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run public.financial_consolidation_runs%ROWTYPE;
BEGIN
  SELECT * INTO v_run
  FROM public.financial_consolidation_runs
  WHERE id = p_run_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Financial consolidation run not found';
  END IF;

  IF v_run.status <> 'calculated' THEN
    RAISE EXCEPTION 'Only calculated consolidation runs can be approved';
  END IF;

  IF ABS(v_run.imbalance) > 0.01 THEN
    RAISE EXCEPTION 'Unbalanced consolidation run cannot be approved';
  END IF;

  IF v_run.created_by = auth.uid() THEN
    RAISE EXCEPTION 'Creator cannot approve their own consolidation run';
  END IF;

  UPDATE public.financial_consolidation_runs
  SET
    status = 'approved',
    approved_by = auth.uid(),
    approved_at = now(),
    updated_at = now()
  WHERE id = p_run_id;

  RETURN jsonb_build_object('run_id', p_run_id, 'status', 'approved');
END;
$$;

CREATE OR REPLACE FUNCTION public.lock_financial_consolidation_run(p_run_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.financial_consolidation_runs
  SET
    status = 'locked',
    locked_at = now(),
    updated_at = now()
  WHERE id = p_run_id
    AND status = 'approved';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only approved consolidation runs can be locked';
  END IF;

  RETURN jsonb_build_object('run_id', p_run_id, 'status', 'locked');
END;
$$;

GRANT EXECUTE ON FUNCTION public.recalculate_financial_consolidation_run(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_financial_consolidation_run(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lock_financial_consolidation_run(UUID) TO authenticated;
