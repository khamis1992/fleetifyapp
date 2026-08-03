-- Restore the exact pre-migration create_payment_atomic definition and grants
-- from 20260712052400_atomic_payment_creation_and_bank_linkage.sql.

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

COMMENT ON FUNCTION public.create_payment_atomic(
  uuid, uuid, uuid, uuid, text, date, numeric, text, text, text,
  text, text, text, uuid, text, uuid, text, uuid, uuid, text, text, jsonb
) IS
'Creates an idempotent customer receipt, journal, allocation, contract totals, and bank movement in one database transaction.';

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
