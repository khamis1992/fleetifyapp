-- Annual financial close foundation:
-- closes revenue/expense accounts into retained earnings and creates the next
-- fiscal year's opening balance entry from balance sheet accounts.

CREATE TABLE IF NOT EXISTS public.annual_financial_close_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  fiscal_year INTEGER NOT NULL CHECK (fiscal_year >= 2000),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  retained_earnings_account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT,
  closing_journal_entry_id UUID REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  opening_journal_entry_id UUID REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  revenue_total NUMERIC(14, 3) NOT NULL DEFAULT 0,
  expense_total NUMERIC(14, 3) NOT NULL DEFAULT 0,
  net_income NUMERIC(14, 3) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'calculated', 'closed', 'voided')),
  requested_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT annual_financial_close_period_valid CHECK (period_end >= period_start),
  CONSTRAINT annual_financial_close_unique_year UNIQUE (company_id, fiscal_year)
);

CREATE TABLE IF NOT EXISTS public.annual_financial_close_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  close_run_id UUID NOT NULL REFERENCES public.annual_financial_close_runs(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT,
  line_type TEXT NOT NULL CHECK (line_type IN ('income_close', 'opening_balance')),
  debit_amount NUMERIC(14, 3) NOT NULL DEFAULT 0 CHECK (debit_amount >= 0),
  credit_amount NUMERIC(14, 3) NOT NULL DEFAULT 0 CHECK (credit_amount >= 0),
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT annual_financial_close_line_amount CHECK (debit_amount > 0 OR credit_amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_annual_financial_close_runs_company_year
  ON public.annual_financial_close_runs(company_id, fiscal_year DESC);

CREATE INDEX IF NOT EXISTS idx_annual_financial_close_lines_run_type
  ON public.annual_financial_close_lines(close_run_id, line_type);

ALTER TABLE public.annual_financial_close_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annual_financial_close_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS annual_financial_close_runs_company_access ON public.annual_financial_close_runs;
CREATE POLICY annual_financial_close_runs_company_access
  ON public.annual_financial_close_runs
  FOR ALL
  TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

DROP POLICY IF EXISTS annual_financial_close_lines_company_access ON public.annual_financial_close_lines;
CREATE POLICY annual_financial_close_lines_company_access
  ON public.annual_financial_close_lines
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.annual_financial_close_runs run
      WHERE run.id = close_run_id
        AND run.company_id = get_user_company_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.annual_financial_close_runs run
      WHERE run.id = close_run_id
        AND run.company_id = get_user_company_id()
    )
  );

