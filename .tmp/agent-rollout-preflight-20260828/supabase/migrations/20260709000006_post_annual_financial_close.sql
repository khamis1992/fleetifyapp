-- Phase 3: Fiscal Year Close - Post Closing Journal Entry
-- Converts calculated annual close lines into an actual journal entry.

CREATE OR REPLACE FUNCTION public.post_annual_financial_close(
  p_close_run_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run public.annual_financial_close_runs%ROWTYPE;
  v_entry_number TEXT;
  v_closing_entry_id UUID;
  v_opening_entry_id UUID;
  v_line record;
BEGIN
  SELECT * INTO v_run
  FROM public.annual_financial_close_runs
  WHERE id = p_close_run_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Annual financial close run not found';
  END IF;

  IF v_run.company_id <> get_user_company_id() THEN
    RAISE EXCEPTION 'Cannot post another company annual close';
  END IF;

  IF v_run.status <> 'closed' THEN
    RAISE EXCEPTION 'Only approved annual close runs can be posted';
  END IF;

  IF v_run.closing_journal_entry_id IS NOT NULL THEN
    RETURN v_run.closing_journal_entry_id;
  END IF;

  v_entry_number := 'CLOSE-' || v_run.fiscal_year || '-' || substring(v_run.id::text, 1, 8);

  INSERT INTO public.journal_entries (
    company_id, entry_number, entry_date, description,
    total_debit, total_credit, status, reference_type, reference_id, created_by
  )
  VALUES (
    v_run.company_id, v_entry_number, v_run.period_end,
    'Annual financial close ' || v_run.fiscal_year,
    v_run.revenue_total, v_run.expense_total,
    'posted', 'annual_close', v_run.id, v_run.requested_by
  )
  RETURNING id INTO v_closing_entry_id;

  FOR v_line IN
    SELECT * FROM public.annual_financial_close_lines
    WHERE close_run_id = p_close_run_id AND line_type = 'income_close'
  LOOP
    INSERT INTO public.journal_entry_lines (
      journal_entry_id, account_id, line_number, line_description, debit_amount, credit_amount
    )
    VALUES (
      v_closing_entry_id, v_line.account_id, v_line.line_number,
      v_line.description, v_line.debit_amount, v_line.credit_amount
    );
  END LOOP;

  v_entry_number := 'OPEN-' || (v_run.fiscal_year + 1) || '-' || substring(v_run.id::text, 1, 8);

  INSERT INTO public.journal_entries (
    company_id, entry_number, entry_date, description,
    total_debit, total_credit, status, reference_type, reference_id, created_by
  )
  VALUES (
    v_run.company_id, v_entry_number, v_run.period_start,
    'Opening balance ' || (v_run.fiscal_year + 1),
    v_run.net_income, v_run.net_income,
    'posted', 'annual_close_opening', v_run.id, v_run.requested_by
  )
  RETURNING id INTO v_opening_entry_id;

  FOR v_line IN
    SELECT * FROM public.annual_financial_close_lines
    WHERE close_run_id = p_close_run_id AND line_type = 'opening_balance'
  LOOP
    INSERT INTO public.journal_entry_lines (
      journal_entry_id, account_id, line_number, line_description, debit_amount, credit_amount
    )
    VALUES (
      v_opening_entry_id, v_line.account_id, v_line.line_number,
      v_line.description, v_line.debit_amount, v_line.credit_amount
    );
  END LOOP;

  UPDATE public.annual_financial_close_runs
  SET
    closing_journal_entry_id = v_closing_entry_id,
    opening_journal_entry_id = v_opening_entry_id,
    updated_at = now()
  WHERE id = p_close_run_id;

  RETURN v_closing_entry_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.post_annual_financial_close(UUID) TO authenticated;
