-- Official bank reconciliation batches with automatic matching.
-- A batch records which statement lines were matched automatically and which
-- lines still need review, creating a durable reconciliation run.

CREATE TABLE IF NOT EXISTS public.bank_reconciliation_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  bank_id UUID NOT NULL REFERENCES public.banks(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'running', 'completed', 'approved', 'cancelled')),
  match_mode TEXT NOT NULL DEFAULT 'auto'
    CHECK (match_mode IN ('auto', 'manual', 'mixed')),
  statement_line_count INTEGER NOT NULL DEFAULT 0 CHECK (statement_line_count >= 0),
  auto_matched_count INTEGER NOT NULL DEFAULT 0 CHECK (auto_matched_count >= 0),
  needs_review_count INTEGER NOT NULL DEFAULT 0 CHECK (needs_review_count >= 0),
  duplicate_count INTEGER NOT NULL DEFAULT 0 CHECK (duplicate_count >= 0),
  started_by UUID REFERENCES auth.users(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bank_reconciliation_batch_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.bank_reconciliation_batches(id) ON DELETE CASCADE,
  statement_line_id UUID NOT NULL REFERENCES public.bank_statement_lines(id) ON DELETE CASCADE,
  matched_payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  matched_bank_transaction_id UUID REFERENCES public.bank_transactions(id) ON DELETE SET NULL,
  match_status TEXT NOT NULL CHECK (match_status IN ('matched', 'needs_review', 'duplicate', 'ignored')),
  match_score NUMERIC(5, 2) CHECK (match_score IS NULL OR (match_score >= 0 AND match_score <= 100)),
  match_reasons TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bank_reconciliation_batch_match_single_source CHECK (
    matched_payment_id IS NULL OR matched_bank_transaction_id IS NULL
  ),
  CONSTRAINT bank_reconciliation_batch_match_unique_line UNIQUE (batch_id, statement_line_id)
);

ALTER TABLE public.bank_statement_lines
  ADD COLUMN IF NOT EXISTS reconciliation_batch_id UUID REFERENCES public.bank_reconciliation_batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bank_reconciliation_batches_company_bank
  ON public.bank_reconciliation_batches(company_id, bank_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_bank_reconciliation_batch_matches_batch
  ON public.bank_reconciliation_batch_matches(batch_id, match_status);

CREATE INDEX IF NOT EXISTS idx_bank_statement_lines_reconciliation_batch
  ON public.bank_statement_lines(reconciliation_batch_id);

ALTER TABLE public.bank_reconciliation_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_reconciliation_batch_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bank_reconciliation_batches_company_access ON public.bank_reconciliation_batches;
CREATE POLICY bank_reconciliation_batches_company_access
  ON public.bank_reconciliation_batches
  FOR ALL
  TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

DROP POLICY IF EXISTS bank_reconciliation_batch_matches_company_access ON public.bank_reconciliation_batch_matches;
CREATE POLICY bank_reconciliation_batch_matches_company_access
  ON public.bank_reconciliation_batch_matches
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.bank_reconciliation_batches batch
      WHERE batch.id = batch_id
        AND batch.company_id = get_user_company_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.bank_reconciliation_batches batch
      WHERE batch.id = batch_id
        AND batch.company_id = get_user_company_id()
    )
  );

