BEGIN;
DO $rollback$
DECLARE
  v_definition text;
  v_source text;
  v_first integer;
  v_last integer;
  v_original text := $original$  SELECT *
  INTO v_existing
  FROM public.bank_transactions transaction
  WHERE transaction.company_id = v_payment.company_id
    AND transaction.payment_id IS NULL
    AND transaction.reversal_of_transaction_id IS NULL
    AND transaction.bank_id = v_bank_id
    AND transaction.transaction_type = v_transaction_type
    AND abs(COALESCE(transaction.amount, 0) - COALESCE(v_payment.amount, 0)) < 0.005
    AND transaction.reference_number IN (v_payment.payment_number, v_payment.reference_number)
  ORDER BY transaction.created_at
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    UPDATE public.bank_transactions transaction
    SET
      payment_id = v_payment.id,
      journal_entry_id = COALESCE(transaction.journal_entry_id, v_payment.journal_entry_id),
      updated_at = now()
    WHERE transaction.id = v_existing.id;
    RETURN v_existing.id;
  END IF;

$original$;
BEGIN
  SELECT replace(pg_get_functiondef(oid), E'\r\n', E'\n'), replace(prosrc, E'\r\n', E'\n')
  INTO v_definition, v_source FROM pg_proc
  WHERE oid = 'public.create_payment_bank_transaction(uuid)'::regprocedure;
  IF md5(v_source) <> '07e1825b7d65579f50c3244d5d903938' THEN
    RAISE EXCEPTION 'Bank transaction function changed; review before rollback';
  END IF;
  v_first := position('  -- verified_legacy_bank_link_v1:start' IN v_definition);
  v_last := position('  PERFORM public.assert_financial_period_is_open(v_payment.company_id, v_payment.payment_date);' IN v_definition);
  EXECUTE left(v_definition, v_first - 1) || v_original || substring(v_definition FROM v_last);
  IF (SELECT md5(replace(prosrc, E'\r\n', E'\n')) FROM pg_proc
      WHERE oid='public.create_payment_bank_transaction(uuid)'::regprocedure) <> '23701bf3aca679e8e5f308be19df4a6e' THEN
    RAISE EXCEPTION 'Bank transaction original body verification failed';
  END IF;
END;
$rollback$;
-- No receipts, bank movements, allocations or balances are removed or rewritten.
COMMIT;
