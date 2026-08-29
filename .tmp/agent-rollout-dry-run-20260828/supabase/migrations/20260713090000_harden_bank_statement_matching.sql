-- Restrict bank-statement matching to authorized finance users and keep every
-- source match unique and auditable.

CREATE UNIQUE INDEX IF NOT EXISTS uq_bank_statement_lines_matched_payment
  ON public.bank_statement_lines(matched_payment_id)
  WHERE match_status = 'matched' AND matched_payment_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_bank_statement_lines_matched_transaction
  ON public.bank_statement_lines(matched_bank_transaction_id)
  WHERE match_status = 'matched' AND matched_bank_transaction_id IS NOT NULL;
REVOKE ALL ON FUNCTION public.refresh_bank_statement_import_counts(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_bank_statement_import_counts(uuid)
  TO service_role;
CREATE OR REPLACE FUNCTION public.get_bank_statement_import_summary(p_import_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'import_id', statement_import.id,
    'status', statement_import.status,
    'row_count', statement_import.row_count,
    'matched_count', statement_import.matched_count,
    'unmatched_count', statement_import.unmatched_count,
    'matched_amount', COALESCE(SUM(ABS(line.amount)) FILTER (WHERE line.match_status = 'matched'), 0),
    'unmatched_amount', COALESCE(SUM(ABS(line.amount)) FILTER (WHERE line.match_status IN ('unmatched', 'needs_review')), 0)
  )
  FROM public.bank_statement_imports statement_import
  LEFT JOIN public.bank_statement_lines line ON line.import_id = statement_import.id
  WHERE statement_import.id = p_import_id
  GROUP BY statement_import.id, statement_import.status, statement_import.row_count,
           statement_import.matched_count, statement_import.unmatched_count;
$$;
REVOKE ALL ON FUNCTION public.get_bank_statement_import_summary(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_bank_statement_import_summary(uuid)
  TO authenticated, service_role;
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
  v_actor uuid := auth.uid();
  v_actor_role text := COALESCE(NULLIF(auth.role()::text, ''), current_setting('request.jwt.claim.role', true), '');
  v_allowed boolean := false;
  v_method text := lower(BTRIM(COALESCE(p_method, 'manual')));
  v_score numeric := LEAST(100, GREATEST(0, COALESCE(p_score, 100)));
  v_before jsonb;
  v_after jsonb;
BEGIN
  IF p_line_id IS NULL THEN
    RAISE EXCEPTION 'Bank statement line is required' USING ERRCODE = 'P0001';
  END IF;
  IF (p_payment_id IS NULL) = (p_bank_transaction_id IS NULL) THEN
    RAISE EXCEPTION 'Exactly one payment or bank transaction is required for reconciliation'
      USING ERRCODE = 'P0001';
  END IF;
  IF v_method NOT IN ('auto', 'manual', 'rule', 'override') THEN
    RAISE EXCEPTION 'Unsupported bank statement match method' USING ERRCODE = 'P0001';
  END IF;

  SELECT *
  INTO v_line
  FROM public.bank_statement_lines line
  WHERE line.id = p_line_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bank statement line not found' USING ERRCODE = 'P0001';
  END IF;

  IF v_actor_role <> 'service_role' THEN
    v_allowed := public.is_finance_action_authorized(
      v_actor,
      v_line.company_id,
      ARRAY['finance.payment.reconcile', 'finance.treasury.write'],
      ARRAY['super_admin', 'admin', 'company_admin', 'accountant']
    );
    IF NOT v_allowed THEN
      RAISE EXCEPTION 'Not authorized to match bank statement lines' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF v_line.match_status NOT IN ('unmatched', 'needs_review') THEN
    RAISE EXCEPTION 'Only unmatched or review-required statement lines can be matched'
      USING ERRCODE = 'P0001';
  END IF;

  v_before := jsonb_build_object(
    'match_status', v_line.match_status,
    'matched_payment_id', v_line.matched_payment_id,
    'matched_bank_transaction_id', v_line.matched_bank_transaction_id,
    'matched_at', v_line.matched_at,
    'matched_by', v_line.matched_by,
    'match_score', v_line.match_score,
    'match_method', v_line.match_method
  );

  IF p_payment_id IS NOT NULL THEN
    SELECT *
    INTO v_payment
    FROM public.payments payment
    WHERE payment.id = p_payment_id
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Payment not found' USING ERRCODE = 'P0001';
    END IF;
    IF v_payment.company_id IS DISTINCT FROM v_line.company_id
       OR v_payment.bank_id IS DISTINCT FROM v_line.bank_id
       OR abs(abs(COALESCE(v_payment.amount, 0)) - abs(COALESCE(v_line.amount, 0))) >= 0.005
    THEN
      RAISE EXCEPTION 'Payment company, bank, or amount does not match statement line'
        USING ERRCODE = 'P0001';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended('payment:' || v_payment.id::text, 0));
    IF EXISTS (
      SELECT 1
      FROM public.bank_statement_lines existing_line
      WHERE existing_line.match_status = 'matched'
        AND (
          existing_line.matched_payment_id = v_payment.id
          OR existing_line.matched_bank_transaction_id IN (
            SELECT transaction.id
            FROM public.bank_transactions transaction
            WHERE transaction.payment_id = v_payment.id
              AND transaction.reversal_of_transaction_id IS NULL
          )
        )
    ) THEN
      RAISE EXCEPTION 'Payment or its bank transaction is already matched to another statement line'
        USING ERRCODE = '23505';
    END IF;

    PERFORM public.reconcile_payment_with_bank_transaction(
      v_payment.id,
      'Matched to bank statement line ' || v_line.id::text,
      NULL,
      NULL
    );
  ELSE
    SELECT *
    INTO v_bank_transaction
    FROM public.bank_transactions transaction
    WHERE transaction.id = p_bank_transaction_id
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Bank transaction not found' USING ERRCODE = 'P0001';
    END IF;
    IF v_bank_transaction.company_id IS DISTINCT FROM v_line.company_id
       OR v_bank_transaction.bank_id IS DISTINCT FROM v_line.bank_id
       OR abs(abs(COALESCE(v_bank_transaction.amount, 0)) - abs(COALESCE(v_line.amount, 0))) >= 0.005
       OR lower(COALESCE(v_bank_transaction.status, '')) <> 'completed'
       OR v_bank_transaction.reversal_of_transaction_id IS NOT NULL
       OR v_bank_transaction.journal_entry_id IS NULL
    THEN
      RAISE EXCEPTION 'Bank transaction company, bank, amount, status, or journal does not match statement line'
        USING ERRCODE = 'P0001';
    END IF;

    PERFORM pg_advisory_xact_lock(
      hashtextextended(
        CASE
          WHEN v_bank_transaction.payment_id IS NOT NULL
            THEN 'payment:' || v_bank_transaction.payment_id::text
          ELSE 'transaction:' || v_bank_transaction.id::text
        END,
        0
      )
    );
    IF EXISTS (
      SELECT 1
      FROM public.bank_statement_lines existing_line
      WHERE existing_line.match_status = 'matched'
        AND (
          existing_line.matched_bank_transaction_id = v_bank_transaction.id
          OR (
            v_bank_transaction.payment_id IS NOT NULL
            AND existing_line.matched_payment_id = v_bank_transaction.payment_id
          )
        )
    ) THEN
      RAISE EXCEPTION 'Bank transaction or its payment is already matched to another statement line'
        USING ERRCODE = '23505';
    END IF;

    IF v_bank_transaction.payment_id IS NOT NULL THEN
      PERFORM public.reconcile_payment_with_bank_transaction(
        v_bank_transaction.payment_id,
        'Matched to bank statement line ' || v_line.id::text,
        v_bank_transaction.id,
        NULL
      );
    ELSE
      UPDATE public.bank_transactions transaction
      SET reconciled = true,
          reconciled_at = now(),
          updated_at = now()
      WHERE transaction.id = v_bank_transaction.id;
    END IF;
  END IF;

  UPDATE public.bank_statement_lines line
  SET match_status = 'matched',
      matched_payment_id = p_payment_id,
      matched_bank_transaction_id = p_bank_transaction_id,
      matched_at = now(),
      matched_by = v_actor,
      match_score = v_score,
      match_method = v_method,
      updated_at = now()
  WHERE line.id = v_line.id;

  v_after := jsonb_build_object(
    'match_status', 'matched',
    'matched_payment_id', p_payment_id,
    'matched_bank_transaction_id', p_bank_transaction_id,
    'matched_at', now(),
    'matched_by', v_actor,
    'match_score', v_score,
    'match_method', v_method
  );

  INSERT INTO public.finance_operation_audit (
    company_id, operation_type, entity_type, entity_id,
    before_state, after_state, reason, actor_id
  ) VALUES (
    v_line.company_id,
    'bank_statement_line_matched',
    'bank_statement_line',
    v_line.id,
    v_before,
    v_after,
    'Matched bank statement line using ' || v_method,
    v_actor
  );

  PERFORM public.refresh_bank_statement_import_counts(v_line.import_id);

  RETURN jsonb_build_object(
    'statement_line_id', v_line.id,
    'payment_id', p_payment_id,
    'bank_transaction_id', p_bank_transaction_id,
    'match_score', v_score,
    'match_method', v_method,
    'status', 'matched'
  );
END;
$$;
REVOKE ALL ON FUNCTION public.mark_bank_statement_line_matched(uuid, uuid, uuid, numeric, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_bank_statement_line_matched(uuid, uuid, uuid, numeric, text)
  TO authenticated, service_role;
COMMENT ON FUNCTION public.mark_bank_statement_line_matched(uuid, uuid, uuid, numeric, text) IS
'Authorized, company-scoped, amount-validated, journal-backed and audited bank statement matching command.';