CREATE OR REPLACE FUNCTION public.run_auto_bank_reconciliation_batch(
  p_bank_id UUID,
  p_limit INTEGER DEFAULT 200
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID := get_user_company_id();
  v_batch_id UUID;
  v_statement_count INTEGER := 0;
  v_auto_matched_count INTEGER := 0;
  v_needs_review_count INTEGER := 0;
BEGIN
  IF p_bank_id IS NULL THEN
    RAISE EXCEPTION 'Bank is required for auto reconciliation';
  END IF;

  INSERT INTO public.bank_reconciliation_batches (
    company_id,
    bank_id,
    status,
    match_mode,
    started_by
  )
  VALUES (
    v_company_id,
    p_bank_id,
    'running',
    'auto',
    auth.uid()
  )
  RETURNING id INTO v_batch_id;

  WITH candidate_lines AS (
    SELECT *
    FROM public.bank_statement_lines line
    WHERE line.company_id = v_company_id
      AND line.bank_id = p_bank_id
      AND line.match_status IN ('unmatched', 'needs_review')
    ORDER BY line.statement_date DESC, line.created_at DESC
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 200), 1000))
  ),
  best_bank_matches AS (
    SELECT DISTINCT ON (line.id)
      line.id AS statement_line_id,
      transaction.id AS bank_transaction_id,
      (
        45
        + CASE WHEN line.bank_id = transaction.bank_id THEN 10 ELSE 0 END
        + CASE
            WHEN line.statement_date = transaction.transaction_date THEN 20
            WHEN ABS(line.statement_date - transaction.transaction_date) <= 2 THEN 15
            WHEN ABS(line.statement_date - transaction.transaction_date) <= 7 THEN 5
            ELSE 0
          END
        + CASE
            WHEN line.reference_number IS NOT NULL
              AND lower(regexp_replace(COALESCE(transaction.reference_number, transaction.transaction_number, ''), '[^[:alnum:]]', '', 'g'))
                = lower(regexp_replace(line.reference_number, '[^[:alnum:]]', '', 'g'))
              THEN 25
            WHEN line.reference_number IS NOT NULL
              AND lower(COALESCE(transaction.description, '')) LIKE '%' || lower(line.reference_number) || '%'
              THEN 15
            ELSE 0
          END
      )::numeric AS score
    FROM candidate_lines line
    JOIN public.bank_transactions transaction
      ON transaction.company_id = line.company_id
     AND transaction.bank_id = line.bank_id
     AND transaction.status = 'completed'
     AND COALESCE(transaction.reconciled, false) = false
     AND ABS(ABS(transaction.amount) - ABS(line.amount)) <= 0.01
     AND ABS(line.statement_date - transaction.transaction_date) <= 7
    ORDER BY line.id, score DESC, transaction.transaction_date DESC
  ),
  best_payment_matches AS (
    SELECT DISTINCT ON (line.id)
      line.id AS statement_line_id,
      payment.id AS payment_id,
      (
        45
        + CASE WHEN payment.bank_id IS NOT NULL AND payment.bank_id = line.bank_id THEN 10 ELSE 0 END
        + CASE
            WHEN line.statement_date = payment.payment_date THEN 20
            WHEN ABS(line.statement_date - payment.payment_date) <= 2 THEN 15
            WHEN ABS(line.statement_date - payment.payment_date) <= 7 THEN 5
            ELSE 0
          END
        + CASE
            WHEN line.reference_number IS NOT NULL
              AND lower(regexp_replace(COALESCE(payment.reference_number, payment.payment_number, ''), '[^[:alnum:]]', '', 'g'))
                = lower(regexp_replace(line.reference_number, '[^[:alnum:]]', '', 'g'))
              THEN 25
            WHEN line.reference_number IS NOT NULL
              AND lower(COALESCE(payment.notes, '')) LIKE '%' || lower(line.reference_number) || '%'
              THEN 15
            ELSE 0
          END
      )::numeric AS score
    FROM candidate_lines line
    JOIN public.payments payment
      ON payment.company_id = line.company_id
     AND payment.payment_status = 'completed'
     AND COALESCE(payment.reconciliation_status, 'pending') <> 'reconciled'
     AND ABS(ABS(payment.amount) - ABS(line.amount)) <= 0.01
     AND ABS(line.statement_date - payment.payment_date) <= 7
    ORDER BY line.id, score DESC, payment.payment_date DESC
  ),
  selected_matches AS (
    SELECT
      line.id AS statement_line_id,
      CASE
        WHEN bank_match.score >= COALESCE(payment_match.score, 0) THEN bank_match.bank_transaction_id
        ELSE NULL
      END AS bank_transaction_id,
      CASE
        WHEN COALESCE(payment_match.score, 0) > COALESCE(bank_match.score, 0) THEN payment_match.payment_id
        ELSE NULL
      END AS payment_id,
      GREATEST(COALESCE(bank_match.score, 0), COALESCE(payment_match.score, 0)) AS score
    FROM candidate_lines line
    LEFT JOIN best_bank_matches bank_match ON bank_match.statement_line_id = line.id
    LEFT JOIN best_payment_matches payment_match ON payment_match.statement_line_id = line.id
  ),
  inserted_matches AS (
    INSERT INTO public.bank_reconciliation_batch_matches (
      batch_id,
      statement_line_id,
      matched_payment_id,
      matched_bank_transaction_id,
      match_status,
      match_score,
      match_reasons
    )
    SELECT
      v_batch_id,
      selected.statement_line_id,
      CASE WHEN selected.score >= 70 THEN selected.payment_id ELSE NULL END,
      CASE WHEN selected.score >= 70 THEN selected.bank_transaction_id ELSE NULL END,
      CASE WHEN selected.score >= 70 THEN 'matched' ELSE 'needs_review' END,
      selected.score,
      CASE
        WHEN selected.score >= 90 THEN ARRAY['amount_exact', 'date_reference_strong']
        WHEN selected.score >= 70 THEN ARRAY['amount_exact', 'date_or_reference_match']
        ELSE ARRAY['no_strong_match']
      END
    FROM selected_matches selected
    RETURNING *
  )
  SELECT
    COUNT(*)::integer,
    COUNT(*) FILTER (WHERE match_status = 'matched')::integer,
    COUNT(*) FILTER (WHERE match_status = 'needs_review')::integer
  INTO v_statement_count, v_auto_matched_count, v_needs_review_count
  FROM inserted_matches;

  UPDATE public.bank_statement_lines line
  SET
    reconciliation_batch_id = v_batch_id,
    match_status = CASE WHEN match.match_status = 'matched' THEN 'matched' ELSE 'needs_review' END,
    matched_payment_id = match.matched_payment_id,
    matched_bank_transaction_id = match.matched_bank_transaction_id,
    matched_at = CASE WHEN match.match_status = 'matched' THEN now() ELSE line.matched_at END,
    matched_by = CASE WHEN match.match_status = 'matched' THEN auth.uid() ELSE line.matched_by END,
    match_score = match.match_score,
    match_method = CASE WHEN match.match_status = 'matched' THEN 'auto' ELSE line.match_method END,
    updated_at = now()
  FROM public.bank_reconciliation_batch_matches match
  WHERE match.batch_id = v_batch_id
    AND match.statement_line_id = line.id;

  UPDATE public.bank_transactions transaction
  SET
    reconciled = true,
    reconciled_at = now(),
    updated_at = now()
  FROM public.bank_reconciliation_batch_matches match
  WHERE match.batch_id = v_batch_id
    AND match.matched_bank_transaction_id = transaction.id
    AND match.match_status = 'matched';

  UPDATE public.payments payment
  SET
    reconciliation_status = 'reconciled',
    reconciled_at = now(),
    reconciled_by = auth.uid(),
    reconciliation_reference = 'bank-auto-batch-' || v_batch_id::text,
    updated_at = now()
  FROM public.bank_reconciliation_batch_matches match
  WHERE match.batch_id = v_batch_id
    AND match.matched_payment_id = payment.id
    AND match.match_status = 'matched';

  UPDATE public.bank_reconciliation_batches
  SET
    status = 'completed',
    statement_line_count = v_statement_count,
    auto_matched_count = v_auto_matched_count,
    needs_review_count = v_needs_review_count,
    completed_at = now(),
    updated_at = now()
  WHERE id = v_batch_id;

  UPDATE public.bank_statement_imports import
  SET updated_at = now()
  WHERE EXISTS (
    SELECT 1
    FROM public.bank_statement_lines line
    WHERE line.import_id = import.id
      AND line.reconciliation_batch_id = v_batch_id
  );

  RETURN jsonb_build_object(
    'batch_id', v_batch_id,
    'statement_line_count', v_statement_count,
    'auto_matched_count', v_auto_matched_count,
    'needs_review_count', v_needs_review_count
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_bank_reconciliation_batch(p_batch_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_batch public.bank_reconciliation_batches%ROWTYPE;
BEGIN
  SELECT * INTO v_batch
  FROM public.bank_reconciliation_batches
  WHERE id = p_batch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bank reconciliation batch not found';
  END IF;

  IF v_batch.company_id <> get_user_company_id() THEN
    RAISE EXCEPTION 'Cannot approve another company bank reconciliation batch';
  END IF;

  IF v_batch.status <> 'completed' THEN
    RAISE EXCEPTION 'Only completed reconciliation batches can be approved';
  END IF;

  IF v_batch.started_by = auth.uid() THEN
    RAISE EXCEPTION 'Batch starter cannot approve their own reconciliation batch';
  END IF;

  UPDATE public.bank_reconciliation_batches
  SET
    status = 'approved',
    approved_by = auth.uid(),
    approved_at = now(),
    updated_at = now()
  WHERE id = p_batch_id;

  RETURN jsonb_build_object('batch_id', p_batch_id, 'status', 'approved');
END;
$$;

GRANT EXECUTE ON FUNCTION public.run_auto_bank_reconciliation_batch(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_bank_reconciliation_batch(UUID) TO authenticated;
