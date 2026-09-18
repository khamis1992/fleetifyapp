-- Make payment cancellation, bank reversal, allocations, invoices, contracts,
-- and journal reversals one atomic operation.

CREATE TABLE IF NOT EXISTS public.payment_cancellation_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
  status_before text NOT NULL,
  status_after text NOT NULL DEFAULT 'cancelled',
  reason text NOT NULL,
  actor_id uuid,
  already_cancelled boolean NOT NULL DEFAULT false,
  reversal_entry_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  bank_reversal_transaction_id uuid REFERENCES public.bank_transactions(id) ON DELETE RESTRICT,
  affected_invoice_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  affected_contract_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payment_cancellation_audit_payment
  ON public.payment_cancellation_audit(payment_id, created_at DESC);
ALTER TABLE public.payment_cancellation_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.payment_cancellation_audit FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.payment_cancellation_audit TO authenticated;
GRANT SELECT, INSERT ON TABLE public.payment_cancellation_audit TO service_role;
DROP POLICY IF EXISTS payment_cancellation_audit_company_select
  ON public.payment_cancellation_audit;
CREATE POLICY payment_cancellation_audit_company_select
ON public.payment_cancellation_audit
FOR SELECT TO authenticated
USING (
  company_id = public.get_user_company_id()
  OR EXISTS (
    SELECT 1 FROM public.user_roles role
    WHERE role.user_id = auth.uid() AND role.role::text = 'super_admin'
  )
);
CREATE OR REPLACE FUNCTION public.is_finance_action_authorized(
  p_actor_id uuid,
  p_company_id uuid,
  p_permission_ids text[],
  p_allowed_roles text[]
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_super_admin boolean := false;
BEGIN
  IF p_actor_id IS NULL OR p_company_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles role
    WHERE role.user_id = p_actor_id
      AND role.role::text = 'super_admin'
  ) INTO v_is_super_admin;

  IF NOT v_is_super_admin
     AND public.get_user_company_id() IS DISTINCT FROM p_company_id
  THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_permissions permission
    WHERE permission.user_id = p_actor_id
      AND permission.permission_id = ANY(COALESCE(p_permission_ids, ARRAY[]::text[]))
      AND permission.granted = false
  ) THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.user_permissions permission
    WHERE permission.user_id = p_actor_id
      AND permission.permission_id = ANY(COALESCE(p_permission_ids, ARRAY[]::text[]))
      AND permission.granted = true
  ) THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles role
    WHERE role.user_id = p_actor_id
      AND role.role::text = ANY(COALESCE(p_allowed_roles, ARRAY[]::text[]))
      AND (
        role.role::text = 'super_admin'
        OR role.company_id IS NULL
        OR role.company_id = p_company_id
      )
  );