CREATE OR REPLACE FUNCTION public.calculate_annual_financial_close(
  p_company_id UUID,
  p_fiscal_year INTEGER,
  p_period_start DATE,
  p_period_end DATE,
  p_retained_earnings_account_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run_id UUID;
  v_revenue_total NUMERIC(14, 3);
  v_expense_total NUMERIC(14, 3);
BEGIN
  IF p_company_id <> get_user_company_id() THEN
    RAISE EXCEPTION 'Cannot calculate annual close for another company';
  END IF;

  INSERT INTO public.annual_financial_close_runs (
    company_id,
    fiscal_year,
    period_start,
    period_end,
    retained_earnings_account_id,
    requested_by,
    notes
  )
  VALUES (
    p_company_id,
    p_fiscal_year,
    p_period_start,
    p_period_end,
    p_retained_earnings_account_id,
    auth.uid(),
    p_notes
  )
  ON CONFLICT (company_id, fiscal_year)
  DO UPDATE SET
    period_start = EXCLUDED.period_start,
    period_end = EXCLUDED.period_end,
    retained_earnings_account_id = EXCLUDED.retained_earnings_account_id,
    notes = EXCLUDED.notes,
    updated_at = now()
  WHERE annual_financial_close_runs.status IN ('draft', 'calculated')
  RETURNING id INTO v_run_id;

  IF v_run_id IS NULL THEN
    RAISE EXCEPTION 'Annual financial close for this year is already closed';
  END IF;

  DELETE FROM public.annual_financial_close_lines WHERE close_run_id = v_run_id;

  INSERT INTO public.annual_financial_close_lines (
    close_run_id,
    account_id,
    line_type,
    debit_amount,
    credit_amount,
    description
  )
  SELECT
    v_run_id,
    coa.id,
    'income_close',
    CASE
      WHEN lower(coa.account_type) IN ('revenue', 'income')
        THEN ROUND(SUM(COALESCE(jel.credit_amount, 0) - COALESCE(jel.debit_amount, 0)), 3)
      ELSE 0
    END,
    CASE
      WHEN lower(coa.account_type) = 'expense'
        THEN ROUND(SUM(COALESCE(jel.debit_amount, 0) - COALESCE(jel.credit_amount, 0)), 3)
      ELSE 0
    END,
    CASE
      WHEN lower(coa.account_type) = 'expense'
        THEN 'Close expense account to retained earnings'
      ELSE 'Close revenue account to retained earnings'
    END
  FROM public.journal_entries je
  JOIN public.journal_entry_lines jel ON jel.journal_entry_id = je.id
  JOIN public.chart_of_accounts coa ON coa.id = jel.account_id
  WHERE je.company_id = p_company_id
    AND je.status = 'posted'
    AND je.entry_date BETWEEN p_period_start AND p_period_end
    AND lower(coa.account_type) IN ('revenue', 'income', 'expense')
  GROUP BY coa.id, coa.account_type
  HAVING ABS(SUM(COALESCE(jel.debit_amount, 0) - COALESCE(jel.credit_amount, 0))) > 0.01
      OR ABS(SUM(COALESCE(jel.credit_amount, 0) - COALESCE(jel.debit_amount, 0))) > 0.01;

  SELECT
    COALESCE(ROUND(SUM(CASE WHEN lower(coa.account_type) IN ('revenue', 'income') THEN COALESCE(jel.credit_amount, 0) - COALESCE(jel.debit_amount, 0) ELSE 0 END), 3), 0),
    COALESCE(ROUND(SUM(CASE WHEN lower(coa.account_type) = 'expense' THEN COALESCE(jel.debit_amount, 0) - COALESCE(jel.credit_amount, 0) ELSE 0 END), 3), 0)
  INTO v_revenue_total, v_expense_total
  FROM public.journal_entries je
  JOIN public.journal_entry_lines jel ON jel.journal_entry_id = je.id
  JOIN public.chart_of_accounts coa ON coa.id = jel.account_id
  WHERE je.company_id = p_company_id
    AND je.status = 'posted'
    AND je.entry_date BETWEEN p_period_start AND p_period_end
    AND lower(coa.account_type) IN ('revenue', 'income', 'expense');

  IF v_revenue_total - v_expense_total > 0.01 THEN
    INSERT INTO public.annual_financial_close_lines (
      close_run_id,
      account_id,
      line_type,
      debit_amount,
      credit_amount,
      description
    )
    VALUES (
      v_run_id,
      p_retained_earnings_account_id,
      'income_close',
      0,
      v_revenue_total - v_expense_total,
      'Transfer annual profit to retained earnings'
    );
  ELSIF v_revenue_total - v_expense_total < -0.01 THEN
    INSERT INTO public.annual_financial_close_lines (
      close_run_id,
      account_id,
      line_type,
      debit_amount,
      credit_amount,
      description
    )
    VALUES (
      v_run_id,
      p_retained_earnings_account_id,
      'income_close',
      ABS(v_revenue_total - v_expense_total),
      0,
      'Transfer annual loss to retained earnings'
    );
  END IF;

  INSERT INTO public.annual_financial_close_lines (
    close_run_id,
    account_id,
    line_type,
    debit_amount,
    credit_amount,
    description
  )
  SELECT
    v_run_id,
    coa.id,
    'opening_balance',
    CASE
      WHEN lower(coa.account_type) = 'asset'
        THEN GREATEST(ROUND(SUM(COALESCE(jel.debit_amount, 0) - COALESCE(jel.credit_amount, 0)), 3), 0)
      ELSE GREATEST(ROUND(SUM(COALESCE(jel.debit_amount, 0) - COALESCE(jel.credit_amount, 0)), 3) * -1, 0)
    END,
    CASE
      WHEN lower(coa.account_type) = 'asset'
        THEN GREATEST(ROUND(SUM(COALESCE(jel.debit_amount, 0) - COALESCE(jel.credit_amount, 0)), 3) * -1, 0)
      ELSE GREATEST(ROUND(SUM(COALESCE(jel.credit_amount, 0) - COALESCE(jel.debit_amount, 0)), 3), 0)
    END,
    'Opening balance carried from prior fiscal year'
  FROM public.journal_entries je
  JOIN public.journal_entry_lines jel ON jel.journal_entry_id = je.id
  JOIN public.chart_of_accounts coa ON coa.id = jel.account_id
  WHERE je.company_id = p_company_id
    AND je.status = 'posted'
    AND je.entry_date <= p_period_end
    AND lower(coa.account_type) IN ('asset', 'liability', 'equity')
  GROUP BY coa.id, coa.account_type
  HAVING ABS(SUM(COALESCE(jel.debit_amount, 0) - COALESCE(jel.credit_amount, 0))) > 0.01
      OR ABS(SUM(COALESCE(jel.credit_amount, 0) - COALESCE(jel.debit_amount, 0))) > 0.01;

  UPDATE public.annual_financial_close_runs
  SET
    revenue_total = v_revenue_total,
    expense_total = v_expense_total,
    net_income = v_revenue_total - v_expense_total,
    status = 'calculated',
    updated_at = now()
  WHERE id = v_run_id;

  RETURN v_run_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_annual_financial_close(
  p_close_run_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run public.annual_financial_close_runs%ROWTYPE;
  v_income_debit NUMERIC(14, 3);
  v_income_credit NUMERIC(14, 3);
  v_opening_debit NUMERIC(14, 3);
  v_opening_credit NUMERIC(14, 3);
BEGIN
  SELECT * INTO v_run
  FROM public.annual_financial_close_runs
  WHERE id = p_close_run_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Annual financial close run not found';
  END IF;

  IF v_run.company_id <> get_user_company_id() THEN
    RAISE EXCEPTION 'Cannot approve another company annual close';
  END IF;

  IF v_run.status <> 'calculated' THEN
    RAISE EXCEPTION 'Only calculated annual close runs can be approved';
  END IF;

  IF v_run.requested_by = auth.uid() THEN
    RAISE EXCEPTION 'Requester cannot approve their own annual close';
  END IF;

  SELECT
    COALESCE(SUM(debit_amount), 0),
    COALESCE(SUM(credit_amount), 0)
  INTO v_income_debit, v_income_credit
  FROM public.annual_financial_close_lines
  WHERE close_run_id = p_close_run_id
    AND line_type = 'income_close';

  SELECT
    COALESCE(SUM(debit_amount), 0),
    COALESCE(SUM(credit_amount), 0)
  INTO v_opening_debit, v_opening_credit
  FROM public.annual_financial_close_lines
  WHERE close_run_id = p_close_run_id
    AND line_type = 'opening_balance';

  IF ABS(v_income_debit - v_income_credit) > 0.01 THEN
    RAISE EXCEPTION 'Annual closing entry is not balanced';
  END IF;

  IF ABS(v_opening_debit - v_opening_credit) > 0.01 THEN
    RAISE EXCEPTION 'Opening balance entry is not balanced';
  END IF;

  UPDATE public.annual_financial_close_runs
  SET
    status = 'closed',
    approved_by = auth.uid(),
    approved_at = now(),
    closed_at = now(),
    updated_at = now()
  WHERE id = p_close_run_id;

  UPDATE public.accounting_periods
  SET status = 'closed', updated_at = now()
  WHERE company_id = v_run.company_id
    AND start_date >= v_run.period_start
    AND end_date <= v_run.period_end;

  RETURN jsonb_build_object(
    'close_run_id', p_close_run_id,
    'status', 'closed',
    'net_income', v_run.net_income
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_annual_financial_close(UUID, INTEGER, DATE, DATE, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_annual_financial_close(UUID) TO authenticated;
