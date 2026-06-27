-- Impact report after controlled reopening.
-- The report summarizes invoices, payments, and journal entries changed during
-- the reopening window so controllers can review what changed after a period
-- was temporarily reopened.

CREATE TABLE IF NOT EXISTS public.financial_period_reopening_impact_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reopening_request_id UUID NOT NULL REFERENCES public.financial_period_reopening_requests(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  accounting_period_id UUID NOT NULL REFERENCES public.accounting_periods(id) ON DELETE CASCADE,
  invoices_changed INTEGER NOT NULL DEFAULT 0 CHECK (invoices_changed >= 0),
  invoice_amount_changed NUMERIC(14, 3) NOT NULL DEFAULT 0,
  payments_changed INTEGER NOT NULL DEFAULT 0 CHECK (payments_changed >= 0),
  payment_amount_changed NUMERIC(14, 3) NOT NULL DEFAULT 0,
  journals_changed INTEGER NOT NULL DEFAULT 0 CHECK (journals_changed >= 0),
  journal_debit_changed NUMERIC(14, 3) NOT NULL DEFAULT 0,
  journal_credit_changed NUMERIC(14, 3) NOT NULL DEFAULT 0,
  journal_imbalance NUMERIC(14, 3) NOT NULL DEFAULT 0,
  total_documents_changed INTEGER NOT NULL DEFAULT 0 CHECK (total_documents_changed >= 0),
  requires_controller_review BOOLEAN NOT NULL DEFAULT false,
  report_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_by UUID REFERENCES auth.users(id),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT financial_period_reopening_impact_unique UNIQUE (reopening_request_id)
);

CREATE INDEX IF NOT EXISTS idx_period_reopening_impact_company_period
  ON public.financial_period_reopening_impact_reports(company_id, accounting_period_id, generated_at DESC);

ALTER TABLE public.financial_period_reopening_impact_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS financial_period_reopening_impact_company_access ON public.financial_period_reopening_impact_reports;
CREATE POLICY financial_period_reopening_impact_company_access
  ON public.financial_period_reopening_impact_reports
  FOR ALL
  TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE OR REPLACE FUNCTION public.generate_period_reopening_impact_report(p_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.financial_period_reopening_requests%ROWTYPE;
  v_period public.accounting_periods%ROWTYPE;
  v_invoices_changed INTEGER := 0;
  v_invoice_amount_changed NUMERIC(14, 3) := 0;
  v_payments_changed INTEGER := 0;
  v_payment_amount_changed NUMERIC(14, 3) := 0;
  v_journals_changed INTEGER := 0;
  v_journal_debit_changed NUMERIC(14, 3) := 0;
  v_journal_credit_changed NUMERIC(14, 3) := 0;
  v_journal_imbalance NUMERIC(14, 3) := 0;
  v_total_documents_changed INTEGER := 0;
  v_requires_review BOOLEAN := false;
  v_report_id UUID;
BEGIN
  SELECT * INTO v_request
  FROM public.financial_period_reopening_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Financial period reopening request not found';
  END IF;

  IF v_request.company_id <> get_user_company_id() THEN
    RAISE EXCEPTION 'Cannot generate reopening impact report for another company';
  END IF;

  SELECT * INTO v_period
  FROM public.accounting_periods
  WHERE id = v_request.accounting_period_id
    AND company_id = v_request.company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Accounting period not found';
  END IF;

  SELECT
    COUNT(*)::integer,
    COALESCE(ROUND(SUM(total_amount), 3), 0)
  INTO v_invoices_changed, v_invoice_amount_changed
  FROM public.invoices
  WHERE company_id = v_request.company_id
    AND invoice_date BETWEEN v_period.start_date AND v_period.end_date
    AND updated_at >= COALESCE(v_request.approved_at, v_request.requested_at)
    AND updated_at <= COALESCE(v_request.closed_again_at, now());

  SELECT
    COUNT(*)::integer,
    COALESCE(ROUND(SUM(amount), 3), 0)
  INTO v_payments_changed, v_payment_amount_changed
  FROM public.payments
  WHERE company_id = v_request.company_id
    AND payment_date BETWEEN v_period.start_date AND v_period.end_date
    AND updated_at >= COALESCE(v_request.approved_at, v_request.requested_at)
    AND updated_at <= COALESCE(v_request.closed_again_at, now());

  SELECT
    COUNT(DISTINCT je.id)::integer,
    COALESCE(ROUND(SUM(jel.debit_amount), 3), 0),
    COALESCE(ROUND(SUM(jel.credit_amount), 3), 0)
  INTO v_journals_changed, v_journal_debit_changed, v_journal_credit_changed
  FROM public.journal_entries je
  JOIN public.journal_entry_lines jel ON jel.journal_entry_id = je.id
  WHERE je.company_id = v_request.company_id
    AND je.entry_date BETWEEN v_period.start_date AND v_period.end_date
    AND je.updated_at >= COALESCE(v_request.approved_at, v_request.requested_at)
    AND je.updated_at <= COALESCE(v_request.closed_again_at, now());

  v_journal_imbalance := ROUND(v_journal_debit_changed - v_journal_credit_changed, 3);
  v_total_documents_changed := v_invoices_changed + v_payments_changed + v_journals_changed;
  v_requires_review := ABS(v_journal_imbalance) > 0.01 OR v_total_documents_changed > 20;

  INSERT INTO public.financial_period_reopening_impact_reports (
    reopening_request_id,
    company_id,
    accounting_period_id,
    invoices_changed,
    invoice_amount_changed,
    payments_changed,
    payment_amount_changed,
    journals_changed,
    journal_debit_changed,
    journal_credit_changed,
    journal_imbalance,
    total_documents_changed,
    requires_controller_review,
    report_payload,
    generated_by
  )
  VALUES (
    p_request_id,
    v_request.company_id,
    v_request.accounting_period_id,
    v_invoices_changed,
    v_invoice_amount_changed,
    v_payments_changed,
    v_payment_amount_changed,
    v_journals_changed,
    v_journal_debit_changed,
    v_journal_credit_changed,
    v_journal_imbalance,
    v_total_documents_changed,
    v_requires_review,
    jsonb_build_object(
      'period_start', v_period.start_date,
      'period_end', v_period.end_date,
      'reopening_approved_at', v_request.approved_at,
      'reopening_closed_again_at', v_request.closed_again_at,
      'reason', v_request.reason
    ),
    auth.uid()
  )
  ON CONFLICT (reopening_request_id)
  DO UPDATE SET
    invoices_changed = EXCLUDED.invoices_changed,
    invoice_amount_changed = EXCLUDED.invoice_amount_changed,
    payments_changed = EXCLUDED.payments_changed,
    payment_amount_changed = EXCLUDED.payment_amount_changed,
    journals_changed = EXCLUDED.journals_changed,
    journal_debit_changed = EXCLUDED.journal_debit_changed,
    journal_credit_changed = EXCLUDED.journal_credit_changed,
    journal_imbalance = EXCLUDED.journal_imbalance,
    total_documents_changed = EXCLUDED.total_documents_changed,
    requires_controller_review = EXCLUDED.requires_controller_review,
    report_payload = EXCLUDED.report_payload,
    generated_by = EXCLUDED.generated_by,
    generated_at = now()
  RETURNING id INTO v_report_id;

  RETURN jsonb_build_object(
    'report_id', v_report_id,
    'total_documents_changed', v_total_documents_changed,
    'journal_imbalance', v_journal_imbalance,
    'requires_controller_review', v_requires_review
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_period_reopening_impact_report(UUID) TO authenticated;