END;
$$;
REVOKE ALL ON FUNCTION public.is_finance_action_authorized(uuid, uuid, text[], text[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_finance_action_authorized(uuid, uuid, text[], text[])
  TO service_role;
CREATE OR REPLACE FUNCTION public.canonical_contract_paid_amount(p_contract_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(source.amount), 0)::numeric
  FROM (
    SELECT allocation.amount
    FROM public.payment_allocations allocation
    JOIN public.payments payment ON payment.id = allocation.payment_id
    JOIN public.invoices invoice
      ON allocation.allocation_type = 'invoice'
     AND invoice.id = allocation.target_id
    WHERE invoice.contract_id = p_contract_id
      AND allocation.is_active = true
      AND lower(COALESCE(payment.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded')
      AND lower(COALESCE(payment.transaction_type::text, 'receipt')) = 'receipt'
      AND lower(COALESCE(invoice.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')

    UNION ALL

    SELECT payment.amount
    FROM public.payments payment
    JOIN public.invoices invoice ON invoice.id = payment.invoice_id
    WHERE invoice.contract_id = p_contract_id
      AND lower(COALESCE(payment.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded')
      AND lower(COALESCE(payment.transaction_type::text, 'receipt')) = 'receipt'
      AND lower(COALESCE(invoice.status, '')) NOT IN ('cancelled', 'canceled', 'void', 'voided', 'deleted')
      AND NOT EXISTS (
        SELECT 1
        FROM public.payment_allocations allocation
        WHERE allocation.payment_id = payment.id
          AND allocation.is_active = true
      )

    UNION ALL

    SELECT payment.amount
    FROM public.payments payment
    WHERE payment.contract_id = p_contract_id
      AND payment.invoice_id IS NULL
      AND lower(COALESCE(payment.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded')
      AND lower(COALESCE(payment.transaction_type::text, 'receipt')) = 'receipt'
      AND NOT EXISTS (
        SELECT 1
        FROM public.payment_allocations allocation
        WHERE allocation.payment_id = payment.id
          AND allocation.is_active = true
      )
  ) source;
$$;
REVOKE ALL ON FUNCTION public.canonical_contract_paid_amount(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.canonical_contract_paid_amount(uuid)
  TO service_role;
CREATE OR REPLACE FUNCTION public.recalculate_contract_financial_state(p_contract_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract public.contracts%ROWTYPE;
  v_paid numeric := 0;
  v_previous_bypass text := COALESCE(current_setting('app.financial_controls_bypass', true), '');
BEGIN
  IF p_contract_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT *
  INTO v_contract
  FROM public.contracts contract
  WHERE contract.id = p_contract_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  v_paid := public.canonical_contract_paid_amount(p_contract_id);
  PERFORM set_config('app.financial_controls_bypass', 'on', true);

  UPDATE public.contracts contract
  SET
    total_paid = v_paid,
    balance_due = GREATEST(COALESCE(v_contract.contract_amount, 0) - v_paid, 0),
    payment_status = CASE
      WHEN v_paid <= 0.01 THEN 'unpaid'
      WHEN v_paid >= COALESCE(v_contract.contract_amount, 0) - 0.01 THEN 'paid'
      ELSE 'partial'
    END,
    updated_at = now()
  WHERE contract.id = p_contract_id;

  PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
  RETURN v_paid;
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
    RAISE;
END;
$$;
REVOKE ALL ON FUNCTION public.recalculate_contract_financial_state(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_contract_financial_state(uuid)
  TO service_role;
CREATE OR REPLACE FUNCTION public.after_payment_allocation_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract_id uuid;
BEGIN
  IF COALESCE(current_setting('app.payment_allocation_batch_mode', true), '') = 'on' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.allocation_type = 'invoice' THEN
    PERFORM public.recalculate_invoice_financial_state(OLD.target_id);
    PERFORM public.sync_payment_allocation_state(OLD.payment_id);
    SELECT invoice.contract_id INTO v_contract_id
    FROM public.invoices invoice WHERE invoice.id = OLD.target_id;
    PERFORM public.recalculate_contract_financial_state(v_contract_id);
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.allocation_type = 'invoice' THEN
    PERFORM public.sync_payment_allocation_state(NEW.payment_id);
    PERFORM public.recalculate_invoice_financial_state(NEW.target_id);
    SELECT invoice.contract_id INTO v_contract_id
    FROM public.invoices invoice WHERE invoice.id = NEW.target_id;
    PERFORM public.recalculate_contract_financial_state(v_contract_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE OR REPLACE FUNCTION public.recalculate_contracts_after_allocation_change_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract_id uuid;
BEGIN
  FOR v_contract_id IN
    SELECT DISTINCT invoice.contract_id
    FROM public.invoices invoice
    JOIN (
      SELECT (element ->> 'invoice_id')::uuid AS invoice_id
      FROM jsonb_array_elements(COALESCE(NEW.before_allocations, '[]'::jsonb)) element
      UNION
      SELECT (element ->> 'invoice_id')::uuid AS invoice_id
      FROM jsonb_array_elements(COALESCE(NEW.after_allocations, '[]'::jsonb)) element
    ) affected ON affected.invoice_id = invoice.id
    WHERE invoice.contract_id IS NOT NULL
  LOOP
    PERFORM public.recalculate_contract_financial_state(v_contract_id);
  END LOOP;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.recalculate_contracts_after_allocation_change_log()
  FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS recalculate_contracts_after_allocation_change_log_trigger
  ON public.payment_allocation_change_log;
CREATE TRIGGER recalculate_contracts_after_allocation_change_log_trigger
  AFTER INSERT ON public.payment_allocation_change_log
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_contracts_after_allocation_change_log();
CREATE OR REPLACE FUNCTION public.update_invoice_on_payment_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_id uuid;
  v_invoice_id uuid;
  v_contract_id uuid;
  v_invoice_ids uuid[] := ARRAY[]::uuid[];
  v_contract_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_payment_id := NEW.id;
    IF NEW.invoice_id IS NOT NULL THEN v_invoice_ids := array_append(v_invoice_ids, NEW.invoice_id); END IF;
    IF NEW.contract_id IS NOT NULL THEN v_contract_ids := array_append(v_contract_ids, NEW.contract_id); END IF;
  END IF;
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    v_payment_id := OLD.id;
    IF OLD.invoice_id IS NOT NULL THEN v_invoice_ids := array_append(v_invoice_ids, OLD.invoice_id); END IF;
    IF OLD.contract_id IS NOT NULL THEN v_contract_ids := array_append(v_contract_ids, OLD.contract_id); END IF;
  END IF;

  SELECT
    v_invoice_ids || COALESCE(array_agg(DISTINCT allocation.target_id), ARRAY[]::uuid[])
  INTO v_invoice_ids
  FROM public.payment_allocations allocation
  WHERE allocation.payment_id = v_payment_id
    AND allocation.allocation_type = 'invoice';

  FOR v_invoice_id IN
    SELECT DISTINCT candidate_id
    FROM unnest(v_invoice_ids) candidate(candidate_id)
    WHERE candidate_id IS NOT NULL
  LOOP
    PERFORM public.recalculate_invoice_financial_state(v_invoice_id);
    SELECT invoice.contract_id INTO v_contract_id
    FROM public.invoices invoice WHERE invoice.id = v_invoice_id;
    IF v_contract_id IS NOT NULL THEN
      v_contract_ids := array_append(v_contract_ids, v_contract_id);
    END IF;
  END LOOP;

  FOR v_contract_id IN
    SELECT DISTINCT candidate_id
    FROM unnest(v_contract_ids) candidate(candidate_id)
    WHERE candidate_id IS NOT NULL
  LOOP
    PERFORM public.recalculate_contract_financial_state(v_contract_id);
  END LOOP;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;
CREATE OR REPLACE FUNCTION public.enforce_payment_financial_controls()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_total numeric := 0;
  v_existing_paid numeric := 0;
  v_allocated numeric := 0;
  v_old_status text;
  v_new_status text;
BEGIN
  IF public.financial_controls_bypass_enabled() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.assert_financial_period_is_open(NEW.company_id, NEW.payment_date);

    SELECT COALESCE(SUM(allocation.amount), 0)
    INTO v_allocated
    FROM public.payment_allocations allocation
    WHERE allocation.payment_id = NEW.id
      AND allocation.is_active = true;

    IF v_allocated > COALESCE(NEW.amount, 0) + 0.01 THEN
      RAISE EXCEPTION 'Payment amount cannot be lower than active allocations'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_old_status := lower(COALESCE(OLD.payment_status, ''));
    v_new_status := lower(COALESCE(NEW.payment_status, ''));

    IF v_old_status IN ('completed', 'paid', 'success', 'succeeded')
       AND v_new_status IS DISTINCT FROM v_old_status
    THEN
      RAISE EXCEPTION 'Completed payments can only change status through cancel_payment_with_reversal()'
        USING ERRCODE = 'P0001';
    END IF;

    IF v_old_status IN ('cancelled', 'canceled', 'void', 'voided', 'reversed')
       AND v_new_status IS DISTINCT FROM v_old_status
    THEN
      RAISE EXCEPTION 'Cancelled payments cannot be reactivated or changed directly'
        USING ERRCODE = 'P0001';
    END IF;

    IF v_old_status IN ('completed', 'paid', 'success', 'succeeded')
       AND (
         NEW.amount IS DISTINCT FROM OLD.amount
         OR NEW.payment_date IS DISTINCT FROM OLD.payment_date
         OR NEW.company_id IS DISTINCT FROM OLD.company_id
         OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
         OR NEW.invoice_id IS DISTINCT FROM OLD.invoice_id
         OR NEW.contract_id IS DISTINCT FROM OLD.contract_id
         OR NEW.transaction_type IS DISTINCT FROM OLD.transaction_type
         OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
         OR NEW.payment_type IS DISTINCT FROM OLD.payment_type
         OR NEW.payment_number IS DISTINCT FROM OLD.payment_number
         OR NEW.reference_number IS DISTINCT FROM OLD.reference_number
         OR NEW.agreement_number IS DISTINCT FROM OLD.agreement_number
         OR NEW.check_number IS DISTINCT FROM OLD.check_number
         OR NEW.currency IS DISTINCT FROM OLD.currency
         OR NEW.account_id IS DISTINCT FROM OLD.account_id
         OR NEW.bank_id IS DISTINCT FROM OLD.bank_id
         OR NEW.bank_account IS DISTINCT FROM OLD.bank_account
         OR NEW.cost_center_id IS DISTINCT FROM OLD.cost_center_id
       )
    THEN
      RAISE EXCEPTION 'Completed payments are immutable. Use allocation commands or cancel and re-create.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE')
     AND lower(COALESCE(NEW.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded')
     AND NEW.invoice_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM public.payment_allocations allocation
       WHERE allocation.payment_id = NEW.id
         AND allocation.is_active = true
     )
  THEN
    SELECT invoice.total_amount
    INTO v_invoice_total
    FROM public.invoices invoice
    WHERE invoice.id = NEW.invoice_id
      AND invoice.company_id = NEW.company_id;

    v_existing_paid := public.canonical_invoice_paid_amount(NEW.invoice_id, NEW.id);
    IF COALESCE(v_invoice_total, 0) > 0
       AND v_existing_paid + COALESCE(NEW.amount, 0) > v_invoice_total + 0.01
    THEN
      RAISE EXCEPTION 'Payment would overpay invoice by QAR %',
        round((v_existing_paid + COALESCE(NEW.amount, 0) - v_invoice_total)::numeric, 2)
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE OR REPLACE FUNCTION public.recalculate_bank_balance(bank_id_param uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_opening_balance numeric := 0;
  v_balance numeric := 0;
BEGIN
  SELECT COALESCE(bank.opening_balance, 0)
  INTO v_opening_balance
  FROM public.banks bank
  WHERE bank.id = bank_id_param
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bank not found' USING ERRCODE = 'P0001';
  END IF;

  SELECT v_opening_balance + COALESCE(SUM(
    CASE
      WHEN transaction.transaction_type = 'deposit' THEN transaction.amount
      WHEN transaction.transaction_type = 'withdrawal' THEN -transaction.amount
      ELSE 0
    END
  ), 0)
  INTO v_balance
  FROM public.bank_transactions transaction
  WHERE transaction.bank_id = bank_id_param
    AND transaction.status = 'completed';

  UPDATE public.banks
  SET current_balance = v_balance, updated_at = now()
  WHERE id = bank_id_param;

  RETURN v_balance;
END;
$$;
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
REVOKE ALL ON FUNCTION public.recalculate_bank_balance(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_bank_balance(uuid)
  TO service_role;
REVOKE ALL ON FUNCTION public.reverse_payment_bank_transaction(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_payment_bank_transaction(uuid)
  TO service_role;
DO $$
BEGIN
  IF to_regprocedure('public.create_payment_bank_transaction(uuid)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.create_payment_bank_transaction(uuid)
      FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.create_payment_bank_transaction(uuid)
      TO service_role;
  END IF;
END;
$$;
CREATE OR REPLACE FUNCTION public.cancel_payment_with_reversal(
  p_payment_id uuid,
  p_company_id uuid,
  p_reason text DEFAULT NULL,
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
  v_already_cancelled boolean := false;
  v_original_journal_count integer := 0;
  v_journal_id uuid;
  v_reversal_id uuid;
  v_reversal_ids uuid[] := ARRAY[]::uuid[];
  v_bank_reversal_id uuid;
  v_invoice_id uuid;
  v_contract_id uuid;
  v_invoice_ids uuid[] := ARRAY[]::uuid[];
  v_contract_ids uuid[] := ARRAY[]::uuid[];
  v_previous_bypass text := COALESCE(current_setting('app.financial_controls_bypass', true), '');
  v_previous_batch text := COALESCE(current_setting('app.payment_allocation_batch_mode', true), '');
  v_note text;
BEGIN
  IF p_payment_id IS NULL OR p_company_id IS NULL
     OR NULLIF(BTRIM(COALESCE(p_reason, '')), '') IS NULL
  THEN
    RAISE EXCEPTION 'Payment, company, and cancellation reason are required'
      USING ERRCODE = 'P0001';
  END IF;

  v_actor := CASE WHEN v_actor_role = 'service_role' THEN p_actor_id ELSE auth.uid() END;
  IF v_actor_role <> 'service_role' THEN
    IF v_actor IS NULL OR (p_actor_id IS NOT NULL AND p_actor_id IS DISTINCT FROM v_actor) THEN
      RAISE EXCEPTION 'Actor identity mismatch' USING ERRCODE = 'P0001';
    END IF;

    v_allowed := public.is_finance_action_authorized(
      v_actor,
      p_company_id,
      ARRAY['finance.payment.cancel', 'payments.delete'],
      ARRAY['super_admin', 'admin', 'company_admin', 'accountant']
    );

    IF NOT v_allowed THEN
      RAISE EXCEPTION 'Not authorized to cancel payments for this company'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT * INTO v_payment
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
     AND NOT public.is_finance_action_authorized(
       v_actor,
       p_company_id,
       ARRAY['finance.payment.cancel_own'],
       ARRAY['super_admin', 'company_admin', 'accountant']
     )
  THEN
    RAISE EXCEPTION 'Payment creator cannot cancel the same payment without the controlled override permission'
      USING ERRCODE = '42501';
  END IF;

  v_already_cancelled := lower(COALESCE(v_payment.payment_status, '')) IN (
    'cancelled', 'canceled', 'void', 'voided', 'reversed'
  );

  IF v_payment.invoice_id IS NOT NULL THEN
    v_invoice_ids := array_append(v_invoice_ids, v_payment.invoice_id);
  END IF;
  IF v_payment.contract_id IS NOT NULL THEN
    v_contract_ids := array_append(v_contract_ids, v_payment.contract_id);
  END IF;

  SELECT v_invoice_ids || COALESCE(array_agg(DISTINCT allocation.target_id), ARRAY[]::uuid[])
  INTO v_invoice_ids
  FROM public.payment_allocations allocation
  WHERE allocation.payment_id = v_payment.id
    AND allocation.allocation_type = 'invoice';

  SELECT COUNT(DISTINCT entry.id)::integer
  INTO v_original_journal_count
  FROM public.journal_entries entry
  WHERE entry.company_id = p_company_id
    AND lower(COALESCE(entry.status::text, '')) IN ('posted', 'reversed')
    AND (
      entry.id = v_payment.journal_entry_id
      OR (entry.reference_type = 'payment' AND entry.reference_id = v_payment.id)
    );

  IF NOT v_already_cancelled
     AND lower(COALESCE(v_payment.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded')
     AND v_original_journal_count < 1
  THEN
    RAISE EXCEPTION 'Completed payment has no accounting journal to reverse'
      USING ERRCODE = 'P0001';
  END IF;

  PERFORM set_config('app.financial_controls_bypass', 'on', true);
  PERFORM set_config('app.payment_allocation_batch_mode', 'on', true);

  FOR v_journal_id IN
    SELECT DISTINCT entry.id
    FROM public.journal_entries entry
    WHERE entry.company_id = p_company_id
      AND lower(COALESCE(entry.status::text, '')) IN ('posted', 'reversed')
      AND (
        entry.id = v_payment.journal_entry_id
        OR (
          entry.reference_id = v_payment.id
          AND entry.reference_type IN ('payment', 'payment_reclassification')
        )
        OR (
          entry.reference_type = 'payment_allocation'
          AND EXISTS (
            SELECT 1
            FROM public.payment_allocation_change_log change_log
            WHERE change_log.id = entry.reference_id
              AND change_log.payment_id = v_payment.id
          )
        )
      )
    ORDER BY entry.id
  LOOP
    v_reversal_id := public.reverse_journal_entry(
      v_journal_id,
      'Payment cancellation ' || COALESCE(v_payment.payment_number, v_payment.id::text) || ': ' || BTRIM(p_reason),
      v_actor
    );
    IF v_reversal_id IS NOT NULL AND NOT (v_reversal_id = ANY(v_reversal_ids)) THEN
      v_reversal_ids := array_append(v_reversal_ids, v_reversal_id);
    END IF;
  END LOOP;

  UPDATE public.payment_allocations allocation
  SET
    is_active = false,
    voided_at = COALESCE(allocation.voided_at, now()),
    voided_by = COALESCE(allocation.voided_by, v_actor),
    void_reason = COALESCE(NULLIF(allocation.void_reason, ''), 'Payment cancelled: ' || BTRIM(p_reason)),
    updated_at = now()
  WHERE allocation.payment_id = v_payment.id
    AND allocation.is_active = true;

  v_note := 'Payment cancelled atomically on ' || now()::text || E'\nReason: ' || BTRIM(p_reason);
  UPDATE public.payments payment
  SET
    payment_status = 'cancelled',
    allocation_status = 'cancelled',
    processing_status = 'completed',
    processing_notes = CONCAT_WS(E'\n', NULLIF(payment.processing_notes, ''), v_note),
    updated_at = now()
  WHERE payment.id = v_payment.id
    AND payment.company_id = p_company_id;

  v_bank_reversal_id := public.reverse_payment_bank_transaction(v_payment.id);

  PERFORM set_config('app.payment_allocation_batch_mode', v_previous_batch, true);
  PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);

  FOR v_invoice_id IN
    SELECT DISTINCT candidate_id
    FROM unnest(v_invoice_ids) candidate(candidate_id)
    WHERE candidate_id IS NOT NULL
  LOOP
    PERFORM public.recalculate_invoice_financial_state(v_invoice_id);
    SELECT invoice.contract_id INTO v_contract_id
    FROM public.invoices invoice WHERE invoice.id = v_invoice_id;
    IF v_contract_id IS NOT NULL THEN
      v_contract_ids := array_append(v_contract_ids, v_contract_id);
    END IF;
  END LOOP;

  FOR v_contract_id IN
    SELECT DISTINCT candidate_id
    FROM unnest(v_contract_ids) candidate(candidate_id)
    WHERE candidate_id IS NOT NULL
  LOOP
    PERFORM public.recalculate_contract_financial_state(v_contract_id);
  END LOOP;

  INSERT INTO public.payment_cancellation_audit (
    company_id,
    payment_id,
    status_before,
    reason,
    actor_id,
    already_cancelled,
    reversal_entry_ids,
    bank_reversal_transaction_id,
    affected_invoice_ids,
    affected_contract_ids
  ) VALUES (
    p_company_id,
    v_payment.id,
    COALESCE(v_payment.payment_status, ''),
    BTRIM(p_reason),
    v_actor,
    v_already_cancelled,
    v_reversal_ids,
    v_bank_reversal_id,
    v_invoice_ids,
    v_contract_ids
  );

  RETURN jsonb_build_object(
    'payment_id', v_payment.id,
    'status', 'cancelled',
    'already_cancelled', v_already_cancelled,
    'reversal_entry_ids', to_jsonb(v_reversal_ids),
    'bank_reversal_transaction_id', v_bank_reversal_id,
    'affected_invoice_ids', to_jsonb(v_invoice_ids),
    'affected_contract_ids', to_jsonb(v_contract_ids)
  );
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('app.payment_allocation_batch_mode', v_previous_batch, true);
    PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
    RAISE;
END;
$$;
REVOKE ALL ON FUNCTION public.cancel_payment_with_reversal(uuid, uuid, text, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_payment_with_reversal(uuid, uuid, text, uuid)
  TO authenticated, service_role;
COMMENT ON FUNCTION public.cancel_payment_with_reversal(uuid, uuid, text, uuid) IS
'Atomically reverses all payment and allocation journals, reverses the bank movement once, voids allocations, cancels the payment, and recalculates affected invoices and contracts.';
CREATE OR REPLACE FUNCTION public.cancel_payments_batch_with_reversal(
  p_payment_ids uuid[],
  p_company_id uuid,
  p_reason text,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_id uuid;
  v_result jsonb;
  v_results jsonb := '[]'::jsonb;
  v_requested_count integer := 0;
  v_existing_count integer := 0;
  v_cancelled_count integer := 0;
  v_already_cancelled_count integer := 0;
BEGIN
  IF p_company_id IS NULL
     OR NULLIF(BTRIM(COALESCE(p_reason, '')), '') IS NULL
     OR COALESCE(array_length(p_payment_ids, 1), 0) = 0
  THEN
    RAISE EXCEPTION 'Company, payment ids, and batch cancellation reason are required'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT COUNT(DISTINCT requested_id)::integer
  INTO v_requested_count
  FROM unnest(p_payment_ids) requested(requested_id)
  WHERE requested_id IS NOT NULL;

  IF v_requested_count < 1 OR v_requested_count > 100 THEN
    RAISE EXCEPTION 'A cancellation batch must contain between 1 and 100 unique payment ids'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT COUNT(*)::integer
  INTO v_existing_count
  FROM public.payments payment
  WHERE payment.company_id = p_company_id
    AND payment.id IN (
      SELECT DISTINCT requested_id
      FROM unnest(p_payment_ids) requested(requested_id)
      WHERE requested_id IS NOT NULL
    );

  IF v_existing_count <> v_requested_count THEN
    RAISE EXCEPTION 'One or more payments do not exist in the requested company'
      USING ERRCODE = 'P0001';
  END IF;

  FOR v_payment_id IN
    SELECT DISTINCT requested_id
    FROM unnest(p_payment_ids) requested(requested_id)
    WHERE requested_id IS NOT NULL
    ORDER BY requested_id
  LOOP
    v_result := public.cancel_payment_with_reversal(
      v_payment_id,
      p_company_id,
      BTRIM(p_reason),
      p_actor_id
    );
    v_results := v_results || jsonb_build_array(v_result);
    v_cancelled_count := v_cancelled_count + 1;
    IF COALESCE((v_result ->> 'already_cancelled')::boolean, false) THEN
      v_already_cancelled_count := v_already_cancelled_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'requested_count', v_requested_count,
    'cancelled_count', v_cancelled_count,
    'already_cancelled_count', v_already_cancelled_count,
    'results', v_results
  );
END;
$$;
REVOKE ALL ON FUNCTION public.cancel_payments_batch_with_reversal(uuid[], uuid, text, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_payments_batch_with_reversal(uuid[], uuid, text, uuid)
  TO authenticated, service_role;
COMMENT ON FUNCTION public.cancel_payments_batch_with_reversal(uuid[], uuid, text, uuid) IS
'Cancels at most 100 payments per all-or-nothing batch through the canonical atomic cancellation command.';
