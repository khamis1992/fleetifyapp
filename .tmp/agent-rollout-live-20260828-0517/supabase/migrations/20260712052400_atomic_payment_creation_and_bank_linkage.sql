-- Make payment creation, receipt posting, and bank movement one transaction.
-- Historical bank movements are intentionally not synthesized here: old receipts
-- may already be included in a bank opening balance and require reconciliation.

ALTER TABLE public.bank_transactions
  ADD COLUMN IF NOT EXISTS payment_id uuid,
  ADD COLUMN IF NOT EXISTS reversal_of_transaction_id uuid;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bank_transactions_payment_id_fkey'
      AND conrelid = 'public.bank_transactions'::regclass
  ) THEN
    ALTER TABLE public.bank_transactions
      ADD CONSTRAINT bank_transactions_payment_id_fkey
      FOREIGN KEY (payment_id)
      REFERENCES public.payments(id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bank_transactions_reversal_of_transaction_id_fkey'
      AND conrelid = 'public.bank_transactions'::regclass
  ) THEN
    ALTER TABLE public.bank_transactions
      ADD CONSTRAINT bank_transactions_reversal_of_transaction_id_fkey
      FOREIGN KEY (reversal_of_transaction_id)
      REFERENCES public.bank_transactions(id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bank_transactions_no_self_reversal'
      AND conrelid = 'public.bank_transactions'::regclass
  ) THEN
    ALTER TABLE public.bank_transactions
      ADD CONSTRAINT bank_transactions_no_self_reversal
      CHECK (reversal_of_transaction_id IS NULL OR reversal_of_transaction_id <> id);
  END IF;
END;
$$;
CREATE UNIQUE INDEX IF NOT EXISTS uq_bank_transactions_payment_original
  ON public.bank_transactions(company_id, payment_id)
  WHERE payment_id IS NOT NULL AND reversal_of_transaction_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_bank_transactions_reversal_of
  ON public.bank_transactions(reversal_of_transaction_id)
  WHERE reversal_of_transaction_id IS NOT NULL;
DO $$
DECLARE
  v_duplicate_company uuid;
  v_duplicate_number text;
BEGIN
  SELECT payment.company_id, payment.payment_number
  INTO v_duplicate_company, v_duplicate_number
  FROM public.payments payment
  WHERE NULLIF(BTRIM(COALESCE(payment.payment_number, '')), '') IS NOT NULL
  GROUP BY payment.company_id, payment.payment_number
  HAVING COUNT(*) > 1
  ORDER BY payment.company_id, payment.payment_number
  LIMIT 1;

  IF v_duplicate_company IS NOT NULL THEN
    RAISE EXCEPTION
      'Payment-number uniqueness cannot be enabled. Company % has duplicate number %.',
      v_duplicate_company,
      v_duplicate_number
      USING ERRCODE = '23505';
  END IF;
