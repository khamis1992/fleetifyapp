DROP INDEX IF EXISTS public.uq_bank_statement_lines_matched_payment;
DROP INDEX IF EXISTS public.uq_bank_statement_lines_matched_transaction;

CREATE OR REPLACE FUNCTION public.get_bank_statement_import_summary(p_import_id uuid)
RETURNS jsonb
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

CREATE OR REPLACE FUNCTION public.mark_bank_statement_line_matched(
  p_line_id uuid,
  p_payment_id uuid DEFAULT NULL,
  p_bank_transaction_id uuid DEFAULT NULL,
  p_score numeric DEFAULT 100,
  p_method text DEFAULT 'manual'
)
RETURNS jsonb
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

  SELECT * INTO v_line FROM public.bank_statement_lines WHERE id = p_line_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bank statement line not found'; END IF;
  IF v_line.match_status = 'matched' THEN RAISE EXCEPTION 'Bank statement line is already matched'; END IF;

  IF p_payment_id IS NOT NULL THEN
    SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
    IF v_payment.company_id <> v_line.company_id THEN RAISE EXCEPTION 'Payment belongs to another company'; END IF;
    IF v_payment.bank_id IS NOT NULL AND v_payment.bank_id <> v_line.bank_id THEN RAISE EXCEPTION 'Payment belongs to another bank'; END IF;
    IF ABS(ABS(v_payment.amount) - ABS(v_line.amount)) > 0.01 THEN RAISE EXCEPTION 'Payment amount does not match statement line amount'; END IF;

    UPDATE public.payments
    SET reconciliation_status = 'reconciled', reconciled_at = now(), reconciled_by = auth.uid(),
        reconciliation_reference = COALESCE(v_line.reference_number, 'bank-statement-' || v_line.id::text), updated_at = now()
    WHERE id = p_payment_id;
  END IF;

  IF p_bank_transaction_id IS NOT NULL THEN
    SELECT * INTO v_bank_transaction FROM public.bank_transactions WHERE id = p_bank_transaction_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Bank transaction not found'; END IF;
    IF v_bank_transaction.company_id <> v_line.company_id THEN RAISE EXCEPTION 'Bank transaction belongs to another company'; END IF;
    IF v_bank_transaction.bank_id <> v_line.bank_id THEN RAISE EXCEPTION 'Bank transaction belongs to another bank'; END IF;
    IF ABS(ABS(v_bank_transaction.amount) - ABS(v_line.amount)) > 0.01 THEN RAISE EXCEPTION 'Bank transaction amount does not match statement line amount'; END IF;

    UPDATE public.bank_transactions
    SET reconciled = true, reconciled_at = now(), updated_at = now()
    WHERE id = p_bank_transaction_id;
  END IF;

  UPDATE public.bank_statement_lines
  SET match_status = 'matched', matched_payment_id = p_payment_id,
      matched_bank_transaction_id = p_bank_transaction_id, matched_at = now(), matched_by = auth.uid(),
      match_score = LEAST(100, GREATEST(0, p_score)), match_method = p_method, updated_at = now()
  WHERE id = p_line_id;

  PERFORM public.refresh_bank_statement_import_counts(v_line.import_id);
  RETURN jsonb_build_object(
    'statement_line_id', p_line_id, 'payment_id', p_payment_id,
    'bank_transaction_id', p_bank_transaction_id,
    'match_score', LEAST(100, GREATEST(0, p_score)), 'match_method', p_method
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_bank_statement_import_counts(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_bank_statement_line_matched(uuid, uuid, uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bank_statement_import_summary(uuid) TO authenticated;
