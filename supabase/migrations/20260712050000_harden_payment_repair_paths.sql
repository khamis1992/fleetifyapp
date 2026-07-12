-- Harden payment mutation paths before repairing historical allocations.

DROP FUNCTION IF EXISTS public.link_payment_journal_entry_bypass(uuid, uuid);
DROP FUNCTION IF EXISTS public.batch_link_payment_journal_entries(jsonb);
DROP FUNCTION IF EXISTS public.link_payments_bypass_triggers();

REVOKE ALL ON FUNCTION public.repair_overpaid_invoice_allocations(jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.repair_overpaid_invoice_allocations(jsonb)
  TO service_role;

REVOKE ALL ON FUNCTION public.restore_erroneously_cancelled_import_payments(uuid, boolean, date)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restore_erroneously_cancelled_import_payments(uuid, boolean, date)
  TO service_role;

CREATE OR REPLACE FUNCTION public.update_invoice_on_payment_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_id uuid;
  v_contract_id uuid;
  v_invoice_ids uuid[] := ARRAY[]::uuid[];
  v_contract_ids uuid[] := ARRAY[]::uuid[];
  v_invoice_total numeric := 0;
  v_invoice_paid numeric := 0;
  v_contract_paid numeric := 0;
  v_previous_bypass text := COALESCE(current_setting('app.financial_controls_bypass', true), '');
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NEW.invoice_id IS NOT NULL THEN
      v_invoice_ids := array_append(v_invoice_ids, NEW.invoice_id);
    END IF;
    IF NEW.contract_id IS NOT NULL THEN
      v_contract_ids := array_append(v_contract_ids, NEW.contract_id);
    END IF;
  END IF;

  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    IF OLD.invoice_id IS NOT NULL THEN
      v_invoice_ids := array_append(v_invoice_ids, OLD.invoice_id);
    END IF;
    IF OLD.contract_id IS NOT NULL THEN
      v_contract_ids := array_append(v_contract_ids, OLD.contract_id);
    END IF;
  END IF;

  PERFORM set_config('app.financial_controls_bypass', 'on', true);

  FOR v_invoice_id IN
    SELECT DISTINCT candidate_id
    FROM unnest(v_invoice_ids) AS candidate(candidate_id)
    WHERE candidate_id IS NOT NULL
  LOOP
    SELECT COALESCE(i.total_amount, 0)
    INTO v_invoice_total
    FROM public.invoices i
    WHERE i.id = v_invoice_id;

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    SELECT COALESCE(SUM(p.amount), 0)
    INTO v_invoice_paid
    FROM public.payments p
    WHERE p.invoice_id = v_invoice_id
      AND lower(COALESCE(p.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded')
      AND lower(COALESCE(p.transaction_type::text, 'receipt')) = 'receipt';

    UPDATE public.invoices i
    SET
      paid_amount = v_invoice_paid,
      balance_due = GREATEST(v_invoice_total - v_invoice_paid, 0),
      payment_status = CASE
        WHEN v_invoice_paid <= 0.01 THEN 'unpaid'
        WHEN v_invoice_paid >= v_invoice_total - 0.01 THEN 'paid'
        ELSE 'partial'
      END,
      status = CASE
        WHEN lower(COALESCE(i.status, '')) IN ('cancelled', 'canceled', 'void', 'voided', 'deleted') THEN i.status
        WHEN v_invoice_paid >= v_invoice_total - 0.01 THEN 'paid'
        WHEN i.due_date IS NOT NULL AND i.due_date < CURRENT_DATE THEN 'overdue'
        WHEN lower(COALESCE(i.status, '')) = 'draft' THEN 'draft'
        ELSE 'pending'
      END,
      updated_at = now()
    WHERE i.id = v_invoice_id;
  END LOOP;

  FOR v_contract_id IN
    SELECT DISTINCT candidate_id
    FROM unnest(v_contract_ids) AS candidate(candidate_id)
    WHERE candidate_id IS NOT NULL
  LOOP
    SELECT COALESCE(SUM(p.amount), 0)
    INTO v_contract_paid
    FROM public.payments p
    WHERE p.contract_id = v_contract_id
      AND lower(COALESCE(p.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded')
      AND lower(COALESCE(p.transaction_type::text, 'receipt')) = 'receipt';

    UPDATE public.contracts c
    SET
      total_paid = v_contract_paid,
      balance_due = GREATEST(COALESCE(c.contract_amount, 0) - v_contract_paid, 0),
      payment_status = CASE
        WHEN v_contract_paid <= 0.01 THEN 'unpaid'
        WHEN v_contract_paid >= COALESCE(c.contract_amount, 0) - 0.01 THEN 'paid'
        ELSE 'partial'
      END,
      updated_at = now()
    WHERE c.id = v_contract_id;
  END LOOP;

  PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
    RAISE;
END;
$$;

DROP TRIGGER IF EXISTS payment_status_update_trigger ON public.payments;
DROP TRIGGER IF EXISTS payment_totals_after_insert ON public.payments;
DROP TRIGGER IF EXISTS payment_totals_after_update ON public.payments;
DROP TRIGGER IF EXISTS payment_totals_after_delete ON public.payments;

CREATE TRIGGER payment_totals_after_insert
AFTER INSERT ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_invoice_on_payment_completion();

CREATE TRIGGER payment_totals_after_update
AFTER UPDATE OF amount, payment_status, invoice_id, contract_id, transaction_type ON public.payments
FOR EACH ROW
WHEN (
  OLD.amount IS DISTINCT FROM NEW.amount
  OR OLD.payment_status IS DISTINCT FROM NEW.payment_status
  OR OLD.invoice_id IS DISTINCT FROM NEW.invoice_id
  OR OLD.contract_id IS DISTINCT FROM NEW.contract_id
  OR OLD.transaction_type IS DISTINCT FROM NEW.transaction_type
)
EXECUTE FUNCTION public.update_invoice_on_payment_completion();

CREATE TRIGGER payment_totals_after_delete
AFTER DELETE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_invoice_on_payment_completion();

COMMENT ON FUNCTION public.update_invoice_on_payment_completion() IS
'Recalculates only affected invoice and contract totals without disabling table triggers.';

INSERT INTO public.default_account_types (
  type_code, type_name, type_name_ar, account_category, description, is_system
)
SELECT
  'CUSTOMER_ADVANCES', 'Customer Advance Payments', NULL, 'liabilities',
  'Unallocated customer receipts held as a liability until applied to invoices.', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.default_account_types dat
  WHERE dat.type_code = 'CUSTOMER_ADVANCES'
);

INSERT INTO public.chart_of_accounts (
  company_id, account_code, account_name, account_type, is_active, is_system,
  balance_type, current_balance, description, account_level, sort_order,
  is_header, is_default, can_link_customers, can_link_vendors, can_link_employees
)
SELECT
  c.id, '20201', 'Customer Advance Payments', 'liabilities', true, true,
  'credit', 0, 'Unallocated customer receipts pending invoice allocation.', 3, 0,
  false, false, true, false, false
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.chart_of_accounts coa
  WHERE coa.company_id = c.id AND coa.account_code = '20201'
);

INSERT INTO public.account_mappings (
  company_id, default_account_type_id, chart_of_accounts_id, is_active
)
SELECT c.id, dat.id, coa.id, true
FROM public.companies c
JOIN public.default_account_types dat ON dat.type_code = 'CUSTOMER_ADVANCES'
JOIN public.chart_of_accounts coa
  ON coa.company_id = c.id AND coa.account_code = '20201'
WHERE NOT EXISTS (
  SELECT 1 FROM public.account_mappings am
  WHERE am.company_id = c.id AND am.default_account_type_id = dat.id
);

INSERT INTO public.account_mappings (
  company_id, default_account_type_id, chart_of_accounts_id, is_active
)
SELECT c.id, dat.id, candidate.id, true
FROM public.companies c
JOIN public.default_account_types dat ON dat.type_code = 'BANK'
JOIN LATERAL (
  SELECT coa.id
  FROM public.chart_of_accounts coa
  WHERE coa.company_id = c.id
    AND coa.is_active = true
    AND COALESCE(coa.is_header, false) = false
    AND coa.account_code IN ('11151', '11111', '11101', '11201', '1120101')
  ORDER BY array_position(
    ARRAY['11151', '11111', '11101', '11201', '1120101']::text[],
    coa.account_code::text
  )
  LIMIT 1
) candidate ON true
WHERE NOT EXISTS (
  SELECT 1 FROM public.account_mappings am
  WHERE am.company_id = c.id AND am.default_account_type_id = dat.id AND am.is_active = true
);

INSERT INTO public.account_mappings (
  company_id, default_account_type_id, chart_of_accounts_id, is_active
)
SELECT c.id, dat.id, candidate.id, true
FROM public.companies c
JOIN public.default_account_types dat ON dat.type_code = 'CASH'
JOIN LATERAL (
  SELECT coa.id
  FROM public.chart_of_accounts coa
  WHERE coa.company_id = c.id
    AND coa.is_active = true
    AND COALESCE(coa.is_header, false) = false
    AND coa.account_code IN ('1010', '11101', '11111')
  ORDER BY array_position(
    ARRAY['1010', '11101', '11111']::text[],
    coa.account_code::text
  )
  LIMIT 1
) candidate ON true
WHERE NOT EXISTS (
  SELECT 1 FROM public.account_mappings am
  WHERE am.company_id = c.id AND am.default_account_type_id = dat.id AND am.is_active = true
);

CREATE OR REPLACE FUNCTION public.create_payment_receipt_journal(
  p_payment_id uuid,
  p_company_id uuid,
  p_payment_number text,
  p_payment_date date,
  p_amount numeric,
  p_payment_method text,
  p_invoice_id uuid,
  p_account_id uuid,
  p_actor_id uuid
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
  v_preferred_cash_type text;
  v_offset_type text;
BEGIN
  IF p_payment_id IS NULL OR p_company_id IS NULL OR p_payment_date IS NULL OR COALESCE(p_amount, 0) <= 0 THEN
    RAISE EXCEPTION 'Valid payment id, company, date, and amount are required for journal creation'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT je.id INTO v_journal_id
  FROM public.journal_entries je
  WHERE je.company_id = p_company_id
    AND je.reference_type = 'payment'
    AND je.reference_id = p_payment_id
  ORDER BY je.created_at
  LIMIT 1;
  IF v_journal_id IS NOT NULL THEN
    RETURN v_journal_id;
  END IF;

  PERFORM public.assert_financial_period_is_open(p_company_id, p_payment_date);

  IF p_account_id IS NOT NULL THEN
    SELECT coa.id INTO v_cash_account_id
    FROM public.chart_of_accounts coa
    WHERE coa.id = p_account_id
      AND coa.company_id = p_company_id
      AND coa.is_active = true
      AND COALESCE(coa.is_header, false) = false
    LIMIT 1;
  END IF;

  v_preferred_cash_type := CASE
    WHEN lower(COALESCE(p_payment_method, '')) IN (
      'bank_transfer', 'wiretransfer', 'check', 'cheque',
      'credit_card', 'debit_card', 'card'
    ) THEN 'BANK'
    ELSE 'CASH'
  END;

  IF v_cash_account_id IS NULL THEN
    SELECT am.chart_of_accounts_id INTO v_cash_account_id
    FROM public.account_mappings am
    JOIN public.default_account_types dat ON dat.id = am.default_account_type_id
    JOIN public.chart_of_accounts coa ON coa.id = am.chart_of_accounts_id
    WHERE am.company_id = p_company_id
      AND dat.type_code IN ('BANK', 'CASH')
      AND am.is_active = true
      AND coa.is_active = true
      AND COALESCE(coa.is_header, false) = false
    ORDER BY CASE
      WHEN dat.type_code = v_preferred_cash_type THEN 1
      WHEN dat.type_code = 'BANK' THEN 2
      ELSE 3
    END
    LIMIT 1;
  END IF;

  v_offset_type := CASE WHEN p_invoice_id IS NULL THEN 'CUSTOMER_ADVANCES' ELSE 'RECEIVABLES' END;
  SELECT am.chart_of_accounts_id INTO v_offset_account_id
  FROM public.account_mappings am
  JOIN public.default_account_types dat ON dat.id = am.default_account_type_id
  JOIN public.chart_of_accounts coa ON coa.id = am.chart_of_accounts_id
  WHERE am.company_id = p_company_id
    AND dat.type_code = v_offset_type
    AND am.is_active = true
    AND coa.is_active = true
    AND COALESCE(coa.is_header, false) = false
  LIMIT 1;

  IF v_cash_account_id IS NULL OR v_offset_account_id IS NULL THEN
    RAISE EXCEPTION 'Required cash/bank or % account mapping is missing', v_offset_type
      USING ERRCODE = 'P0001';
  END IF;

  v_entry_number := 'JE-PAY-' || to_char(p_payment_date, 'YYYYMMDD') || '-' || substring(p_payment_id::text, 1, 8);
  INSERT INTO public.journal_entries (
    company_id, entry_number, entry_date, description,
    total_debit, total_credit, status, reference_type, reference_id,
    created_by, created_at, updated_at
  ) VALUES (
    p_company_id, v_entry_number, p_payment_date,
    'Payment receipt: ' || COALESCE(p_payment_number, p_payment_id::text),
    p_amount, p_amount, 'draft', 'payment', p_payment_id,
    p_actor_id, now(), now()
  ) RETURNING id INTO v_journal_id;

  INSERT INTO public.journal_entry_lines (
    journal_entry_id, account_id, line_number, line_description, debit_amount, credit_amount
  ) VALUES
    (v_journal_id, v_cash_account_id, 1, 'Payment received', p_amount, 0),
    (
      v_journal_id, v_offset_account_id, 2,
      CASE WHEN p_invoice_id IS NULL THEN 'Customer advance' ELSE 'Receivables settlement' END,
      0, p_amount
    );

  UPDATE public.journal_entries
  SET status = 'posted', posted_by = p_actor_id, posted_at = now(), updated_at = now()
  WHERE id = v_journal_id;

  RETURN v_journal_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_payment_receipt_journal(
  uuid, uuid, text, date, numeric, text, uuid, uuid, uuid
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_payment_receipt_journal(
  uuid, uuid, text, date, numeric, text, uuid, uuid, uuid
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
    NEW.id, NEW.company_id, NEW.payment_number, NEW.payment_date, NEW.amount,
    NEW.payment_method, NEW.invoice_id, NEW.account_id, NEW.created_by
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_journal_entry ON public.payments;
DROP TRIGGER IF EXISTS payment_journal_before_insert ON public.payments;
DROP TRIGGER IF EXISTS payment_journal_before_completion ON public.payments;

CREATE TRIGGER payment_journal_before_insert
BEFORE INSERT ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.trg_payment_journal_entry_fn();

CREATE TRIGGER payment_journal_before_completion
BEFORE UPDATE OF payment_status ON public.payments
FOR EACH ROW
WHEN (
  NEW.payment_status = 'completed'
  AND OLD.payment_status IS DISTINCT FROM NEW.payment_status
)
EXECUTE FUNCTION public.trg_payment_journal_entry_fn();

COMMENT ON FUNCTION public.trg_payment_journal_entry_fn() IS
'Creates and persists the journal link before a completed receipt payment is saved.';

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
BEGIN
  v_actor := CASE WHEN v_actor_role = 'service_role' THEN p_actor_id ELSE auth.uid() END;
  IF v_actor IS NULL AND v_actor_role <> 'service_role' THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = 'P0001';
  END IF;
  IF v_actor_role <> 'service_role' AND public.get_user_company_id() IS DISTINCT FROM p_company_id THEN
    RAISE EXCEPTION 'You cannot repair payment journals for another company' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_payment
  FROM public.payments p
  WHERE p.id = p_payment_id AND p.company_id = p_company_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found' USING ERRCODE = 'P0001';
  END IF;

  IF lower(COALESCE(v_payment.payment_status, '')) NOT IN ('completed', 'paid', 'success', 'succeeded')
     OR lower(COALESCE(v_payment.transaction_type::text, 'receipt')) <> 'receipt'
  THEN
    RETURN jsonb_build_object(
      'ok', true, 'status', 'skipped_not_completed_receipt',
      'payment_id', v_payment.id, 'journal_entry_id', v_payment.journal_entry_id
    );
  END IF;

  IF v_payment.journal_entry_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.id = v_payment.journal_entry_id AND je.company_id = p_company_id
  ) THEN
    RETURN jsonb_build_object(
      'ok', true, 'status', 'already_linked',
      'payment_id', v_payment.id, 'journal_entry_id', v_payment.journal_entry_id
    );
  END IF;

  v_journal_id := public.create_payment_receipt_journal(
    v_payment.id, v_payment.company_id, v_payment.payment_number,
    v_payment.payment_date, v_payment.amount, v_payment.payment_method,
    v_payment.invoice_id, v_payment.account_id, v_actor
  );

  UPDATE public.payments
  SET journal_entry_id = v_journal_id, updated_at = now()
  WHERE id = v_payment.id AND company_id = p_company_id;

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
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = v_actor AND ur.role::text = 'super_admin'
    ) INTO v_is_super_admin;

    IF NOT v_is_super_admin AND public.get_user_company_id() IS DISTINCT FROM p_company_id THEN
      RAISE EXCEPTION 'You cannot create payments for another company' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  PERFORM public.assert_financial_period_is_open(p_company_id, p_payment_date);

  IF p_contract_id IS NOT NULL THEN
    SELECT * INTO v_contract
    FROM public.contracts c
    WHERE c.id = p_contract_id AND c.company_id = p_company_id
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
    FROM public.invoices i
    WHERE i.id = p_invoice_id AND i.company_id = p_company_id
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

    SELECT COALESCE(SUM(p.amount), 0)
    INTO v_existing_paid
    FROM public.payments p
    WHERE p.company_id = p_company_id
      AND p.invoice_id = p_invoice_id
      AND lower(COALESCE(p.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded')
      AND lower(COALESCE(p.transaction_type::text, 'receipt')) = 'receipt';

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
  v_original public.journal_entries%ROWTYPE;
  v_actor uuid;
  v_actor_role text := COALESCE(NULLIF(auth.role()::text, ''), current_setting('request.jwt.claim.role', true), '');
  v_is_super_admin boolean := false;
  v_reversal_id uuid;
  v_reversal_number text;
  v_line_count integer := 0;
  v_already_cancelled boolean := false;
  v_previous_bypass text := COALESCE(current_setting('app.financial_controls_bypass', true), '');
  v_note text;
BEGIN
  IF p_payment_id IS NULL OR p_company_id IS NULL THEN
    RAISE EXCEPTION 'Payment id and company id are required' USING ERRCODE = 'P0001';
  END IF;

  v_actor := CASE WHEN v_actor_role = 'service_role' THEN p_actor_id ELSE auth.uid() END;
  IF v_actor IS NULL AND v_actor_role <> 'service_role' THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = 'P0001';
  END IF;

  IF v_actor_role <> 'service_role' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = v_actor AND ur.role::text = 'super_admin'
    ) INTO v_is_super_admin;
    IF NOT v_is_super_admin AND public.get_user_company_id() IS DISTINCT FROM p_company_id THEN
      RAISE EXCEPTION 'You cannot cancel payments for another company' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  SELECT * INTO v_payment
  FROM public.payments p
  WHERE p.id = p_payment_id AND p.company_id = p_company_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found' USING ERRCODE = 'P0001';
  END IF;

  v_already_cancelled := lower(COALESCE(v_payment.payment_status, '')) IN ('cancelled', 'canceled', 'void', 'voided', 'reversed');

  SELECT * INTO v_original
  FROM public.journal_entries je
  WHERE je.company_id = p_company_id
    AND (
      je.id = v_payment.journal_entry_id
      OR (je.reference_type = 'payment' AND je.reference_id = v_payment.id)
    )
  ORDER BY CASE WHEN je.id = v_payment.journal_entry_id THEN 0 ELSE 1 END, je.created_at
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND AND lower(COALESCE(v_payment.payment_status, '')) IN ('completed', 'paid', 'success', 'succeeded') THEN
    RAISE EXCEPTION 'Completed payment has no accounting journal to reverse' USING ERRCODE = 'P0001';
  END IF;

  PERFORM public.assert_financial_period_is_open(p_company_id, CURRENT_DATE);
  PERFORM set_config('app.financial_controls_bypass', 'on', true);

  IF v_original.id IS NOT NULL THEN
    v_reversal_id := v_original.reversal_entry_id;

    IF v_reversal_id IS NULL THEN
      SELECT je.id INTO v_reversal_id
      FROM public.journal_entries je
      WHERE je.company_id = p_company_id
        AND je.reference_type = 'payment_reversal'
        AND je.reference_id = v_payment.id
      ORDER BY je.created_at
      LIMIT 1;
    END IF;

    IF v_reversal_id IS NULL THEN
      SELECT COUNT(*) INTO v_line_count
      FROM public.journal_entry_lines line
      WHERE line.journal_entry_id = v_original.id;
      IF v_line_count < 2 THEN
        RAISE EXCEPTION 'Original payment journal has fewer than two lines and cannot be reversed automatically'
          USING ERRCODE = 'P0001';
      END IF;

      v_reversal_number := 'REV-PAY-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || substring(v_payment.id::text, 1, 8);
      INSERT INTO public.journal_entries (
        company_id, entry_number, entry_date, reference_type, reference_id,
        description, total_debit, total_credit, status, created_by,
        created_at, updated_at
      ) VALUES (
        p_company_id, v_reversal_number, CURRENT_DATE, 'payment_reversal', v_payment.id,
        'Reversal of payment journal ' || COALESCE(v_original.entry_number, v_original.id::text),
        COALESCE(v_original.total_credit, 0), COALESCE(v_original.total_debit, 0),
        'draft', v_actor, now(), now()
      ) RETURNING id INTO v_reversal_id;

      INSERT INTO public.journal_entry_lines (
        journal_entry_id, account_id, debit_amount, credit_amount,
        line_description, line_number, cost_center_id, asset_id, employee_id
      )
      SELECT
        v_reversal_id, line.account_id,
        COALESCE(line.credit_amount, 0), COALESCE(line.debit_amount, 0),
        'Reversal - ' || COALESCE(line.line_description, v_original.entry_number, 'payment'),
        ROW_NUMBER() OVER (ORDER BY line.line_number, line.id),
        line.cost_center_id, line.asset_id, line.employee_id
      FROM public.journal_entry_lines line
      WHERE line.journal_entry_id = v_original.id;

      UPDATE public.journal_entries
      SET status = 'posted', posted_by = v_actor, posted_at = now(), updated_at = now()
      WHERE id = v_reversal_id AND company_id = p_company_id;
    END IF;

    UPDATE public.journal_entries
    SET
      status = 'reversed', reversal_entry_id = v_reversal_id,
      reversed_by = v_actor, reversed_at = now(), updated_at = now()
    WHERE id = v_original.id AND company_id = p_company_id;
  END IF;

  v_note := CONCAT(
    'Payment cancelled through atomic accounting reversal on ', now()::text,
    CASE WHEN NULLIF(BTRIM(COALESCE(p_reason, '')), '') IS NULL THEN '' ELSE E'\nReason: ' || BTRIM(p_reason) END,
    CASE WHEN v_reversal_id IS NULL THEN '' ELSE E'\nReversal entry: ' || v_reversal_id::text END
  );

  UPDATE public.payments
  SET
    payment_status = 'cancelled',
    allocation_status = NULL,
    processing_status = 'completed',
    processing_notes = CONCAT_WS(E'\n', NULLIF(processing_notes, ''), v_note),
    updated_at = now()
  WHERE id = v_payment.id AND company_id = p_company_id;

  PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
  RETURN jsonb_build_object(
    'payment_id', v_payment.id,
    'status', 'cancelled',
    'already_cancelled', v_already_cancelled,
    'original_journal_entry_id', v_original.id,
    'reversal_entry_id', v_reversal_id
  );
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('app.financial_controls_bypass', v_previous_bypass, true);
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_payment_with_reversal(uuid, uuid, text, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_payment_with_reversal(uuid, uuid, text, uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.cancel_payment_with_reversal(uuid, uuid, text, uuid) IS
'Atomically creates an idempotent reversal journal before cancelling a payment; company scoped and safe for already-cancelled records.';

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
  v_is_super_admin boolean := false;
  v_line_count integer := 0;
  v_previous_bypass text := COALESCE(current_setting('app.financial_controls_bypass', true), '');
BEGIN
  v_actor := CASE WHEN v_actor_role = 'service_role' THEN reversed_by_user ELSE auth.uid() END;
  IF v_actor IS NULL AND v_actor_role <> 'service_role' THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = 'P0001';
  END IF;
  IF v_actor_role <> 'service_role' AND reversed_by_user IS DISTINCT FROM v_actor THEN
    RAISE EXCEPTION 'Actor identity mismatch' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_original
  FROM public.journal_entries je
  WHERE je.id = entry_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Journal entry not found' USING ERRCODE = 'P0001';
  END IF;

  IF v_actor_role <> 'service_role' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = v_actor AND ur.role::text = 'super_admin'
    ) INTO v_is_super_admin;
    IF NOT v_is_super_admin AND public.get_user_company_id() IS DISTINCT FROM v_original.company_id THEN
      RAISE EXCEPTION 'You cannot reverse journals for another company' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF v_original.reversal_entry_id IS NOT NULL THEN
    RETURN v_original.reversal_entry_id;
  END IF;

  SELECT je.id INTO v_reversal_id
  FROM public.journal_entries je
  WHERE je.company_id = v_original.company_id
    AND je.reference_type = 'journal_reversal'
    AND je.reference_id = v_original.id
  ORDER BY je.created_at
  LIMIT 1;
  IF v_reversal_id IS NOT NULL THEN
    RETURN v_reversal_id;
  END IF;

  SELECT COUNT(*) INTO v_line_count
  FROM public.journal_entry_lines line
  WHERE line.journal_entry_id = v_original.id;
  IF v_line_count < 2 THEN
    RAISE EXCEPTION 'Journal entry has fewer than two lines and cannot be reversed automatically'
      USING ERRCODE = 'P0001';
  END IF;

  PERFORM public.assert_financial_period_is_open(v_original.company_id, CURRENT_DATE);
  PERFORM set_config('app.financial_controls_bypass', 'on', true);

  INSERT INTO public.journal_entries (
    company_id, entry_number, entry_date, reference_type, reference_id,
    description, total_debit, total_credit, status, created_by,
    created_at, updated_at
  ) VALUES (
    v_original.company_id,
    'REV-JE-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || substring(v_original.id::text, 1, 8),
    CURRENT_DATE, 'journal_reversal', v_original.id,
    'Reversal of ' || COALESCE(v_original.entry_number, v_original.id::text) ||
      CASE WHEN NULLIF(BTRIM(COALESCE(reversal_reason, '')), '') IS NULL THEN '' ELSE ' - ' || BTRIM(reversal_reason) END,
    COALESCE(v_original.total_credit, 0), COALESCE(v_original.total_debit, 0),
    'draft', v_actor, now(), now()
  ) RETURNING id INTO v_reversal_id;

  INSERT INTO public.journal_entry_lines (
    journal_entry_id, account_id, debit_amount, credit_amount,
    line_description, line_number, cost_center_id, asset_id, employee_id
  )
  SELECT
    v_reversal_id, line.account_id,
    COALESCE(line.credit_amount, 0), COALESCE(line.debit_amount, 0),
    'Reversal - ' || COALESCE(line.line_description, v_original.entry_number, 'journal'),
    ROW_NUMBER() OVER (ORDER BY line.line_number, line.id),
    line.cost_center_id, line.asset_id, line.employee_id
  FROM public.journal_entry_lines line
  WHERE line.journal_entry_id = v_original.id;

  UPDATE public.journal_entries
  SET status = 'posted', posted_by = v_actor, posted_at = now(), updated_at = now()
  WHERE id = v_reversal_id;

  UPDATE public.journal_entries
  SET
    status = 'reversed', reversal_entry_id = v_reversal_id,
    reversed_by = v_actor, reversed_at = now(), updated_at = now()
  WHERE id = v_original.id;

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

DROP FUNCTION IF EXISTS public.reverse_journal_entry(uuid, text);

COMMENT ON FUNCTION public.reverse_journal_entry(uuid, text, uuid) IS
'Creates one company-scoped current-period reversal and links it from the original journal entry.';