END;
$$;
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_company_payment_number
  ON public.payments(company_id, payment_number)
  WHERE NULLIF(BTRIM(payment_number), '') IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_company_active_idempotency
  ON public.payments(company_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL
    AND lower(COALESCE(payment_status, '')) NOT IN (
      'cancelled', 'canceled', 'void', 'voided', 'reversed'
    );
CREATE OR REPLACE FUNCTION public.payment_method_uses_bank(p_payment_method text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public
AS $$
  SELECT lower(BTRIM(COALESCE(p_payment_method, ''))) IN (
    'bank_transfer', 'wire_transfer', 'wiretransfer',
    'check', 'cheque', 'credit_card', 'debit_card', 'card',
    'online_transfer'
  );
$$;
REVOKE ALL ON FUNCTION public.payment_method_uses_bank(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.payment_method_uses_bank(text)
  TO service_role;
CREATE OR REPLACE FUNCTION public.resolve_payment_bank_id(
  p_company_id uuid,
  p_bank_id uuid,
  p_payment_method text,
  p_currency text DEFAULT 'QAR'
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bank_id uuid;
  v_primary_count integer := 0;
  v_active_count integer := 0;
BEGIN
  IF NOT public.payment_method_uses_bank(p_payment_method) THEN
    IF p_bank_id IS NOT NULL THEN
      RAISE EXCEPTION 'A bank cannot be attached to a non-bank payment method'
        USING ERRCODE = 'P0001';
    END IF;
    RETURN NULL;
  END IF;

  IF p_bank_id IS NOT NULL THEN
    SELECT bank.id
    INTO v_bank_id
    FROM public.banks bank
    WHERE bank.id = p_bank_id
      AND bank.company_id = p_company_id
      AND COALESCE(bank.is_active, true) = true
      AND upper(COALESCE(bank.currency, 'QAR')) = upper(COALESCE(p_currency, 'QAR'));

    IF v_bank_id IS NULL THEN
      RAISE EXCEPTION 'The selected bank is inactive, belongs to another company, or uses another currency'
        USING ERRCODE = 'P0001';
    END IF;
    RETURN v_bank_id;
  END IF;

  SELECT COUNT(*)::integer, (array_agg(bank.id ORDER BY bank.id))[1]
  INTO v_primary_count, v_bank_id
  FROM public.banks bank
  WHERE bank.company_id = p_company_id
    AND COALESCE(bank.is_active, true) = true
    AND COALESCE(bank.is_primary, false) = true
    AND upper(COALESCE(bank.currency, 'QAR')) = upper(COALESCE(p_currency, 'QAR'));

  IF v_primary_count = 1 THEN
    RETURN v_bank_id;
  END IF;
  IF v_primary_count > 1 THEN
    RAISE EXCEPTION 'More than one primary bank is configured for this company and currency'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT COUNT(*)::integer, (array_agg(bank.id ORDER BY bank.id))[1]
  INTO v_active_count, v_bank_id
  FROM public.banks bank
  WHERE bank.company_id = p_company_id
    AND COALESCE(bank.is_active, true) = true
    AND upper(COALESCE(bank.currency, 'QAR')) = upper(COALESCE(p_currency, 'QAR'));

  IF v_active_count = 1 THEN
    RETURN v_bank_id;
  END IF;
  IF v_active_count = 0 THEN
    RAISE EXCEPTION 'No active bank is configured for this company and currency'
      USING ERRCODE = 'P0001';
  END IF;

  RAISE EXCEPTION 'A bank must be selected because this company has multiple active banks'
    USING ERRCODE = 'P0001';
END;
$$;
REVOKE ALL ON FUNCTION public.resolve_payment_bank_id(uuid, uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_payment_bank_id(uuid, uuid, text, text)
  TO service_role;
CREATE OR REPLACE FUNCTION public.enforce_bank_transaction_payment_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_original public.bank_transactions%ROWTYPE;
  v_expected_type text;
BEGIN
  IF NEW.payment_id IS NULL THEN
    IF NEW.reversal_of_transaction_id IS NOT NULL THEN
      RAISE EXCEPTION 'A payment-bank reversal must retain the payment link'
        USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
  END IF;

  SELECT *
  INTO v_payment
  FROM public.payments payment
  WHERE payment.id = NEW.payment_id;

  IF NOT FOUND OR v_payment.company_id IS DISTINCT FROM NEW.company_id THEN
    RAISE EXCEPTION 'Bank transaction payment must belong to the same company'
      USING ERRCODE = 'P0001';
  END IF;

  v_expected_type := CASE
    WHEN lower(COALESCE(v_payment.transaction_type::text, 'receipt')) = 'receipt'
      THEN 'deposit'
    ELSE 'withdrawal'
  END;

  IF NEW.reversal_of_transaction_id IS NULL THEN
    IF NEW.transaction_type IS DISTINCT FROM v_expected_type
       OR abs(COALESCE(NEW.amount, 0) - COALESCE(v_payment.amount, 0)) >= 0.005
       OR (v_payment.bank_id IS NOT NULL AND NEW.bank_id IS DISTINCT FROM v_payment.bank_id)
       OR (
         NEW.journal_entry_id IS NOT NULL
         AND NEW.journal_entry_id IS DISTINCT FROM v_payment.journal_entry_id
       )
    THEN
      RAISE EXCEPTION 'Bank transaction does not match the linked payment amount, direction, bank, or journal'
        USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
  END IF;

  SELECT *
  INTO v_original
  FROM public.bank_transactions transaction
  WHERE transaction.id = NEW.reversal_of_transaction_id;

  IF NOT FOUND
     OR v_original.payment_id IS DISTINCT FROM NEW.payment_id
     OR v_original.company_id IS DISTINCT FROM NEW.company_id
     OR v_original.bank_id IS DISTINCT FROM NEW.bank_id
     OR abs(COALESCE(v_original.amount, 0) - COALESCE(NEW.amount, 0)) >= 0.005
     OR NEW.transaction_type IS DISTINCT FROM (
       CASE WHEN v_original.transaction_type = 'withdrawal' THEN 'deposit' ELSE 'withdrawal' END
     )
  THEN
    RAISE EXCEPTION 'Bank reversal must exactly offset the linked original transaction'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_bank_transaction_payment_link()
  FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS a_enforce_bank_transaction_payment_link
  ON public.bank_transactions;
CREATE TRIGGER a_enforce_bank_transaction_payment_link
  BEFORE INSERT OR UPDATE OF
    payment_id,
    reversal_of_transaction_id,
    company_id,
    bank_id,
    amount,
    transaction_type,
    journal_entry_id
  ON public.bank_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_bank_transaction_payment_link();
CREATE OR REPLACE FUNCTION public.create_payment_receipt_journal(
  p_payment_id uuid,
  p_company_id uuid,
  p_payment_number text,
  p_payment_date date,
  p_amount numeric,
  p_payment_method text,
  p_invoice_id uuid,
  p_account_id uuid,
  p_actor_id uuid,
  p_cost_center_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry_number text;
  v_journal_id uuid;
  v_cash_account_id uuid;
  v_offset_account_id uuid;
  v_cost_center_id uuid;
  v_preferred_cash_type text;
  v_offset_type text;
BEGIN
  IF p_payment_id IS NULL OR p_company_id IS NULL OR p_payment_date IS NULL
     OR COALESCE(p_amount, 0) <= 0
  THEN
    RAISE EXCEPTION 'Valid payment, company, date, and positive amount are required for receipt posting'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT entry.id
  INTO v_journal_id
  FROM public.journal_entries entry
  WHERE entry.company_id = p_company_id
    AND entry.reference_type = 'payment'
    AND entry.reference_id = p_payment_id
  ORDER BY entry.created_at
  LIMIT 1;

  IF v_journal_id IS NOT NULL THEN
    RETURN v_journal_id;
  END IF;

  PERFORM public.assert_financial_period_is_open(p_company_id, p_payment_date);

  IF p_cost_center_id IS NOT NULL THEN
    SELECT center.id
    INTO v_cost_center_id
    FROM public.cost_centers center
    WHERE center.id = p_cost_center_id
      AND center.company_id = p_company_id
      AND COALESCE(center.is_active, true) = true;

    IF v_cost_center_id IS NULL THEN
      RAISE EXCEPTION 'The selected cost center is inactive or belongs to another company'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF p_account_id IS NOT NULL THEN
    SELECT account.id
    INTO v_cash_account_id
    FROM public.chart_of_accounts account
    WHERE account.id = p_account_id
      AND account.company_id = p_company_id
      AND account.is_active = true
      AND COALESCE(account.is_header, false) = false
      AND COALESCE(account.account_level, 0) >= 3
      AND lower(COALESCE(account.account_type, '')) = 'assets'
      AND lower(COALESCE(account.balance_type, '')) = 'debit';

    IF v_cash_account_id IS NULL THEN
      RAISE EXCEPTION 'The selected receipt account is not an active posting asset account for this company'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  v_preferred_cash_type := CASE
    WHEN public.payment_method_uses_bank(p_payment_method) THEN 'BANK'
    ELSE 'CASH'
  END;

  IF v_cash_account_id IS NULL THEN
    SELECT mapping.chart_of_accounts_id
    INTO v_cash_account_id
    FROM public.account_mappings mapping
    JOIN public.default_account_types account_type
      ON account_type.id = mapping.default_account_type_id
    JOIN public.chart_of_accounts account
      ON account.id = mapping.chart_of_accounts_id
    WHERE mapping.company_id = p_company_id
      AND account_type.type_code IN ('BANK', 'CASH')
      AND mapping.is_active = true
      AND account.company_id = p_company_id
      AND account.is_active = true
      AND COALESCE(account.is_header, false) = false
      AND COALESCE(account.account_level, 0) >= 3
      AND lower(COALESCE(account.account_type, '')) = 'assets'
      AND lower(COALESCE(account.balance_type, '')) = 'debit'
    ORDER BY CASE
      WHEN account_type.type_code = v_preferred_cash_type THEN 1
      WHEN account_type.type_code = 'BANK' THEN 2
      ELSE 3
    END,
    mapping.id
    LIMIT 1;
  END IF;

  v_offset_type := CASE
    WHEN p_invoice_id IS NULL THEN 'CUSTOMER_ADVANCES'
    ELSE 'RECEIVABLES'
  END;

  SELECT mapping.chart_of_accounts_id
  INTO v_offset_account_id
  FROM public.account_mappings mapping
  JOIN public.default_account_types account_type
    ON account_type.id = mapping.default_account_type_id
  JOIN public.chart_of_accounts account
    ON account.id = mapping.chart_of_accounts_id
  WHERE mapping.company_id = p_company_id
    AND account_type.type_code = v_offset_type
    AND mapping.is_active = true
    AND account.company_id = p_company_id
    AND account.is_active = true
    AND COALESCE(account.is_header, false) = false
    AND COALESCE(account.account_level, 0) >= 3
    AND (
      (
        v_offset_type = 'RECEIVABLES'
        AND lower(COALESCE(account.account_type, '')) = 'assets'
        AND lower(COALESCE(account.balance_type, '')) = 'debit'
      )
      OR (
        v_offset_type = 'CUSTOMER_ADVANCES'
        AND lower(COALESCE(account.account_type, '')) = 'liabilities'
        AND lower(COALESCE(account.balance_type, '')) = 'credit'
      )
    )
  ORDER BY mapping.id
  LIMIT 1;

  IF v_cash_account_id IS NULL OR v_offset_account_id IS NULL THEN
    RAISE EXCEPTION 'Required cash/bank or % posting mapping is missing', v_offset_type
      USING ERRCODE = 'P0001';
  END IF;
  IF v_cash_account_id = v_offset_account_id THEN
    RAISE EXCEPTION 'Receipt debit and credit accounts must be different'
      USING ERRCODE = 'P0001';
  END IF;

  v_entry_number := 'JE-PAY-' || p_payment_id::text;

  INSERT INTO public.journal_entries (
    company_id,
    entry_number,
    entry_date,
    description,
    total_debit,
    total_credit,
    status,
    reference_type,
    reference_id,
    created_by,
    created_at,
    updated_at
  ) VALUES (
    p_company_id,
    v_entry_number,
    p_payment_date,
    'Payment receipt: ' || COALESCE(p_payment_number, p_payment_id::text),
    p_amount,
    p_amount,
    'draft',
    'payment',
    p_payment_id,
    p_actor_id,
    now(),
    now()
  )
  RETURNING id INTO v_journal_id;

  INSERT INTO public.journal_entry_lines (
    journal_entry_id,
    account_id,
    line_number,
    line_description,
    debit_amount,
    credit_amount,
    cost_center_id
  ) VALUES
    (
      v_journal_id,
      v_cash_account_id,
      1,
      'Payment received',
      p_amount,
      0,
      v_cost_center_id
    ),
    (
      v_journal_id,
      v_offset_account_id,
      2,
      CASE WHEN p_invoice_id IS NULL THEN 'Customer advance' ELSE 'Receivables settlement' END,
      0,
      p_amount,
      v_cost_center_id
    );

  UPDATE public.journal_entries entry
  SET
    status = 'posted',
    posted_by = p_actor_id,
    posted_at = now(),
    updated_at = now()
  WHERE entry.id = v_journal_id;

  RETURN v_journal_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_payment_receipt_journal(
  uuid, uuid, text, date, numeric, text, uuid, uuid, uuid, uuid
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_payment_receipt_journal(
  uuid, uuid, text, date, numeric, text, uuid, uuid, uuid, uuid
) TO service_role;
CREATE OR REPLACE FUNCTION public.trg_payment_journal_entry_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(COALESCE(NEW.payment_status, '')) NOT IN ('completed', 'paid', 'success', 'succeeded')
     OR lower(COALESCE(NEW.transaction_type::text, 'receipt')) <> 'receipt'
     OR NEW.journal_entry_id IS NOT NULL
  THEN
    RETURN NEW;
  END IF;

  NEW.journal_entry_id := public.create_payment_receipt_journal(
    NEW.id,
    NEW.company_id,
    NEW.payment_number,
    NEW.payment_date,
    NEW.amount,
    NEW.payment_method,
    NEW.invoice_id,
    NEW.account_id,
    NEW.created_by,
    NEW.cost_center_id
  );
  RETURN NEW;
END;
$$;
CREATE OR REPLACE FUNCTION public.ensure_payment_journal_entry(
  p_payment_id uuid,
  p_company_id uuid,
  p_actor_id uuid DEFAULT auth.uid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_journal_id uuid;
  v_actor uuid;
  v_actor_role text := COALESCE(NULLIF(auth.role()::text, ''), current_setting('request.jwt.claim.role', true), '');
  v_allowed boolean := false;
BEGIN
  v_actor := CASE WHEN v_actor_role = 'service_role' THEN p_actor_id ELSE auth.uid() END;
  IF v_actor_role <> 'service_role' THEN
    IF v_actor IS NULL OR (p_actor_id IS NOT NULL AND p_actor_id IS DISTINCT FROM v_actor) THEN
      RAISE EXCEPTION 'Actor identity mismatch' USING ERRCODE = 'P0001';
    END IF;

    v_allowed := public.is_finance_action_authorized(
      v_actor,
      p_company_id,
      ARRAY['finance.payment.create', 'finance.payments.create', 'finance.payments.write', 'payments.create'],
      ARRAY['super_admin', 'admin', 'company_admin', 'manager', 'accountant']
    );

    IF NOT v_allowed THEN
      RAISE EXCEPTION 'Not authorized to repair payment journals'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT *
  INTO v_payment
  FROM public.payments payment
  WHERE payment.id = p_payment_id
    AND payment.company_id = p_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found in company' USING ERRCODE = 'P0001';
  END IF;

  IF lower(COALESCE(v_payment.payment_status, '')) NOT IN ('completed', 'paid', 'success', 'succeeded')
     OR lower(COALESCE(v_payment.transaction_type::text, 'receipt')) <> 'receipt'
  THEN
    RETURN jsonb_build_object(
      'ok', true,
      'status', 'skipped_not_completed_receipt',
      'payment_id', v_payment.id,
      'journal_entry_id', v_payment.journal_entry_id
    );
  END IF;

  IF v_payment.journal_entry_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.journal_entries entry
    WHERE entry.id = v_payment.journal_entry_id
      AND entry.company_id = p_company_id
      AND entry.reference_type = 'payment'
      AND entry.reference_id = v_payment.id
      AND lower(COALESCE(entry.status::text, '')) = 'posted'
  ) THEN
    RETURN jsonb_build_object(
      'ok', true,
      'status', 'already_linked',
      'payment_id', v_payment.id,
      'journal_entry_id', v_payment.journal_entry_id
    );
  END IF;

  v_journal_id := public.create_payment_receipt_journal(
    v_payment.id,
    v_payment.company_id,
    v_payment.payment_number,
    v_payment.payment_date,
    v_payment.amount,
    v_payment.payment_method,
    v_payment.invoice_id,
    v_payment.account_id,
    v_actor,
    v_payment.cost_center_id
  );

  UPDATE public.payments payment
  SET journal_entry_id = v_journal_id, updated_at = now()
  WHERE payment.id = v_payment.id
    AND payment.company_id = p_company_id;

  RETURN jsonb_build_object(
    'ok', true,
    'status', CASE WHEN v_payment.journal_entry_id IS NULL THEN 'created_or_relinked' ELSE 'relinked' END,
    'payment_id', v_payment.id,
    'journal_entry_id', v_journal_id
  );
END;
$$;
REVOKE ALL ON FUNCTION public.ensure_payment_journal_entry(uuid, uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_payment_journal_entry(uuid, uuid, uuid)
  TO authenticated, service_role;
DROP FUNCTION IF EXISTS public.create_payment_receipt_journal(
  uuid, uuid, text, date, numeric, text, uuid, uuid, uuid
);
CREATE OR REPLACE FUNCTION public.create_payment_bank_transaction(payment_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_existing public.bank_transactions%ROWTYPE;
  v_bank_id uuid;
  v_transaction_id uuid;
  v_transaction_type text;
  v_balance numeric;
  v_actor uuid := auth.uid();
  v_actor_role text := COALESCE(NULLIF(auth.role()::text, ''), current_setting('request.jwt.claim.role', true), '');
  v_allowed boolean := false;
  v_previous_bypass text := COALESCE(current_setting('app.financial_controls_bypass', true), '');
BEGIN
  SELECT *
  INTO v_payment
  FROM public.payments payment
  WHERE payment.id = payment_id_param
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found' USING ERRCODE = 'P0001';
  END IF;

  IF v_actor_role <> 'service_role' THEN
    v_allowed := public.is_finance_action_authorized(
      v_actor,
      v_payment.company_id,
      ARRAY['finance.payment.create', 'finance.payments.create', 'finance.payments.write', 'payments.create'],
      ARRAY['super_admin', 'admin', 'company_admin', 'manager', 'accountant', 'sales_agent']
    );

    IF NOT v_allowed THEN
      RAISE EXCEPTION 'Not authorized to create the payment bank transaction'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF NOT public.payment_method_uses_bank(v_payment.payment_method) THEN
    RETURN NULL;
  END IF;
  IF lower(COALESCE(v_payment.payment_status, '')) NOT IN ('completed', 'paid', 'success', 'succeeded') THEN
    RAISE EXCEPTION 'A bank transaction can only be created for a completed payment'
      USING ERRCODE = 'P0001';
  END IF;

  v_bank_id := public.resolve_payment_bank_id(
    v_payment.company_id,
    v_payment.bank_id,
    v_payment.payment_method,
    v_payment.currency
  );
  IF v_payment.bank_id IS NULL THEN
    PERFORM set_config('app.financial_controls_bypass', 'on', true);
    UPDATE public.payments payment
    SET bank_id = v_bank_id, updated_at = now()
    WHERE payment.id = v_payment.id;
    PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
    v_payment.bank_id := v_bank_id;
  END IF;

  v_transaction_type := CASE
    WHEN lower(COALESCE(v_payment.transaction_type::text, 'receipt')) = 'receipt'
      THEN 'deposit'
    ELSE 'withdrawal'
  END;

  SELECT *
  INTO v_existing
  FROM public.bank_transactions transaction
  WHERE transaction.company_id = v_payment.company_id
    AND transaction.payment_id = v_payment.id
    AND transaction.reversal_of_transaction_id IS NULL
  ORDER BY transaction.created_at
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing.bank_id IS DISTINCT FROM v_bank_id
       OR v_existing.transaction_type IS DISTINCT FROM v_transaction_type
       OR abs(COALESCE(v_existing.amount, 0) - COALESCE(v_payment.amount, 0)) >= 0.005
       OR lower(COALESCE(v_existing.status, '')) <> 'completed'
    THEN
      RAISE EXCEPTION 'Existing bank transaction does not match the payment'
        USING ERRCODE = 'P0001';
    END IF;
    RETURN v_existing.id;
  END IF;

  SELECT *
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

  PERFORM public.assert_financial_period_is_open(v_payment.company_id, v_payment.payment_date);

  SELECT COALESCE(bank.current_balance, bank.opening_balance, 0)
  INTO v_balance
  FROM public.banks bank
  WHERE bank.id = v_bank_id
  FOR UPDATE;

  INSERT INTO public.bank_transactions (
    company_id,
    bank_id,
    transaction_number,
    transaction_date,
    transaction_type,
    amount,
    balance_after,
    description,
    reference_number,
    check_number,
    status,
    created_by,
    journal_entry_id,
    payment_id,
    reversal_of_transaction_id
  ) VALUES (
    v_payment.company_id,
    v_bank_id,
    'BT-PAY-' || v_payment.id::text,
    v_payment.payment_date,
    v_transaction_type,
    v_payment.amount,
    v_balance,
    CASE
      WHEN v_transaction_type = 'deposit' THEN 'Receipt: '
      ELSE 'Payment: '
    END || COALESCE(v_payment.payment_number, v_payment.id::text),
    v_payment.payment_number,
    v_payment.check_number,
    'completed',
    COALESCE(v_actor, v_payment.created_by),
    v_payment.journal_entry_id,
    v_payment.id,
    NULL
  )
  RETURNING id INTO v_transaction_id;

  v_balance := public.recalculate_bank_balance(v_bank_id);
  UPDATE public.bank_transactions transaction
  SET balance_after = v_balance, updated_at = now()
  WHERE transaction.id = v_transaction_id;

  PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
  RETURN v_transaction_id;
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
    RAISE;
END;
$$;
REVOKE ALL ON FUNCTION public.create_payment_bank_transaction(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_payment_bank_transaction(uuid)
  TO service_role;
CREATE OR REPLACE FUNCTION public.reverse_payment_bank_transaction(payment_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_original public.bank_transactions%ROWTYPE;
  v_existing_reversal public.bank_transactions%ROWTYPE;
  v_actor uuid := auth.uid();
  v_actor_role text := COALESCE(NULLIF(auth.role()::text, ''), current_setting('request.jwt.claim.role', true), '');
  v_allowed boolean := false;
  v_reversal_id uuid;
  v_balance numeric;
BEGIN
  SELECT *
  INTO v_payment
  FROM public.payments payment
  WHERE payment.id = payment_id_param
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found' USING ERRCODE = 'P0001';
  END IF;

  IF v_actor_role <> 'service_role' THEN
    v_allowed := public.is_finance_action_authorized(
      v_actor,
      v_payment.company_id,
      ARRAY['finance.payment.cancel', 'payments.delete'],
      ARRAY['super_admin', 'admin', 'company_admin', 'accountant']
    );

    IF NOT v_allowed THEN
      RAISE EXCEPTION 'Not authorized to reverse the payment bank transaction'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT *
  INTO v_original
  FROM public.bank_transactions transaction
  WHERE transaction.company_id = v_payment.company_id
    AND transaction.payment_id = v_payment.id
    AND transaction.reversal_of_transaction_id IS NULL
  ORDER BY transaction.created_at
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    SELECT *
    INTO v_original
    FROM public.bank_transactions transaction
    WHERE transaction.company_id = v_payment.company_id
      AND transaction.payment_id IS NULL
      AND transaction.reversal_of_transaction_id IS NULL
      AND transaction.reference_number IN (v_payment.payment_number, v_payment.reference_number)
      AND transaction.transaction_type IN ('deposit', 'withdrawal')
      AND (v_payment.bank_id IS NULL OR transaction.bank_id = v_payment.bank_id)
      AND abs(COALESCE(transaction.amount, 0) - COALESCE(v_payment.amount, 0)) < 0.005
    ORDER BY CASE WHEN lower(COALESCE(transaction.status, '')) = 'completed' THEN 0 ELSE 1 END,
      transaction.created_at
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
      UPDATE public.bank_transactions transaction
      SET
        payment_id = v_payment.id,
        journal_entry_id = COALESCE(transaction.journal_entry_id, v_payment.journal_entry_id),
        updated_at = now()
      WHERE transaction.id = v_original.id;
      v_original.payment_id := v_payment.id;
    END IF;
  END IF;

  IF v_original.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT *
  INTO v_existing_reversal
  FROM public.bank_transactions transaction
  WHERE transaction.reversal_of_transaction_id = v_original.id
  ORDER BY transaction.created_at
  LIMIT 1
  FOR UPDATE;

  IF v_existing_reversal.id IS NOT NULL THEN
    IF lower(COALESCE(v_existing_reversal.status, '')) <> 'completed'
       OR v_existing_reversal.payment_id IS DISTINCT FROM v_payment.id
       OR v_existing_reversal.bank_id IS DISTINCT FROM v_original.bank_id
       OR abs(COALESCE(v_existing_reversal.amount, 0) - COALESCE(v_original.amount, 0)) >= 0.005
       OR v_existing_reversal.transaction_type IS DISTINCT FROM (
         CASE WHEN v_original.transaction_type = 'withdrawal' THEN 'deposit' ELSE 'withdrawal' END
       )
    THEN
      RAISE EXCEPTION 'Existing payment bank reversal is inconsistent'
        USING ERRCODE = 'P0001';
    END IF;

    IF lower(COALESCE(v_original.status, '')) <> 'completed' THEN
      UPDATE public.bank_transactions transaction
      SET status = 'completed', updated_at = now()
      WHERE transaction.id = v_original.id;
    END IF;
    PERFORM public.recalculate_bank_balance(v_original.bank_id);
    RETURN v_existing_reversal.id;
  END IF;

  IF lower(COALESCE(v_original.status, '')) <> 'completed' THEN
    UPDATE public.bank_transactions transaction
    SET status = 'completed', updated_at = now()
    WHERE transaction.id = v_original.id;
  END IF;

  PERFORM public.assert_financial_period_is_open(v_payment.company_id, CURRENT_DATE);

  SELECT COALESCE(bank.current_balance, bank.opening_balance, 0)
  INTO v_balance
  FROM public.banks bank
  WHERE bank.id = v_original.bank_id
  FOR UPDATE;

  INSERT INTO public.bank_transactions (
    company_id,
    bank_id,
    transaction_number,
    transaction_date,
    transaction_type,
    amount,
    balance_after,
    description,
    reference_number,
    check_number,
    status,
    created_by,
    journal_entry_id,
    payment_id,
    reversal_of_transaction_id
  ) VALUES (
    v_payment.company_id,
    v_original.bank_id,
    'REV-PAY-' || v_payment.id::text,
    CURRENT_DATE,
    CASE WHEN v_original.transaction_type = 'withdrawal' THEN 'deposit' ELSE 'withdrawal' END,
    v_original.amount,
    v_balance,
    'Reversal of payment bank transaction ' || COALESCE(v_original.transaction_number, v_original.id::text),
    'REV-' || COALESCE(v_payment.payment_number, v_original.reference_number, v_payment.id::text),
    v_original.check_number,
    'completed',
    COALESCE(v_actor, v_payment.created_by),
    v_payment.journal_entry_id,
    v_payment.id,
    v_original.id
  )
  RETURNING id INTO v_reversal_id;

  v_balance := public.recalculate_bank_balance(v_original.bank_id);
  UPDATE public.bank_transactions transaction
  SET balance_after = v_balance, updated_at = now()
  WHERE transaction.id = v_reversal_id;

  RETURN v_reversal_id;
END;
$$;
REVOKE ALL ON FUNCTION public.reverse_payment_bank_transaction(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_payment_bank_transaction(uuid)
  TO service_role;
CREATE OR REPLACE FUNCTION public.reverse_journal_entry(
  entry_id uuid,
  reversal_reason text,
  reversed_by_user uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_original public.journal_entries%ROWTYPE;
  v_reversal_id uuid;
  v_actor uuid;
  v_actor_role text := COALESCE(NULLIF(auth.role()::text, ''), current_setting('request.jwt.claim.role', true), '');
  v_allowed boolean := false;
  v_line_count integer := 0;
  v_approved_internal_reversal boolean :=
    COALESCE(current_setting('app.approved_invoice_cancellation', true), '') = 'on';
  v_previous_bypass text := COALESCE(current_setting('app.financial_controls_bypass', true), '');
BEGIN
  IF entry_id IS NULL OR NULLIF(BTRIM(COALESCE(reversal_reason, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Journal entry and reversal reason are required'
      USING ERRCODE = 'P0001';
  END IF;

  v_actor := CASE WHEN v_actor_role = 'service_role' THEN reversed_by_user ELSE auth.uid() END;
  IF v_actor_role <> 'service_role' THEN
    IF v_actor IS NULL OR reversed_by_user IS DISTINCT FROM v_actor THEN
      RAISE EXCEPTION 'Actor identity mismatch' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  SELECT *
  INTO v_original
  FROM public.journal_entries entry
  WHERE entry.id = entry_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Journal entry not found' USING ERRCODE = 'P0001';
  END IF;

  IF v_actor_role <> 'service_role' AND NOT v_approved_internal_reversal THEN
    v_allowed := public.is_finance_action_authorized(
      v_actor,
      v_original.company_id,
      ARRAY['finance.journal.reverse'],
      ARRAY['super_admin', 'admin', 'company_admin', 'accountant']
    );
    IF NOT v_allowed THEN
      RAISE EXCEPTION 'Not authorized to reverse journal entries for this company'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF lower(COALESCE(v_original.status::text, '')) <> 'posted' THEN
    RAISE EXCEPTION 'Only posted journal entries can be reversed'
      USING ERRCODE = 'P0001';
  END IF;
  IF v_original.reference_type = 'journal_reversal' THEN
    RAISE EXCEPTION 'A reversal entry cannot itself be reversed; reverse the correcting business transaction instead'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_original.reversal_entry_id IS NOT NULL THEN
    IF NOT public.journal_entries_are_exact_reversals(v_original.id, v_original.reversal_entry_id) THEN
      RAISE EXCEPTION 'The linked reversal is not an exact posted opposite of the original journal'
        USING ERRCODE = 'P0001';
    END IF;
    RETURN v_original.reversal_entry_id;
  END IF;

  SELECT entry.id
  INTO v_reversal_id
  FROM public.journal_entries entry
  WHERE entry.company_id = v_original.company_id
    AND entry.reference_type = 'journal_reversal'
    AND entry.reference_id = v_original.id
  ORDER BY entry.created_at
  LIMIT 1
  FOR UPDATE;

  IF v_reversal_id IS NOT NULL THEN
    IF NOT public.journal_entries_are_exact_reversals(v_original.id, v_reversal_id) THEN
      RAISE EXCEPTION 'An orphan journal reversal exists but does not exactly offset the original'
        USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.journal_entries entry
    SET
      status = 'reversed',
      reversal_entry_id = v_reversal_id,
      reversed_by = COALESCE(entry.reversed_by, v_actor),
      reversed_at = COALESCE(entry.reversed_at, now()),
      updated_at = now()
    WHERE entry.id = v_original.id;
    RETURN v_reversal_id;
  END IF;

  SELECT COUNT(*)::integer
  INTO v_line_count
  FROM public.journal_entry_lines line
  WHERE line.journal_entry_id = v_original.id;

  IF v_line_count < 2 THEN
    RAISE EXCEPTION 'Journal entry has fewer than two lines and cannot be reversed automatically'
      USING ERRCODE = 'P0001';
  END IF;

  PERFORM public.assert_financial_period_is_open(v_original.company_id, CURRENT_DATE);
  PERFORM set_config('app.financial_controls_bypass', 'on', true);

  INSERT INTO public.journal_entries (
    company_id,
    entry_number,
    entry_date,
    reference_type,
    reference_id,
    description,
    total_debit,
    total_credit,
    status,
    created_by,
    created_at,
    updated_at
  ) VALUES (
    v_original.company_id,
    'REV-JE-' || v_original.id::text,
    CURRENT_DATE,
    'journal_reversal',
    v_original.id,
    'Reversal of ' || COALESCE(v_original.entry_number, v_original.id::text) ||
      ' - ' || BTRIM(reversal_reason),
    COALESCE(v_original.total_credit, 0),
    COALESCE(v_original.total_debit, 0),
    'draft',
    v_actor,
    now(),
    now()
  )
  RETURNING id INTO v_reversal_id;

  INSERT INTO public.journal_entry_lines (
    journal_entry_id,
    account_id,
    debit_amount,
    credit_amount,
    line_description,
    line_number,
    cost_center_id,
    asset_id,
    employee_id
  )
  SELECT
    v_reversal_id,
    line.account_id,
    COALESCE(line.credit_amount, 0),
    COALESCE(line.debit_amount, 0),
    'Reversal - ' || COALESCE(line.line_description, v_original.entry_number, 'journal'),
    ROW_NUMBER() OVER (ORDER BY line.line_number, line.id),
    line.cost_center_id,
    line.asset_id,
    line.employee_id
  FROM public.journal_entry_lines line
  WHERE line.journal_entry_id = v_original.id;

  UPDATE public.journal_entries entry
  SET
    status = 'posted',
    posted_by = v_actor,
    posted_at = now(),
    updated_at = now()
  WHERE entry.id = v_reversal_id;

  UPDATE public.journal_entries entry
  SET
    status = 'reversed',
    reversal_entry_id = v_reversal_id,
    reversed_by = v_actor,
    reversed_at = now(),
    updated_at = now()
  WHERE entry.id = v_original.id;

  PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
  RETURN v_reversal_id;
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
    RAISE;
END;
$$;
REVOKE ALL ON FUNCTION public.reverse_journal_entry(uuid, text, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reverse_journal_entry(uuid, text, uuid)
  TO authenticated, service_role;
DROP FUNCTION IF EXISTS public.create_payment_atomic(
  uuid, uuid, uuid, uuid, text, date, numeric, text, text, text,
  text, text, text, uuid, text, uuid
);
CREATE OR REPLACE FUNCTION public.create_payment_atomic(
  p_company_id uuid,
  p_customer_id uuid,
  p_contract_id uuid,
  p_invoice_id uuid,
  p_payment_number text,
  p_payment_date date,
  p_amount numeric,
  p_payment_method text,
  p_payment_type text DEFAULT NULL,
  p_transaction_type text DEFAULT 'receipt',
  p_reference_number text DEFAULT NULL,
  p_agreement_number text DEFAULT NULL,
  p_check_number text DEFAULT NULL,
  p_bank_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_created_by uuid DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL,
  p_account_id uuid DEFAULT NULL,
  p_cost_center_id uuid DEFAULT NULL,
  p_currency text DEFAULT 'QAR',
  p_initial_status text DEFAULT 'completed',
  p_registration_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid;
  v_actor_role text := COALESCE(NULLIF(auth.role()::text, ''), current_setting('request.jwt.claim.role', true), '');
  v_allowed boolean := false;
  v_customer_id uuid := p_customer_id;
  v_contract_id uuid := p_contract_id;
  v_invoice public.invoices%ROWTYPE;
  v_contract public.contracts%ROWTYPE;
  v_existing public.payments%ROWTYPE;
  v_payment_id uuid;
  v_bank_id uuid;
  v_payment_number text;
  v_method text := lower(BTRIM(COALESCE(p_payment_method, '')));
  v_status text := lower(BTRIM(COALESCE(p_initial_status, 'completed')));
  v_idempotency_key text := NULLIF(BTRIM(COALESCE(p_idempotency_key, '')), '');
  v_registration_metadata jsonb := COALESCE(p_registration_metadata, '{}'::jsonb);
  v_existing_paid numeric := 0;
BEGIN
  IF p_company_id IS NULL OR p_payment_date IS NULL OR COALESCE(p_amount, 0) <= 0
     OR v_method = ''
  THEN
    RAISE EXCEPTION 'Company, payment date, positive amount, and method are required'
      USING ERRCODE = 'P0001';
  END IF;
  IF lower(BTRIM(COALESCE(p_transaction_type, ''))) <> 'receipt' THEN
    RAISE EXCEPTION 'create_payment_atomic only supports customer receipts; use the payable workflow for outgoing payments'
      USING ERRCODE = 'P0001';
  END IF;
  IF v_status NOT IN ('pending', 'completed') THEN
    RAISE EXCEPTION 'Initial payment status must be pending or completed'
      USING ERRCODE = 'P0001';
  END IF;
  IF jsonb_typeof(v_registration_metadata) <> 'object' THEN
    RAISE EXCEPTION 'Payment registration metadata must be a JSON object'
      USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM jsonb_each(v_registration_metadata) metadata(key, value)
    WHERE metadata.key IN (
      'monthly_amount', 'amount_paid', 'remaining_amount',
      'days_overdue', 'late_fee_amount'
    )
      AND jsonb_typeof(metadata.value) NOT IN ('number', 'null')
  ) THEN
    RAISE EXCEPTION 'Numeric payment registration metadata contains a non-numeric value'
      USING ERRCODE = 'P0001';
  END IF;
  IF COALESCE((v_registration_metadata ->> 'monthly_amount')::numeric, 0) < 0
     OR COALESCE((v_registration_metadata ->> 'amount_paid')::numeric, 0) < 0
     OR COALESCE((v_registration_metadata ->> 'remaining_amount')::numeric, 0) < 0
     OR COALESCE((v_registration_metadata ->> 'days_overdue')::integer, 0) < 0
     OR COALESCE((v_registration_metadata ->> 'late_fee_amount')::numeric, 0) < 0
  THEN
    RAISE EXCEPTION 'Payment registration amounts and overdue days cannot be negative'
      USING ERRCODE = 'P0001';
  END IF;
  IF v_registration_metadata ? 'payment_month'
     AND COALESCE(v_registration_metadata ->> 'payment_month', '') !~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
  THEN
    RAISE EXCEPTION 'Payment month must use YYYY-MM format'
      USING ERRCODE = 'P0001';
  END IF;

  v_actor := CASE WHEN v_actor_role = 'service_role' THEN p_created_by ELSE auth.uid() END;
  IF v_actor_role <> 'service_role' THEN
    IF v_actor IS NULL OR (p_created_by IS NOT NULL AND p_created_by IS DISTINCT FROM v_actor) THEN
      RAISE EXCEPTION 'Actor identity mismatch' USING ERRCODE = 'P0001';
    END IF;

    v_allowed := public.is_finance_action_authorized(
      v_actor,
      p_company_id,
      ARRAY['finance.payment.create', 'finance.payments.create', 'finance.payments.write', 'payments.create'],
      ARRAY['super_admin', 'admin', 'company_admin', 'manager', 'accountant', 'sales_agent']
    );

    IF NOT v_allowed THEN
      RAISE EXCEPTION 'Not authorized to create payments for this company'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  PERFORM public.assert_financial_period_is_open(p_company_id, p_payment_date);

  IF p_invoice_id IS NOT NULL THEN
    SELECT *
    INTO v_invoice
    FROM public.invoices invoice
    WHERE invoice.id = p_invoice_id
      AND invoice.company_id = p_company_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invoice not found in the requested company'
        USING ERRCODE = 'P0001';
    END IF;
    IF lower(COALESCE(v_invoice.status, '')) IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
       OR lower(COALESCE(v_invoice.payment_status, '')) IN ('cancelled', 'canceled', 'void', 'voided')
    THEN
      RAISE EXCEPTION 'Cannot pay an inactive invoice'
        USING ERRCODE = 'P0001';
    END IF;

    IF v_customer_id IS NULL THEN
      v_customer_id := v_invoice.customer_id;
    ELSIF v_invoice.customer_id IS NOT NULL AND v_customer_id IS DISTINCT FROM v_invoice.customer_id THEN
      RAISE EXCEPTION 'Payment customer does not match the invoice customer'
        USING ERRCODE = 'P0001';
    END IF;

    IF v_contract_id IS NULL THEN
      v_contract_id := v_invoice.contract_id;
    ELSIF v_invoice.contract_id IS DISTINCT FROM v_contract_id THEN
      RAISE EXCEPTION 'Payment contract does not match the invoice contract'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF v_contract_id IS NOT NULL THEN
    SELECT *
    INTO v_contract
    FROM public.contracts contract
    WHERE contract.id = v_contract_id
      AND contract.company_id = p_company_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Contract not found in the requested company'
        USING ERRCODE = 'P0001';
    END IF;
    IF v_customer_id IS NULL THEN
      v_customer_id := v_contract.customer_id;
    ELSIF v_customer_id IS DISTINCT FROM v_contract.customer_id THEN
      RAISE EXCEPTION 'Payment customer does not match the contract customer'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF v_customer_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.customers customer
    WHERE customer.id = v_customer_id
      AND customer.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'A customer belonging to the company is required for a receipt'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_account_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.chart_of_accounts account
    WHERE account.id = p_account_id
      AND account.company_id = p_company_id
      AND account.is_active = true
      AND COALESCE(account.is_header, false) = false
      AND COALESCE(account.account_level, 0) >= 3
      AND lower(COALESCE(account.account_type, '')) = 'assets'
      AND lower(COALESCE(account.balance_type, '')) = 'debit'
  ) THEN
    RAISE EXCEPTION 'The selected payment account is not a valid posting asset account'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_cost_center_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.cost_centers center
    WHERE center.id = p_cost_center_id
      AND center.company_id = p_company_id
      AND COALESCE(center.is_active, true) = true
  ) THEN
    RAISE EXCEPTION 'The selected cost center is inactive or belongs to another company'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_invoice_id IS NOT NULL THEN
    v_existing_paid := public.canonical_invoice_paid_amount(p_invoice_id, NULL);
    IF v_existing_paid + p_amount > COALESCE(v_invoice.total_amount, 0) + 0.01 THEN
      RAISE EXCEPTION 'Payment would overpay invoice by QAR %',
        round((v_existing_paid + p_amount - COALESCE(v_invoice.total_amount, 0))::numeric, 2)
        USING ERRCODE = 'P0001';
    END IF;
  ELSIF v_contract_id IS NOT NULL THEN
    v_existing_paid := public.canonical_contract_paid_amount(v_contract_id);
    IF COALESCE(v_contract.contract_amount, 0) > 0
       AND v_existing_paid + p_amount > COALESCE(v_contract.contract_amount, 0) + 0.01
    THEN
      RAISE EXCEPTION 'Payment would overpay contract by QAR %',
        round((v_existing_paid + p_amount - COALESCE(v_contract.contract_amount, 0))::numeric, 2)
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  v_bank_id := public.resolve_payment_bank_id(
    p_company_id,
    p_bank_id,
    v_method,
    upper(COALESCE(NULLIF(BTRIM(p_currency), ''), 'QAR'))
  );

  IF v_idempotency_key IS NOT NULL THEN
    SELECT *
    INTO v_existing
    FROM public.payments payment
    WHERE payment.company_id = p_company_id
      AND payment.idempotency_key = v_idempotency_key
    ORDER BY payment.created_at
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
      IF lower(COALESCE(v_existing.payment_status, '')) IN (
        'cancelled', 'canceled', 'void', 'voided', 'reversed'
      ) THEN
        RAISE EXCEPTION 'Idempotency key belongs to a cancelled payment; submit a new key'
          USING ERRCODE = 'P0001';
      END IF;

      IF v_existing.customer_id IS DISTINCT FROM v_customer_id
         OR v_existing.contract_id IS DISTINCT FROM v_contract_id
         OR v_existing.invoice_id IS DISTINCT FROM p_invoice_id
         OR v_existing.payment_date IS DISTINCT FROM p_payment_date
         OR abs(COALESCE(v_existing.amount, 0) - p_amount) >= 0.005
         OR lower(COALESCE(v_existing.payment_method, '')) IS DISTINCT FROM v_method
         OR lower(COALESCE(v_existing.transaction_type::text, '')) <> 'receipt'
         OR (
           NULLIF(BTRIM(COALESCE(p_payment_number, '')), '') IS NOT NULL
           AND v_existing.payment_number IS DISTINCT FROM BTRIM(p_payment_number)
         )
      THEN
        RAISE EXCEPTION 'Idempotency key was already used with different payment data'
          USING ERRCODE = 'P0001';
      END IF;

      RETURN v_existing.id;
    END IF;
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      'payment-number:' || p_company_id::text || ':' || EXTRACT(YEAR FROM p_payment_date)::text,
      0
    )
  );

  v_payment_number := NULLIF(BTRIM(COALESCE(p_payment_number, '')), '');
  IF v_payment_number IS NULL THEN
    v_payment_number := public.generate_payment_number(p_company_id);
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.payments payment
    WHERE payment.company_id = p_company_id
      AND payment.payment_number = v_payment_number
  ) THEN
    RAISE EXCEPTION 'Payment number % already exists for this company', v_payment_number
      USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.payments (
    company_id,
    customer_id,
    contract_id,
    invoice_id,
    payment_number,
    payment_date,
    amount,
    payment_method,
    payment_type,
    payment_status,
    transaction_type,
    reference_number,
    agreement_number,
    check_number,
    bank_id,
    notes,
    created_by,
    allocation_status,
    processing_status,
    idempotency_key,
    account_id,
    cost_center_id,
    currency,
    monthly_amount,
    amount_paid,
    remaining_amount,
    payment_month,
    due_date,
    days_overdue,
    late_fee_amount,
    created_at,
    updated_at
  ) VALUES (
    p_company_id,
    v_customer_id,
    v_contract_id,
    p_invoice_id,
    v_payment_number,
    p_payment_date,
    p_amount,
    v_method,
    COALESCE(NULLIF(BTRIM(p_payment_type), ''), v_method),
    v_status,
    'receipt'::public.transaction_type,
    NULLIF(BTRIM(COALESCE(p_reference_number, '')), ''),
    NULLIF(BTRIM(COALESCE(p_agreement_number, '')), ''),
    NULLIF(BTRIM(COALESCE(p_check_number, '')), ''),
    v_bank_id,
    NULLIF(BTRIM(COALESCE(p_notes, '')), ''),
    v_actor,
    CASE
      WHEN v_status <> 'completed' THEN 'pending'
      WHEN p_invoice_id IS NULL THEN 'unallocated'
      ELSE 'fully_allocated'
    END,
    CASE WHEN v_status = 'completed' THEN 'completed' ELSE 'pending' END,
    v_idempotency_key,
    p_account_id,
    p_cost_center_id,
    upper(COALESCE(NULLIF(BTRIM(p_currency), ''), 'QAR')),
    NULLIF(v_registration_metadata ->> 'monthly_amount', '')::numeric,
    NULLIF(v_registration_metadata ->> 'amount_paid', '')::numeric,
    NULLIF(v_registration_metadata ->> 'remaining_amount', '')::numeric,
    NULLIF(v_registration_metadata ->> 'payment_month', ''),
    NULLIF(v_registration_metadata ->> 'due_date', '')::date,
    NULLIF(v_registration_metadata ->> 'days_overdue', '')::integer,
    NULLIF(v_registration_metadata ->> 'late_fee_amount', '')::numeric,
    now(),
    now()
  )
  RETURNING id INTO v_payment_id;

  IF v_status = 'completed' THEN
    PERFORM public.create_payment_bank_transaction(v_payment_id);
  END IF;

  RETURN v_payment_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_payment_atomic(
  uuid, uuid, uuid, uuid, text, date, numeric, text, text, text,
  text, text, text, uuid, text, uuid, text, uuid, uuid, text, text, jsonb
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_payment_atomic(
  uuid, uuid, uuid, uuid, text, date, numeric, text, text, text,
  text, text, text, uuid, text, uuid, text, uuid, uuid, text, text, jsonb
) TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.approve_payment_atomic(
  p_payment_id uuid,
  p_company_id uuid,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_actor uuid;
  v_actor_role text := COALESCE(NULLIF(auth.role()::text, ''), current_setting('request.jwt.claim.role', true), '');
  v_allowed boolean := false;
  v_bank_transaction_id uuid;
BEGIN
  IF p_payment_id IS NULL OR p_company_id IS NULL THEN
    RAISE EXCEPTION 'Payment and company are required' USING ERRCODE = 'P0001';
  END IF;

  v_actor := CASE WHEN v_actor_role = 'service_role' THEN p_actor_id ELSE auth.uid() END;
  IF v_actor_role <> 'service_role' THEN
    IF v_actor IS NULL OR (p_actor_id IS NOT NULL AND p_actor_id IS DISTINCT FROM v_actor) THEN
      RAISE EXCEPTION 'Actor identity mismatch' USING ERRCODE = 'P0001';
    END IF;

    v_allowed := public.is_finance_action_authorized(
      v_actor,
      p_company_id,
      ARRAY['finance.payment.approve', 'payments.approve'],
      ARRAY['super_admin', 'admin', 'company_admin', 'accountant']
    );

    IF NOT v_allowed THEN
      RAISE EXCEPTION 'Not authorized to approve payments for this company'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT *
  INTO v_payment
  FROM public.payments payment
  WHERE payment.id = p_payment_id
    AND payment.company_id = p_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found in company' USING ERRCODE = 'P0001';
  END IF;

  IF v_actor_role <> 'service_role'
     AND v_payment.created_by IS NOT NULL
     AND v_payment.created_by = v_actor
  THEN
    RAISE EXCEPTION 'Payment creator cannot approve the same payment'
      USING ERRCODE = '42501';
  END IF;

  IF lower(COALESCE(v_payment.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded') THEN
    SELECT transaction.id
    INTO v_bank_transaction_id
    FROM public.bank_transactions transaction
    WHERE transaction.payment_id = v_payment.id
      AND transaction.reversal_of_transaction_id IS NULL
    ORDER BY transaction.created_at
    LIMIT 1;

    RETURN jsonb_build_object(
      'payment_id', v_payment.id,
      'status', 'completed',
      'already_completed', true,
      'journal_entry_id', v_payment.journal_entry_id,
      'bank_transaction_id', v_bank_transaction_id
    );
  END IF;

  IF lower(COALESCE(v_payment.payment_status, '')) <> 'pending' THEN
    RAISE EXCEPTION 'Only pending payments can be approved'
      USING ERRCODE = 'P0001';
  END IF;

  PERFORM public.assert_financial_period_is_open(v_payment.company_id, v_payment.payment_date);

  UPDATE public.payments payment
  SET
    payment_status = 'completed',
    processing_status = 'completed',
    processing_completed_at = now(),
    processing_notes = CONCAT_WS(
      E'\n',
      NULLIF(payment.processing_notes, ''),
      'Payment approved atomically by ' || COALESCE(v_actor::text, 'system') || ' at ' || now()::text
    ),
    updated_at = now()
  WHERE payment.id = v_payment.id
    AND payment.company_id = p_company_id;

  v_bank_transaction_id := public.create_payment_bank_transaction(v_payment.id);

  SELECT *
  INTO v_payment
  FROM public.payments payment
  WHERE payment.id = p_payment_id;

  RETURN jsonb_build_object(
    'payment_id', v_payment.id,
    'status', v_payment.payment_status,
    'already_completed', false,
    'journal_entry_id', v_payment.journal_entry_id,
    'bank_transaction_id', v_bank_transaction_id
  );
END;
$$;
REVOKE ALL ON FUNCTION public.approve_payment_atomic(uuid, uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_payment_atomic(uuid, uuid, uuid)
  TO authenticated, service_role;
COMMENT ON FUNCTION public.create_payment_atomic(
  uuid, uuid, uuid, uuid, text, date, numeric, text, text, text,
  text, text, text, uuid, text, uuid, text, uuid, uuid, text, text, jsonb
) IS
'Creates an idempotent customer receipt, journal, allocation, contract totals, and bank movement in one database transaction.';
COMMENT ON FUNCTION public.approve_payment_atomic(uuid, uuid, uuid) IS
'Approves a pending receipt and creates its journal and bank movement atomically.';
