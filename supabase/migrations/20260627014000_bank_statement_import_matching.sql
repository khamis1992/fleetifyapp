-- Advanced bank statement import and matching foundation.
-- This keeps reconciliation auditable: imported statement lines are preserved,
-- matched lines point to the payment or bank transaction they reconciled.

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reconciled_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reconciliation_reference TEXT;

CREATE TABLE IF NOT EXISTS public.bank_statement_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE RESTRICT,
  file_name TEXT NOT NULL,
  file_hash TEXT,
  imported_by UUID REFERENCES auth.users(id),
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'imported'
    CHECK (status IN ('imported', 'matched', 'partially_matched', 'failed', 'cancelled')),
  row_count INTEGER NOT NULL DEFAULT 0 CHECK (row_count >= 0),
  matched_count INTEGER NOT NULL DEFAULT 0 CHECK (matched_count >= 0),
  unmatched_count INTEGER NOT NULL DEFAULT 0 CHECK (unmatched_count >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bank_statement_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES public.bank_statement_imports(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE RESTRICT,
  statement_date DATE NOT NULL,
  value_date DATE,
  description TEXT NOT NULL DEFAULT '',
  reference_number TEXT,
  debit_amount NUMERIC(14, 3) NOT NULL DEFAULT 0 CHECK (debit_amount >= 0),
  credit_amount NUMERIC(14, 3) NOT NULL DEFAULT 0 CHECK (credit_amount >= 0),
  amount NUMERIC(14, 3) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'QAR',
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  match_status TEXT NOT NULL DEFAULT 'unmatched'
    CHECK (match_status IN ('unmatched', 'matched', 'ignored', 'duplicate', 'needs_review')),
  matched_payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  matched_bank_transaction_id UUID REFERENCES public.bank_transactions(id) ON DELETE SET NULL,
  matched_at TIMESTAMPTZ,
  matched_by UUID REFERENCES auth.users(id),
  match_score NUMERIC(5, 2) CHECK (match_score IS NULL OR (match_score >= 0 AND match_score <= 100)),
  match_method TEXT CHECK (match_method IS NULL OR match_method IN ('auto', 'manual', 'rule', 'override')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bank_statement_line_single_match CHECK (
    matched_payment_id IS NULL OR matched_bank_transaction_id IS NULL
  ),
  CONSTRAINT bank_statement_line_amount_consistency CHECK (
    ROUND((credit_amount - debit_amount)::numeric, 3) = ROUND(amount::numeric, 3)
  )
);

CREATE INDEX IF NOT EXISTS idx_bank_statement_imports_company_bank
  ON public.bank_statement_imports(company_id, bank_id, imported_at DESC);

CREATE INDEX IF NOT EXISTS idx_bank_statement_lines_import
  ON public.bank_statement_lines(import_id);

CREATE INDEX IF NOT EXISTS idx_bank_statement_lines_company_status
  ON public.bank_statement_lines(company_id, match_status, statement_date DESC);

CREATE INDEX IF NOT EXISTS idx_bank_statement_lines_reference
  ON public.bank_statement_lines(company_id, bank_id, reference_number);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_statement_lines_dedupe
  ON public.bank_statement_lines(
    company_id,
    bank_id,
    statement_date,
    amount,
    COALESCE(reference_number, ''),
    md5(description)
  );

ALTER TABLE public.bank_statement_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_statement_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bank_statement_imports_company_access ON public.bank_statement_imports;
CREATE POLICY bank_statement_imports_company_access
  ON public.bank_statement_imports
  FOR ALL
  TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

DROP POLICY IF EXISTS bank_statement_lines_company_access ON public.bank_statement_lines;
CREATE POLICY bank_statement_lines_company_access
  ON public.bank_statement_lines
  FOR ALL
  TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE OR REPLACE FUNCTION public.refresh_bank_statement_import_counts(p_import_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.bank_statement_imports bsi
  SET
    row_count = counts.row_count,
    matched_count = counts.matched_count,
    unmatched_count = counts.unmatched_count,
    status = CASE
      WHEN counts.row_count = 0 THEN 'imported'
      WHEN counts.unmatched_count = 0 THEN 'matched'
      WHEN counts.matched_count > 0 THEN 'partially_matched'
      ELSE 'imported'
    END,
    updated_at = now()
  FROM (
    SELECT
      COUNT(*)::integer AS row_count,
      COUNT(*) FILTER (WHERE match_status = 'matched')::integer AS matched_count,
      COUNT(*) FILTER (WHERE match_status IN ('unmatched', 'needs_review'))::integer AS unmatched_count
    FROM public.bank_statement_lines
    WHERE import_id = p_import_id
  ) counts
  WHERE bsi.id = p_import_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_bank_statement_line_matched(
  p_line_id UUID,
  p_payment_id UUID DEFAULT NULL,
  p_bank_transaction_id UUID DEFAULT NULL,
  p_score NUMERIC DEFAULT 100,
  p_method TEXT DEFAULT 'manual'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_line public.bank_statement_lines%ROWTYPE;
  v_payment public.payments%ROWTYPE;
  v_bank_transaction public.bank_transactions%ROWTYPE;
BEGIN
  IF p_payment_id IS NULL AND p_bank_transaction_id IS NULL THEN
    RAISE EXCEPTION 'A payment or bank transaction is required for reconciliation';
  END IF;

  IF p_payment_id IS NOT NULL AND p_bank_transaction_id IS NOT NULL THEN
    RAISE EXCEPTION 'A bank statement line can only be matched to one financial source';
  END IF;

  SELECT * INTO v_line
  FROM public.bank_statement_lines
  WHERE id = p_line_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bank statement line not found';
  END IF;

  IF v_line.match_status = 'matched' THEN
    RAISE EXCEPTION 'Bank statement line is already matched';
  END IF;

  IF p_payment_id IS NOT NULL THEN
    SELECT * INTO v_payment
    FROM public.payments
    WHERE id = p_payment_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Payment not found';
    END IF;

    IF v_payment.company_id <> v_line.company_id THEN
      RAISE EXCEPTION 'Payment belongs to another company';
    END IF;

    IF v_payment.bank_id IS NOT NULL AND v_payment.bank_id <> v_line.bank_id THEN
      RAISE EXCEPTION 'Payment belongs to another bank';
    END IF;

    IF ABS(ABS(v_payment.amount) - ABS(v_line.amount)) > 0.01 THEN
      RAISE EXCEPTION 'Payment amount does not match statement line amount';
    END IF;

    UPDATE public.payments
    SET
      reconciliation_status = 'reconciled',
      reconciled_at = now(),
      reconciled_by = auth.uid(),
      reconciliation_reference = COALESCE(v_line.reference_number, 'bank-statement-' || v_line.id::text),
      updated_at = now()
    WHERE id = p_payment_id;
  END IF;

  IF p_bank_transaction_id IS NOT NULL THEN
    SELECT * INTO v_bank_transaction
    FROM public.bank_transactions
    WHERE id = p_bank_transaction_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Bank transaction not found';
    END IF;

    IF v_bank_transaction.company_id <> v_line.company_id THEN
      RAISE EXCEPTION 'Bank transaction belongs to another company';
    END IF;

    IF v_bank_transaction.bank_id <> v_line.bank_id THEN
      RAISE EXCEPTION 'Bank transaction belongs to another bank';
    END IF;

    IF ABS(ABS(v_bank_transaction.amount) - ABS(v_line.amount)) > 0.01 THEN
      RAISE EXCEPTION 'Bank transaction amount does not match statement line amount';
    END IF;

    UPDATE public.bank_transactions
    SET
      reconciled = true,
      reconciled_at = now(),
      updated_at = now()
    WHERE id = p_bank_transaction_id;
  END IF;

  UPDATE public.bank_statement_lines
  SET
    match_status = 'matched',
    matched_payment_id = p_payment_id,
    matched_bank_transaction_id = p_bank_transaction_id,
    matched_at = now(),
    matched_by = auth.uid(),
    match_score = LEAST(100, GREATEST(0, p_score)),
    match_method = p_method,
    updated_at = now()
  WHERE id = p_line_id;

  PERFORM public.refresh_bank_statement_import_counts(v_line.import_id);

  RETURN jsonb_build_object(
    'statement_line_id', p_line_id,
    'payment_id', p_payment_id,
    'bank_transaction_id', p_bank_transaction_id,
    'match_score', LEAST(100, GREATEST(0, p_score)),
    'match_method', p_method
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_bank_statement_import_summary(p_import_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'import_id', bsi.id,
    'status', bsi.status,
    'row_count', bsi.row_count,
    'matched_count', bsi.matched_count,
    'unmatched_count', bsi.unmatched_count,
    'matched_amount', COALESCE(SUM(ABS(bsl.amount)) FILTER (WHERE bsl.match_status = 'matched'), 0),
    'unmatched_amount', COALESCE(SUM(ABS(bsl.amount)) FILTER (WHERE bsl.match_status IN ('unmatched', 'needs_review')), 0)
  )
  FROM public.bank_statement_imports bsi
  LEFT JOIN public.bank_statement_lines bsl ON bsl.import_id = bsi.id
  WHERE bsi.id = p_import_id
  GROUP BY bsi.id, bsi.status, bsi.row_count, bsi.matched_count, bsi.unmatched_count;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_bank_statement_import_counts(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_bank_statement_line_matched(UUID, UUID, UUID, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bank_statement_import_summary(UUID) TO authenticated;
