-- Make manual treasury movements explicit, balanced, idempotent, and reversible.

ALTER TABLE public.bank_transactions
  ADD COLUMN IF NOT EXISTS manual_idempotency_key uuid,
  ADD COLUMN IF NOT EXISTS manual_bank_account_id uuid,
  ADD COLUMN IF NOT EXISTS manual_counterpart_account_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS uq_bank_transactions_manual_idempotency
  ON public.bank_transactions(company_id, manual_idempotency_key)
  WHERE manual_idempotency_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_manual_bank_transaction_v1(
  p_company_id uuid,
  p_bank_id uuid,
  p_transaction_type text,
  p_amount numeric,
  p_transaction_date date,
  p_description text,
  p_reference_number text,
  p_bank_account_id uuid,
  p_counterpart_account_id uuid,
  p_idempotency_key uuid,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_existing public.bank_transactions%ROWTYPE;
  v_bank public.banks%ROWTYPE;
  v_transaction_id uuid := gen_random_uuid();
  v_journal_id uuid := gen_random_uuid();
  v_balance numeric;
  v_number text;
  v_type text := lower(BTRIM(COALESCE(p_transaction_type, '')));
BEGIN
  v_actor_id := CASE WHEN auth.uid() IS NOT NULL THEN auth.uid() ELSE p_actor_id END;
  IF v_actor_id IS NULL OR (auth.uid() IS NULL AND COALESCE(auth.role(), '') <> 'service_role') THEN
    RAISE EXCEPTION 'Authentication is required' USING ERRCODE = '42501';
  END IF;
  IF auth.uid() IS NOT NULL AND public.get_user_company_id() IS DISTINCT FROM p_company_id THEN
    RAISE EXCEPTION 'Company access denied' USING ERRCODE = '42501';
  END IF;
  IF p_idempotency_key IS NULL OR v_type NOT IN ('deposit', 'withdrawal')
     OR p_amount IS NULL OR p_amount <= 0 OR p_amount <> round(p_amount, 2)
     OR p_transaction_date IS NULL
     OR NULLIF(BTRIM(COALESCE(p_description, '')), '') IS NULL
     OR p_bank_account_id IS NULL OR p_counterpart_account_id IS NULL
     OR p_bank_account_id = p_counterpart_account_id
  THEN
    RAISE EXCEPTION 'A valid type, two-decimal amount, date, description, and two distinct accounts are required'
      USING ERRCODE = 'P0001';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_company_id::text || ':manual-bank:' || p_idempotency_key::text, 0)
  );
  SELECT transaction.* INTO v_existing
  FROM public.bank_transactions transaction
  WHERE transaction.company_id = p_company_id
    AND transaction.manual_idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_existing.bank_id IS DISTINCT FROM p_bank_id
       OR v_existing.transaction_type IS DISTINCT FROM v_type
       OR abs(v_existing.amount - p_amount) >= 0.005
       OR v_existing.transaction_date IS DISTINCT FROM p_transaction_date
       OR v_existing.description IS DISTINCT FROM BTRIM(p_description)
       OR v_existing.reference_number IS DISTINCT FROM NULLIF(BTRIM(COALESCE(p_reference_number, '')), '')
       OR v_existing.manual_bank_account_id IS DISTINCT FROM p_bank_account_id
       OR v_existing.manual_counterpart_account_id IS DISTINCT FROM p_counterpart_account_id
    THEN
      RAISE EXCEPTION 'Idempotency key was already used with a different treasury request'
        USING ERRCODE = 'P0001';
    END IF;
    RETURN jsonb_build_object(
      'transaction_id', v_existing.id,
      'journal_entry_id', v_existing.journal_entry_id,
      'balance_after', v_existing.balance_after
    );
  END IF;

  SELECT bank.* INTO v_bank
  FROM public.banks bank
  WHERE bank.id = p_bank_id
    AND bank.company_id = p_company_id
    AND COALESCE(bank.is_active, true) = true
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bank was not found or is inactive for the current company' USING ERRCODE = 'P0001';
  END IF;
  IF public.system_agent_date_in_closed_period(p_company_id, p_transaction_date) THEN
    RAISE EXCEPTION 'Treasury posting is blocked by a closed accounting period' USING ERRCODE = 'P0001';
  END IF;

  PERFORM 1 FROM public.chart_of_accounts account
  WHERE account.id = p_bank_account_id
    AND account.company_id = p_company_id
    AND account.is_active = true
    AND COALESCE(account.is_header, false) = false
    AND COALESCE(account.account_level, 0) >= 3
    AND lower(COALESCE(account.account_type, '')) IN ('asset', 'assets')
    AND lower(COALESCE(account.balance_type, '')) = 'debit';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bank ledger account must be an active, postable debit asset account'
      USING ERRCODE = 'P0001';
  END IF;

  PERFORM 1 FROM public.chart_of_accounts account
  WHERE account.id = p_counterpart_account_id
    AND account.company_id = p_company_id
    AND account.is_active = true
    AND COALESCE(account.is_header, false) = false
    AND COALESCE(account.account_level, 0) >= 3;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Counterpart account must be active and postable for the current company'
      USING ERRCODE = 'P0001';
  END IF;

  v_balance := COALESCE(v_bank.current_balance, v_bank.opening_balance, 0)
    + CASE WHEN v_type = 'deposit' THEN p_amount ELSE -p_amount END;
  IF v_balance < 0 THEN
    RAISE EXCEPTION 'Withdrawal exceeds the available bank balance' USING ERRCODE = 'P0001';
  END IF;

  v_number := 'MT-' || to_char(p_transaction_date, 'YYYYMMDD') || '-' || left(v_transaction_id::text, 8);
  INSERT INTO public.journal_entries (
    id, company_id, entry_number, entry_date, description, reference_type, reference_id,
    total_debit, total_credit, status, created_by, posted_by, posted_at
  ) VALUES (
    v_journal_id, p_company_id, 'JE-' || v_number, p_transaction_date,
    BTRIM(p_description), 'manual_bank_transaction', v_transaction_id,
    p_amount, p_amount, 'posted', v_actor_id, v_actor_id, now()
  );

  INSERT INTO public.journal_entry_lines (
    journal_entry_id, account_id, line_number, line_description, debit_amount, credit_amount
  ) VALUES
  (
    v_journal_id,
    CASE WHEN v_type = 'deposit' THEN p_bank_account_id ELSE p_counterpart_account_id END,
    1, BTRIM(p_description), p_amount, 0
  ),
  (
    v_journal_id,
    CASE WHEN v_type = 'deposit' THEN p_counterpart_account_id ELSE p_bank_account_id END,
    2, BTRIM(p_description), 0, p_amount
  );

  INSERT INTO public.bank_transactions (
    id, company_id, bank_id, transaction_number, transaction_date, transaction_type,
    amount, balance_after, description, reference_number, journal_entry_id, status,
    reconciled, created_by, manual_idempotency_key, manual_bank_account_id,
    manual_counterpart_account_id
  ) VALUES (
    v_transaction_id, p_company_id, p_bank_id, v_number, p_transaction_date, v_type,
    p_amount, v_balance, BTRIM(p_description), NULLIF(BTRIM(COALESCE(p_reference_number, '')), ''),
    v_journal_id, 'completed', false, v_actor_id, p_idempotency_key,
    p_bank_account_id, p_counterpart_account_id
  );

  v_balance := public.recalculate_bank_balance(p_bank_id);
  UPDATE public.bank_transactions
  SET balance_after = v_balance, updated_at = now()
  WHERE id = v_transaction_id AND company_id = p_company_id;

  RETURN jsonb_build_object(
    'transaction_id', v_transaction_id,
    'journal_entry_id', v_journal_id,
    'balance_after', v_balance
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reverse_manual_bank_transaction_v1(
  p_company_id uuid, p_transaction_id uuid, p_reversal_date date, p_reason text,
  p_idempotency_key uuid, p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_original public.bank_transactions%ROWTYPE;
  v_existing public.bank_transactions%ROWTYPE;
  v_bank public.banks%ROWTYPE;
  v_reversal_id uuid := gen_random_uuid();
  v_journal_id uuid := gen_random_uuid();
  v_balance numeric;
  v_number text;
  v_reverse_type text;
BEGIN
  v_actor_id := CASE WHEN auth.uid() IS NOT NULL THEN auth.uid() ELSE p_actor_id END;
  IF v_actor_id IS NULL OR (auth.uid() IS NULL AND COALESCE(auth.role(), '') <> 'service_role') THEN
    RAISE EXCEPTION 'Authentication is required' USING ERRCODE = '42501';
  END IF;
  IF auth.uid() IS NOT NULL AND public.get_user_company_id() IS DISTINCT FROM p_company_id THEN
    RAISE EXCEPTION 'Company access denied' USING ERRCODE = '42501';
  END IF;
  IF p_idempotency_key IS NULL OR p_reversal_date IS NULL
     OR NULLIF(BTRIM(COALESCE(p_reason, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Reversal date, reason, and idempotency key are required' USING ERRCODE = 'P0001';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(
    p_company_id::text || ':manual-bank-reversal:' || p_idempotency_key::text, 0
  ));
  SELECT transaction.* INTO v_existing FROM public.bank_transactions transaction
  WHERE transaction.company_id = p_company_id
    AND transaction.manual_idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_existing.reversal_of_transaction_id IS DISTINCT FROM p_transaction_id THEN
      RAISE EXCEPTION 'Idempotency key was already used for a different reversal' USING ERRCODE = 'P0001';
    END IF;
    RETURN jsonb_build_object('transaction_id', v_existing.id, 'journal_entry_id', v_existing.journal_entry_id, 'balance_after', v_existing.balance_after);
  END IF;

  SELECT transaction.* INTO v_original FROM public.bank_transactions transaction
  WHERE transaction.id = p_transaction_id AND transaction.company_id = p_company_id
  FOR UPDATE;
  IF NOT FOUND OR v_original.manual_idempotency_key IS NULL
     OR v_original.journal_entry_id IS NULL OR v_original.reversal_of_transaction_id IS NOT NULL THEN
    RAISE EXCEPTION 'Only an original manual treasury transaction with a journal can be reversed' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM public.bank_transactions reversal WHERE reversal.reversal_of_transaction_id = v_original.id) THEN
    RAISE EXCEPTION 'Treasury transaction was already reversed' USING ERRCODE = 'P0001';
  END IF;
  IF p_reversal_date < v_original.transaction_date THEN
    RAISE EXCEPTION 'Reversal date cannot precede the original transaction' USING ERRCODE = 'P0001';
  END IF;
  IF public.system_agent_date_in_closed_period(p_company_id, p_reversal_date) THEN
    RAISE EXCEPTION 'Treasury reversal is blocked by a closed accounting period' USING ERRCODE = 'P0001';
  END IF;

  SELECT bank.* INTO v_bank FROM public.banks bank
  WHERE bank.id = v_original.bank_id AND bank.company_id = p_company_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original transaction bank was not found' USING ERRCODE = 'P0001';
  END IF;
  v_reverse_type := CASE WHEN v_original.transaction_type = 'deposit' THEN 'withdrawal' ELSE 'deposit' END;
  v_balance := COALESCE(v_bank.current_balance, v_bank.opening_balance, 0)
    + CASE WHEN v_reverse_type = 'deposit' THEN v_original.amount ELSE -v_original.amount END;
  IF v_balance < 0 THEN
    RAISE EXCEPTION 'Reversal would make the bank balance negative' USING ERRCODE = 'P0001';
  END IF;

  v_number := 'MTR-' || to_char(p_reversal_date, 'YYYYMMDD') || '-' || left(v_reversal_id::text, 8);
  INSERT INTO public.journal_entries (
    id, company_id, entry_number, entry_date, description, reference_type, reference_id,
    total_debit, total_credit, status, created_by, posted_by, posted_at
  ) VALUES (
    v_journal_id, p_company_id, 'JE-' || v_number, p_reversal_date,
    'Reversal: ' || BTRIM(p_reason), 'manual_bank_transaction_reversal', v_reversal_id,
    v_original.amount, v_original.amount, 'posted', v_actor_id, v_actor_id, now()
  );
  INSERT INTO public.journal_entry_lines (
    journal_entry_id, account_id, cost_center_id, asset_id, employee_id,
    line_number, line_description, debit_amount, credit_amount
  )
  SELECT v_journal_id, line.account_id, line.cost_center_id, line.asset_id, line.employee_id,
         line.line_number, 'Reversal: ' || BTRIM(p_reason),
         COALESCE(line.credit_amount, 0), COALESCE(line.debit_amount, 0)
  FROM public.journal_entry_lines line
  WHERE line.journal_entry_id = v_original.journal_entry_id
  ORDER BY line.line_number;

  INSERT INTO public.bank_transactions (
    id, company_id, bank_id, transaction_number, transaction_date, transaction_type,
    amount, balance_after, description, reference_number, journal_entry_id, status,
    reconciled, created_by, reversal_of_transaction_id, manual_idempotency_key,
    manual_bank_account_id, manual_counterpart_account_id
  ) VALUES (
    v_reversal_id, p_company_id, v_original.bank_id, v_number, p_reversal_date, v_reverse_type,
    v_original.amount, v_balance, 'Reversal: ' || BTRIM(p_reason), v_original.transaction_number,
    v_journal_id, 'completed', false, v_actor_id, v_original.id, p_idempotency_key,
    v_original.manual_bank_account_id, v_original.manual_counterpart_account_id
  );
  v_balance := public.recalculate_bank_balance(v_original.bank_id);
  UPDATE public.bank_transactions SET balance_after = v_balance, updated_at = now()
  WHERE id = v_reversal_id AND company_id = p_company_id;
  RETURN jsonb_build_object('transaction_id', v_reversal_id, 'journal_entry_id', v_journal_id, 'balance_after', v_balance);
END;
$$;

REVOKE ALL ON FUNCTION public.create_manual_bank_transaction_v1(uuid, uuid, text, numeric, date, text, text, uuid, uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_manual_bank_transaction_v1(uuid, uuid, text, numeric, date, text, text, uuid, uuid, uuid, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.reverse_manual_bank_transaction_v1(uuid, uuid, date, text, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reverse_manual_bank_transaction_v1(uuid, uuid, date, text, uuid, uuid) TO authenticated, service_role;
