BEGIN;
DO $patch$
DECLARE
  v_definition text;
  v_source text;
  v_start text := E'  SELECT *\n  INTO v_existing\n  FROM public.bank_transactions transaction\n  WHERE transaction.company_id = v_payment.company_id\n    AND transaction.payment_id IS NULL';
  v_end text := '  PERFORM public.assert_financial_period_is_open(v_payment.company_id, v_payment.payment_date);';
  v_first integer;
  v_last integer;
  v_replacement text := $replacement$  -- verified_legacy_bank_link_v1:start
  DECLARE
    v_candidate public.bank_transactions%ROWTYPE;
    v_candidate_count integer := 0;
  BEGIN
    -- Do not hide conflicting amounts/banks/statuses before deciding whether
    -- there is one matching legacy movement. External references alone are
    -- not payment identity. Lock candidates in deterministic order.
    FOR v_candidate IN
      SELECT transaction.* FROM public.bank_transactions transaction
      WHERE transaction.company_id = v_payment.company_id
        AND transaction.payment_id IS NULL
        AND transaction.reversal_of_transaction_id IS NULL
        AND NULLIF(btrim(transaction.reference_number), '') IS NOT NULL
        AND transaction.reference_number IN (v_payment.payment_number, v_payment.reference_number)
      ORDER BY transaction.id FOR UPDATE
    LOOP
      v_candidate_count := v_candidate_count + 1;
      v_existing := v_candidate;
    END LOOP;

    IF v_candidate_count > 1 THEN
      RAISE EXCEPTION 'Multiple legacy bank movements require reconciliation before linking this payment'
        USING ERRCODE = '23514';
    END IF;
    IF v_candidate_count = 1 THEN
      IF lower(COALESCE(v_existing.status, '')) <> 'completed'
         OR v_existing.reference_number IS DISTINCT FROM v_payment.payment_number
         OR NULLIF(btrim(v_payment.payment_number), '') IS NULL
         OR v_existing.transaction_date IS DISTINCT FROM v_payment.payment_date
         OR v_existing.bank_id IS DISTINCT FROM v_bank_id
         OR v_existing.transaction_type IS DISTINCT FROM v_transaction_type
         OR abs(COALESCE(v_existing.amount, 0) - COALESCE(v_payment.amount, 0)) >= 0.005
         OR v_existing.journal_entry_id IS DISTINCT FROM v_payment.journal_entry_id
      THEN
        RAISE EXCEPTION 'Legacy bank movement does not prove this payment; reconciliation is required'
          USING ERRCODE = '23514';
      END IF;
      UPDATE public.bank_transactions transaction
      SET payment_id = v_payment.id, updated_at = now()
      WHERE transaction.id = v_existing.id;
      RETURN v_existing.id;
    END IF;
  END;
  -- verified_legacy_bank_link_v1:end

$replacement$;
BEGIN
  SELECT replace(pg_get_functiondef(oid), E'\r\n', E'\n'), replace(prosrc, E'\r\n', E'\n')
  INTO v_definition, v_source FROM pg_proc
  WHERE oid = 'public.create_payment_bank_transaction(uuid)'::regprocedure;
  IF md5(v_source) <> '23701bf3aca679e8e5f308be19df4a6e' THEN
    RAISE EXCEPTION 'Bank transaction function changed; review before applying legacy link guard';
  END IF;
  v_first := position(v_start IN v_definition);
  v_last := position(v_end IN v_definition);
  IF v_first = 0 OR v_last <= v_first THEN
    RAISE EXCEPTION 'Legacy bank link patch anchors missing';
  END IF;
  EXECUTE left(v_definition, v_first - 1) || v_replacement || substring(v_definition FROM v_last);
END;
$patch$;
COMMIT;
