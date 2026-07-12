-- Roll back atomic payment/bank creation only before linked bank movements exist.
-- The stricter receipt-journal and journal-reversal validation are retained:
-- they are schema-compatible safeguards and removing them would weaken controls.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.bank_transactions transaction
    WHERE transaction.payment_id IS NOT NULL
       OR transaction.reversal_of_transaction_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION
      'Rollback stopped: linked payment bank movements exist. Reverse or migrate them with their audit trail before removing linkage columns.'
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.approve_payment_atomic(uuid, uuid, uuid);

DROP FUNCTION IF EXISTS public.create_payment_atomic(
  uuid, uuid, uuid, uuid, text, date, numeric, text, text, text,
  text, text, text, uuid, text, uuid, text, uuid, uuid, text, text, jsonb
);

CREATE OR REPLACE FUNCTION public.create_payment_bank_transaction(payment_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payment_record record;
  bank_transaction_id uuid;
  bank_record record;
  transaction_number_seq integer;
  new_balance numeric;
BEGIN
  SELECT * INTO payment_record
  FROM public.payments
  WHERE id = payment_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  IF payment_record.payment_method NOT IN ('bank_transfer', 'check')
     OR payment_record.bank_account IS NULL
  THEN
    RETURN NULL;
  END IF;

  SELECT * INTO bank_record
  FROM public.banks
  WHERE company_id = payment_record.company_id
    AND account_number = payment_record.bank_account
    AND is_active = true;

  IF NOT FOUND THEN
    SELECT * INTO bank_record
    FROM public.banks
    WHERE company_id = payment_record.company_id
      AND is_primary = true
      AND is_active = true
    LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    SELECT * INTO bank_record
    FROM public.banks
    WHERE company_id = payment_record.company_id
      AND is_active = true
    LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF payment_record.payment_type = 'payment' THEN
    new_balance := bank_record.current_balance - payment_record.amount;
  ELSE
    new_balance := bank_record.current_balance + payment_record.amount;
  END IF;

  SELECT COUNT(*) + 1 INTO transaction_number_seq
  FROM public.bank_transactions
  WHERE company_id = payment_record.company_id
    AND bank_id = bank_record.id
    AND EXTRACT(YEAR FROM transaction_date) = EXTRACT(YEAR FROM CURRENT_DATE);

  INSERT INTO public.bank_transactions (
    id,
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
    created_by
  ) VALUES (
    gen_random_uuid(),
    payment_record.company_id,
    bank_record.id,
    'BT-' || TO_CHAR(CURRENT_DATE, 'YY') || '-' || LPAD(transaction_number_seq::text, 4, '0'),
    payment_record.payment_date,
    CASE WHEN payment_record.payment_type = 'payment' THEN 'withdrawal' ELSE 'deposit' END,
    payment_record.amount,
    new_balance,
    CASE
      WHEN payment_record.payment_type = 'payment'
        THEN 'Payment: ' || COALESCE(payment_record.notes, payment_record.payment_number)
      ELSE 'Receipt: ' || COALESCE(payment_record.notes, payment_record.payment_number)
    END,
    payment_record.payment_number,
    payment_record.check_number,
    'completed',
    payment_record.created_by
  )
  RETURNING id INTO bank_transaction_id;

  UPDATE public.banks
  SET current_balance = new_balance, updated_at = now()
  WHERE id = bank_record.id;

  RETURN bank_transaction_id;
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
  SELECT * INTO v_payment
  FROM public.payments payment
  WHERE payment.id = payment_id_param
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found' USING ERRCODE = 'P0001';
  END IF;

  IF v_actor_role <> 'service_role' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles role
      WHERE role.user_id = v_actor
        AND role.role::text IN ('super_admin', 'admin', 'company_admin', 'manager', 'accountant')
    ) INTO v_allowed;
    IF NOT v_allowed OR (
      NOT EXISTS (
        SELECT 1 FROM public.user_roles role
        WHERE role.user_id = v_actor AND role.role::text = 'super_admin'
      )
      AND public.get_user_company_id() IS DISTINCT FROM v_payment.company_id
    ) THEN
      RAISE EXCEPTION 'Not authorized to reverse the payment bank transaction'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT transaction.*
  INTO v_original
  FROM public.bank_transactions transaction
  WHERE transaction.company_id = v_payment.company_id
    AND transaction.reference_number IN (v_payment.payment_number, v_payment.reference_number)
    AND transaction.transaction_type IN ('deposit', 'withdrawal')
    AND transaction.status IN ('completed', 'cancelled')
    AND (v_payment.bank_id IS NULL OR transaction.bank_id = v_payment.bank_id)
  ORDER BY CASE WHEN transaction.status = 'completed' THEN 0 ELSE 1 END, transaction.created_at
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT transaction.*
  INTO v_existing_reversal
  FROM public.bank_transactions transaction
  WHERE transaction.company_id = v_payment.company_id
    AND transaction.bank_id = v_original.bank_id
    AND transaction.status = 'completed'
    AND transaction.reference_number IN (
      'REV-' || COALESCE(v_original.reference_number, ''),
      'REV-' || COALESCE(v_payment.payment_number, '')
    )
  ORDER BY transaction.created_at
  LIMIT 1
  FOR UPDATE;

  IF v_original.status <> 'completed' THEN
    UPDATE public.bank_transactions
    SET status = 'completed', updated_at = now()
    WHERE id = v_original.id;
  END IF;

  IF v_existing_reversal.id IS NOT NULL THEN
    PERFORM public.recalculate_bank_balance(v_original.bank_id);
    RETURN v_existing_reversal.id;
  END IF;

  PERFORM public.assert_financial_period_is_open(v_payment.company_id, CURRENT_DATE);

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
    status,
    created_by
  ) VALUES (
    v_payment.company_id,
    v_original.bank_id,
    'REV-PAY-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || substring(v_payment.id::text, 1, 8),
    CURRENT_DATE,
    CASE WHEN v_original.transaction_type = 'withdrawal' THEN 'deposit' ELSE 'withdrawal' END,
    v_original.amount,
    COALESCE((SELECT current_balance FROM public.banks WHERE id = v_original.bank_id), 0),
    'Reversal of payment bank transaction ' || COALESCE(v_original.transaction_number, v_original.id::text),
    'REV-' || COALESCE(v_original.reference_number, v_payment.payment_number),
    'completed',
    COALESCE(v_actor, v_payment.created_by)
  )
  RETURNING id INTO v_reversal_id;

  v_balance := public.recalculate_bank_balance(v_original.bank_id);
  UPDATE public.bank_transactions
  SET balance_after = v_balance, updated_at = now()
  WHERE id = v_reversal_id;

  RETURN v_reversal_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reverse_payment_bank_transaction(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_payment_bank_transaction(uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public.create_payment_atomic(
  p_company_id uuid,
  p_customer_id uuid,
  p_contract_id uuid,
  p_invoice_id uuid,
  p_payment_number text,
  p_payment_date date,
  p_amount numeric,
  p_payment_method text,
  p_payment_type text DEFAULT 'regular',
  p_transaction_type text DEFAULT 'receipt',
  p_reference_number text DEFAULT NULL,
  p_agreement_number text DEFAULT NULL,
  p_check_number text DEFAULT NULL,
  p_bank_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_created_by uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid;
  v_actor_role text := COALESCE(NULLIF(auth.role()::text, ''), current_setting('request.jwt.claim.role', true), '');
  v_is_super_admin boolean := false;
  v_invoice public.invoices%ROWTYPE;
  v_contract public.contracts%ROWTYPE;
  v_existing_paid numeric := 0;
  v_payment_id uuid;
BEGIN
  IF p_company_id IS NULL OR p_customer_id IS NULL
     OR p_payment_number IS NULL OR BTRIM(p_payment_number) = ''
     OR p_payment_date IS NULL OR COALESCE(p_amount, 0) <= 0
     OR p_payment_method IS NULL OR BTRIM(p_payment_method) = ''
  THEN
    RAISE EXCEPTION 'Company, customer, payment number, date, positive amount, and method are required'
      USING ERRCODE = 'P0001';
  END IF;

  v_actor := CASE WHEN v_actor_role = 'service_role' THEN p_created_by ELSE auth.uid() END;
  IF v_actor IS NULL AND v_actor_role <> 'service_role' THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = 'P0001';
  END IF;

  IF v_actor_role <> 'service_role' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles role
      WHERE role.user_id = v_actor AND role.role::text = 'super_admin'
    ) INTO v_is_super_admin;
    IF NOT v_is_super_admin AND public.get_user_company_id() IS DISTINCT FROM p_company_id THEN
      RAISE EXCEPTION 'You cannot create payments for another company' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  PERFORM public.assert_financial_period_is_open(p_company_id, p_payment_date);

  IF p_contract_id IS NOT NULL THEN
    SELECT * INTO v_contract
    FROM public.contracts contract
    WHERE contract.id = p_contract_id AND contract.company_id = p_company_id
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Contract not found in the requested company' USING ERRCODE = 'P0001';
    END IF;
    IF p_customer_id IS DISTINCT FROM v_contract.customer_id THEN
      RAISE EXCEPTION 'Payment customer does not match the contract customer' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF p_invoice_id IS NOT NULL THEN
    SELECT * INTO v_invoice
    FROM public.invoices invoice
    WHERE invoice.id = p_invoice_id AND invoice.company_id = p_company_id
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invoice not found in the requested company' USING ERRCODE = 'P0001';
    END IF;
    IF lower(COALESCE(v_invoice.status, '')) IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
       OR lower(COALESCE(v_invoice.payment_status, '')) IN ('cancelled', 'canceled', 'void', 'voided')
    THEN
      RAISE EXCEPTION 'Cannot pay an inactive invoice' USING ERRCODE = 'P0001';
    END IF;
    IF v_invoice.customer_id IS NOT NULL AND p_customer_id IS DISTINCT FROM v_invoice.customer_id THEN
      RAISE EXCEPTION 'Payment customer does not match the invoice customer' USING ERRCODE = 'P0001';
    END IF;
    IF p_contract_id IS DISTINCT FROM v_invoice.contract_id THEN
      RAISE EXCEPTION 'Payment contract does not match the invoice contract' USING ERRCODE = 'P0001';
    END IF;

    SELECT COALESCE(SUM(payment.amount), 0)
    INTO v_existing_paid
    FROM public.payments payment
    WHERE payment.company_id = p_company_id
      AND payment.invoice_id = p_invoice_id
      AND lower(COALESCE(payment.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded')
      AND lower(COALESCE(payment.transaction_type::text, 'receipt')) = 'receipt';

    IF v_existing_paid + p_amount > COALESCE(v_invoice.total_amount, 0) + 0.01 THEN
      RAISE EXCEPTION 'Payment would overpay invoice by QAR %',
        ROUND((v_existing_paid + p_amount - COALESCE(v_invoice.total_amount, 0))::numeric, 2)
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF lower(COALESCE(p_transaction_type, '')) <> 'receipt' THEN
    RAISE EXCEPTION 'create_payment_atomic only supports customer receipts; use the payable workflow for outgoing payments'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.payments (
    company_id, customer_id, contract_id, invoice_id, payment_number,
    payment_date, amount, payment_method, payment_type, payment_status,
    transaction_type, reference_number, agreement_number, check_number,
    bank_id, notes, created_by, allocation_status, processing_status,
    created_at, updated_at
  ) VALUES (
    p_company_id, p_customer_id, p_contract_id, p_invoice_id, p_payment_number,
    p_payment_date, p_amount, p_payment_method, COALESCE(p_payment_type, 'regular'), 'completed',
    p_transaction_type::public.transaction_type, p_reference_number, p_agreement_number, p_check_number,
    p_bank_id, p_notes, v_actor,
    CASE WHEN p_invoice_id IS NULL THEN 'unallocated' ELSE 'fully_allocated' END,
    'completed', now(), now()
  )
  RETURNING id INTO v_payment_id;

  RETURN v_payment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_payment_atomic(
  uuid, uuid, uuid, uuid, text, date, numeric, text, text, text,
  text, text, text, uuid, text, uuid
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_payment_atomic(
  uuid, uuid, uuid, uuid, text, date, numeric, text, text, text,
  text, text, text, uuid, text, uuid
) TO authenticated, service_role;

DROP TRIGGER IF EXISTS a_enforce_bank_transaction_payment_link
  ON public.bank_transactions;
DROP FUNCTION IF EXISTS public.enforce_bank_transaction_payment_link();

DROP INDEX IF EXISTS public.uq_bank_transactions_reversal_of;
DROP INDEX IF EXISTS public.uq_bank_transactions_payment_original;
DROP INDEX IF EXISTS public.uq_payments_company_active_idempotency;
DROP INDEX IF EXISTS public.uq_payments_company_payment_number;

ALTER TABLE public.bank_transactions
  DROP CONSTRAINT IF EXISTS bank_transactions_no_self_reversal,
  DROP CONSTRAINT IF EXISTS bank_transactions_reversal_of_transaction_id_fkey,
  DROP CONSTRAINT IF EXISTS bank_transactions_payment_id_fkey;

ALTER TABLE public.bank_transactions
  DROP COLUMN IF EXISTS reversal_of_transaction_id,
  DROP COLUMN IF EXISTS payment_id;

DROP FUNCTION IF EXISTS public.resolve_payment_bank_id(uuid, uuid, text, text);

-- payment_method_uses_bank(text), the dimension-aware receipt journal, and the
-- hardened journal reversal remain installed because they do not depend on the
-- removed columns and are stricter than the preceding implementations.
