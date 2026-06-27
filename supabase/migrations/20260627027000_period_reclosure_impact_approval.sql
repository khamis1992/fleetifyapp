-- Reclosure governance: every reopened period must produce an impact report.
-- If the impact report is risky, a controller must approve it before final reclosure is complete.

ALTER TABLE public.financial_period_reopening_impact_reports
  ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'not_required'
    CHECK (review_status IN ('not_required', 'pending_controller_review', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_notes TEXT;

ALTER TABLE public.financial_period_reopening_requests
  DROP CONSTRAINT IF EXISTS financial_period_reopening_status_check;

ALTER TABLE public.financial_period_reopening_requests
  ADD CONSTRAINT financial_period_reopening_status_check
  CHECK (status IN ('pending', 'approved', 'pending_controller_review', 'rejected', 'expired', 'closed'));

CREATE OR REPLACE FUNCTION public.approve_period_reopening_impact_report(
  p_report_id UUID,
  p_review_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report public.financial_period_reopening_impact_reports%ROWTYPE;
BEGIN
  SELECT * INTO v_report
  FROM public.financial_period_reopening_impact_reports
  WHERE id = p_report_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Period reopening impact report was not found'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_report.company_id <> get_user_company_id() THEN
    RAISE EXCEPTION 'Cannot approve impact report for another company'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_report.generated_by IS NOT NULL AND v_report.generated_by = auth.uid() THEN
    RAISE EXCEPTION 'Impact report generator cannot approve their own report'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.financial_period_reopening_impact_reports
  SET review_status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_notes = p_review_notes
  WHERE id = p_report_id;

  RETURN jsonb_build_object('report_id', p_report_id, 'review_status', 'approved');
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_period_reopening_impact_report(
  p_report_id UUID,
  p_review_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_review_notes IS NULL OR length(trim(p_review_notes)) < 10 THEN
    RAISE EXCEPTION 'A clear rejection reason is required'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.financial_period_reopening_impact_reports report
  SET review_status = 'rejected',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_notes = trim(p_review_notes)
  WHERE report.id = p_report_id
    AND report.company_id = get_user_company_id();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Period reopening impact report was not found'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object('report_id', p_report_id, 'review_status', 'rejected');
END;
$$;

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
  v_review_status TEXT := 'not_required';
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

  SELECT COUNT(*)::integer, COALESCE(ROUND(SUM(total_amount), 3), 0)
  INTO v_invoices_changed, v_invoice_amount_changed
  FROM public.invoices
  WHERE company_id = v_request.company_id
    AND invoice_date BETWEEN v_period.start_date AND v_period.end_date
    AND updated_at >= COALESCE(v_request.approved_at, v_request.requested_at)
    AND updated_at <= COALESCE(v_request.closed_again_at, now());

  SELECT COUNT(*)::integer, COALESCE(ROUND(SUM(amount), 3), 0)
  INTO v_payments_changed, v_payment_amount_changed
  FROM public.payments
  WHERE company_id = v_request.company_id
    AND payment_date BETWEEN v_period.start_date AND v_period.end_date
    AND updated_at >= COALESCE(v_request.approved_at, v_request.requested_at)
    AND updated_at <= COALESCE(v_request.closed_again_at, now());

  SELECT COUNT(DISTINCT je.id)::integer,
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
  v_review_status := CASE WHEN v_requires_review THEN 'pending_controller_review' ELSE 'not_required' END;

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
    review_status,
    reviewed_by,
    reviewed_at,
    review_notes,
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
    v_review_status,
    NULL,
    NULL,
    NULL,
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
    review_status = CASE
      WHEN EXCLUDED.requires_controller_review THEN 'pending_controller_review'
      ELSE 'not_required'
    END,
    reviewed_by = NULL,
    reviewed_at = NULL,
    review_notes = NULL,
    report_payload = EXCLUDED.report_payload,
    generated_by = EXCLUDED.generated_by,
    generated_at = now()
  RETURNING id INTO v_report_id;

  RETURN jsonb_build_object(
    'report_id', v_report_id,
    'total_documents_changed', v_total_documents_changed,
    'journal_imbalance', v_journal_imbalance,
    'requires_controller_review', v_requires_review,
    'review_status', v_review_status
  );
END;
$$;

DROP FUNCTION IF EXISTS public.close_reopened_financial_period(uuid);

CREATE OR REPLACE FUNCTION public.close_reopened_financial_period(
  p_request_id uuid
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.financial_period_reopening_requests%ROWTYPE;
  v_report_result JSONB;
  v_report public.financial_period_reopening_impact_reports%ROWTYPE;
BEGIN
  SELECT * INTO v_request
  FROM public.financial_period_reopening_requests
  WHERE id = p_request_id
    AND status = 'approved'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Approved reopening request was not found.'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.financial_period_reopening_requests
  SET closed_again_at = now(),
      updated_at = now()
  WHERE id = p_request_id;

  v_report_result := public.generate_period_reopening_impact_report(p_request_id);

  SELECT * INTO v_report
  FROM public.financial_period_reopening_impact_reports
  WHERE reopening_request_id = p_request_id;

  IF v_report.requires_controller_review AND v_report.review_status <> 'approved' THEN
    UPDATE public.financial_period_reopening_requests
    SET status = 'pending_controller_review',
        updated_at = now()
    WHERE id = p_request_id;

    RETURN jsonb_build_object(
      'status', 'pending_controller_review',
      'report_id', v_report.id,
      'requires_controller_review', true
    );
  END IF;

  UPDATE public.accounting_periods
  SET status = 'closed',
      updated_at = now()
  WHERE id = v_request.accounting_period_id
    AND company_id = v_request.company_id;

  UPDATE public.financial_period_reopening_requests
  SET status = 'closed',
      updated_at = now()
  WHERE id = p_request_id;

  RETURN jsonb_build_object(
    'status', 'closed',
    'report_id', v_report.id,
    'requires_controller_review', false
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_reviewed_period_reclosure(
  p_request_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.financial_period_reopening_requests%ROWTYPE;
  v_report public.financial_period_reopening_impact_reports%ROWTYPE;
BEGIN
  SELECT * INTO v_request
  FROM public.financial_period_reopening_requests
  WHERE id = p_request_id
    AND status = 'pending_controller_review'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending controller review reopening request was not found'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_report
  FROM public.financial_period_reopening_impact_reports
  WHERE reopening_request_id = p_request_id
  FOR UPDATE;

  IF NOT FOUND OR v_report.review_status <> 'approved' THEN
    RAISE EXCEPTION 'Approved impact report is required before final reclosure'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.accounting_periods
  SET status = 'closed',
      updated_at = now()
  WHERE id = v_request.accounting_period_id
    AND company_id = v_request.company_id;

  UPDATE public.financial_period_reopening_requests
  SET status = 'closed',
      updated_at = now()
  WHERE id = p_request_id;

  RETURN jsonb_build_object('status', 'closed', 'report_id', v_report.id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_period_reopening_impact_report(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_period_reopening_impact_report(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_reopened_financial_period(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_reviewed_period_reclosure(UUID) TO authenticated;
