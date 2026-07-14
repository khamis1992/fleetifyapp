-- Atomic, idempotent payments for monthly-obligation installments.

ALTER TABLE public.monthly_obligation_installments
  ADD COLUMN IF NOT EXISTS payment_ledger_baseline numeric(15,2) NOT NULL DEFAULT 0;

UPDATE public.monthly_obligation_installments
SET payment_ledger_baseline = round(COALESCE(paid_amount, 0)::numeric, 2)
WHERE payment_ledger_baseline = 0
  AND COALESCE(paid_amount, 0) > 0;

ALTER TABLE public.monthly_obligation_installments
  DROP CONSTRAINT IF EXISTS monthly_obligation_installments_ledger_baseline_v1;
ALTER TABLE public.monthly_obligation_installments
  ADD CONSTRAINT monthly_obligation_installments_ledger_baseline_v1 CHECK (
    payment_ledger_baseline >= 0 AND payment_ledger_baseline <= amount
  ) NOT VALID;

CREATE TABLE public.monthly_obligation_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  installment_id uuid NOT NULL REFERENCES public.monthly_obligation_installments(id) ON DELETE RESTRICT,
  amount numeric(15,2) NOT NULL CHECK (amount > 0),
  principal_amount numeric(15,2) NOT NULL CHECK (principal_amount >= 0),
  interest_amount numeric(15,2) NOT NULL CHECK (interest_amount >= 0),
  payment_date date NOT NULL,
  bank_id uuid REFERENCES public.banks(id) ON DELETE RESTRICT,
  cash_account_id uuid NOT NULL REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT,
  vendor_payment_id uuid UNIQUE REFERENCES public.vendor_payments(id) ON DELETE RESTRICT,
  bank_transaction_id uuid UNIQUE REFERENCES public.bank_transactions(id) ON DELETE RESTRICT,
  journal_entry_id uuid NOT NULL UNIQUE REFERENCES public.journal_entries(id) ON DELETE RESTRICT,
  reference_number text,
  notes text,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'reversed')),
  idempotency_key uuid NOT NULL,
  reversal_of_payment_id uuid UNIQUE REFERENCES public.monthly_obligation_payments(id) ON DELETE RESTRICT,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT monthly_obligation_payment_components_match
    CHECK (abs((principal_amount + interest_amount) - amount) <= 0.01),
  CONSTRAINT monthly_obligation_payment_not_self_reversal
    CHECK (reversal_of_payment_id IS NULL OR reversal_of_payment_id <> id),
  CONSTRAINT monthly_obligation_payment_idempotency
    UNIQUE (company_id, idempotency_key)
);

CREATE INDEX idx_monthly_obligation_payments_company_date
  ON public.monthly_obligation_payments(company_id, payment_date DESC);
CREATE INDEX idx_monthly_obligation_payments_installment
  ON public.monthly_obligation_payments(installment_id, created_at);
CREATE INDEX idx_monthly_obligation_payments_bank
  ON public.monthly_obligation_payments(company_id, bank_id, payment_date DESC)
  WHERE bank_id IS NOT NULL;
CREATE INDEX idx_monthly_obligation_payments_status
  ON public.monthly_obligation_payments(company_id, status, payment_date DESC);

ALTER TABLE public.monthly_obligation_payments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.monthly_obligation_payments FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.monthly_obligation_payments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.monthly_obligation_payments TO service_role;

CREATE POLICY monthly_obligation_payments_company_select
ON public.monthly_obligation_payments
FOR SELECT TO authenticated
USING (company_id = (SELECT public.get_user_company_id()));

CREATE TRIGGER update_monthly_obligation_payments_updated_at
BEFORE UPDATE ON public.monthly_obligation_payments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.guard_monthly_obligation_installment_payment_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (
    NEW.paid_amount IS DISTINCT FROM OLD.paid_amount
    OR (
      NEW.status IS DISTINCT FROM OLD.status
      AND (
        NEW.status IN ('partial', 'paid')
        OR OLD.status IN ('partial', 'paid')
      )
    )
    OR NEW.payment_date IS DISTINCT FROM OLD.payment_date
    OR NEW.vendor_payment_id IS DISTINCT FROM OLD.vendor_payment_id
    OR NEW.bank_transaction_id IS DISTINCT FROM OLD.bank_transaction_id
    OR NEW.journal_entry_id IS DISTINCT FROM OLD.journal_entry_id
    OR NEW.reference_number IS DISTINCT FROM OLD.reference_number
    OR NEW.payment_ledger_baseline IS DISTINCT FROM OLD.payment_ledger_baseline
  ) AND COALESCE(current_setting('app.monthly_obligation_payment_v1', true), '') <> 'authorized'
  THEN
    RAISE EXCEPTION 'Monthly-obligation installment payment fields may only be changed by pay_monthly_obligation_installment_v1'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_monthly_obligation_installment_payment_fields()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS a_guard_monthly_obligation_installment_payment_fields
  ON public.monthly_obligation_installments;
CREATE TRIGGER a_guard_monthly_obligation_installment_payment_fields
BEFORE UPDATE OF
  paid_amount,
  status,
  payment_date,
  vendor_payment_id,
  bank_transaction_id,
  journal_entry_id,
  reference_number,
  payment_ledger_baseline
ON public.monthly_obligation_installments
FOR EACH ROW
EXECUTE FUNCTION public.guard_monthly_obligation_installment_payment_fields();

CREATE OR REPLACE FUNCTION public.pay_monthly_obligation_installment_v1(
  p_company_id uuid,
  p_installment_id uuid,
  p_amount numeric,
  p_payment_date date,
  p_bank_id uuid,
  p_cash_account_id uuid,
  p_reference_number text,
  p_notes text,
  p_idempotency_key uuid,
  p_actor_id uuid DEFAULT NULL
)
RETURNS public.monthly_obligation_payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_role text := COALESCE(NULLIF(auth.role()::text, ''), current_setting('request.jwt.claim.role', true), '');
  v_actor_id uuid;
  v_installment public.monthly_obligation_installments%ROWTYPE;
  v_obligation public.monthly_obligations%ROWTYPE;
  v_existing public.monthly_obligation_payments%ROWTYPE;
  v_payment public.monthly_obligation_payments%ROWTYPE;
  v_payment_id uuid := gen_random_uuid();
  v_journal_id uuid := gen_random_uuid();
  v_vendor_payment_id uuid;
  v_bank_transaction_id uuid;
  v_previous_paid numeric := 0;
  v_previous_principal numeric := 0;
  v_previous_interest numeric := 0;
  v_remaining numeric;
  v_remaining_interest numeric;
  v_principal numeric;
  v_interest numeric;
  v_new_paid numeric;
  v_bank_balance numeric;
  v_bank_currency text;
  v_entry_number text;
  v_description text;
  v_previous_guard text := COALESCE(current_setting('app.monthly_obligation_payment_v1', true), '');
BEGIN
  IF v_actor_role NOT IN ('authenticated', 'service_role') THEN
    RAISE EXCEPTION 'Authentication is required' USING ERRCODE = '42501';
  END IF;
  IF p_company_id IS NULL OR p_installment_id IS NULL OR p_cash_account_id IS NULL
     OR p_payment_date IS NULL OR p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'Company, installment, payment date, cash account, and idempotency key are required'
      USING ERRCODE = 'P0001';
  END IF;
  IF p_amount IS NULL OR round(p_amount, 2) <= 0 OR p_amount <> round(p_amount, 2) THEN
    RAISE EXCEPTION 'Payment amount must be positive and have at most two decimal places'
      USING ERRCODE = 'P0001';
  END IF;

  v_actor_id := CASE WHEN v_actor_role = 'service_role' THEN p_actor_id ELSE auth.uid() END;
  IF v_actor_role = 'authenticated' THEN
    IF v_actor_id IS NULL OR public.get_user_company_id() IS DISTINCT FROM p_company_id THEN
      RAISE EXCEPTION 'Monthly-obligation payment does not belong to the current company'
        USING ERRCODE = '42501';
    END IF;
    IF p_actor_id IS NOT NULL AND p_actor_id IS DISTINCT FROM v_actor_id THEN
      RAISE EXCEPTION 'Actor identity mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_company_id::text || ':' || p_idempotency_key::text, 0)
  );

  SELECT payment.*
  INTO v_existing
  FROM public.monthly_obligation_payments payment
  WHERE payment.company_id = p_company_id
    AND payment.idempotency_key = p_idempotency_key;

  IF FOUND THEN
    IF v_existing.installment_id IS DISTINCT FROM p_installment_id
       OR abs(v_existing.amount - p_amount) >= 0.005
       OR v_existing.payment_date IS DISTINCT FROM p_payment_date
       OR v_existing.bank_id IS DISTINCT FROM p_bank_id
       OR v_existing.cash_account_id IS DISTINCT FROM p_cash_account_id
       OR v_existing.reference_number IS DISTINCT FROM NULLIF(BTRIM(COALESCE(p_reference_number, '')), '')
       OR v_existing.notes IS DISTINCT FROM NULLIF(BTRIM(COALESCE(p_notes, '')), '')
    THEN
      RAISE EXCEPTION 'Idempotency key was already used with a different monthly-obligation payment request'
        USING ERRCODE = 'P0001';
    END IF;
    RETURN v_existing;
  END IF;

  SELECT installment.*
  INTO v_installment
  FROM public.monthly_obligation_installments installment
  WHERE installment.id = p_installment_id
    AND installment.company_id = p_company_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Monthly-obligation installment was not found for the current company'
      USING ERRCODE = 'P0001';
  END IF;
  IF v_installment.status IN ('paid', 'cancelled') THEN
    RAISE EXCEPTION 'A paid or cancelled monthly-obligation installment cannot receive a payment'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT obligation.*
  INTO v_obligation
  FROM public.monthly_obligations obligation
  WHERE obligation.id = v_installment.obligation_id
    AND obligation.company_id = p_company_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Monthly obligation was not found for the current company'
      USING ERRCODE = 'P0001';
  END IF;
  IF v_obligation.status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'A completed or cancelled monthly obligation cannot receive a payment'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_bank_id IS NOT NULL THEN
    SELECT COALESCE(bank.current_balance, bank.opening_balance, 0), bank.currency
    INTO v_bank_balance, v_bank_currency
    FROM public.banks bank
    WHERE bank.id = p_bank_id
      AND bank.company_id = p_company_id
      AND COALESCE(bank.is_active, true) = true
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Bank was not found or is inactive for the current company'
        USING ERRCODE = 'P0001';
    END IF;
    IF upper(COALESCE(v_bank_currency, '')) IS DISTINCT FROM upper(COALESCE(v_obligation.currency, 'QAR')) THEN
      RAISE EXCEPTION 'Bank and monthly obligation currencies must match'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  PERFORM 1
  FROM public.chart_of_accounts account
  WHERE account.id = p_cash_account_id
    AND account.company_id = p_company_id
    AND account.is_active = true
    AND COALESCE(account.is_header, false) = false
    AND COALESCE(account.account_level, 0) >= 3
    AND lower(COALESCE(account.account_type, '')) IN ('asset', 'assets')
    AND lower(COALESCE(account.balance_type, '')) = 'debit';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cash account must be an active, postable debit asset account for the current company'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT
    COALESCE(v_installment.payment_ledger_baseline, 0)
      + COALESCE(SUM(payment.amount) FILTER (WHERE payment.status = 'completed'), 0),
    COALESCE(SUM(payment.principal_amount) FILTER (WHERE payment.status = 'completed'), 0),
    COALESCE(SUM(payment.interest_amount) FILTER (WHERE payment.status = 'completed'), 0)
  INTO v_previous_paid, v_previous_principal, v_previous_interest
  FROM public.monthly_obligation_payments payment
  WHERE payment.company_id = p_company_id
    AND payment.installment_id = p_installment_id;

  IF abs(COALESCE(v_installment.paid_amount, 0) - v_previous_paid) >= 0.005 THEN
    RAISE EXCEPTION 'Installment paid amount is inconsistent with its payment ledger'
      USING ERRCODE = 'P0001';
  END IF;

  v_remaining := GREATEST(v_installment.amount - v_previous_paid, 0);
  IF v_remaining <= 0.001 THEN
    RAISE EXCEPTION 'This monthly-obligation installment is already fully paid'
      USING ERRCODE = 'P0001';
  END IF;
  IF p_amount > v_remaining + 0.001 THEN
    RAISE EXCEPTION 'Payment exceeds the remaining installment balance of %', round(v_remaining, 2)
      USING ERRCODE = 'P0001';
  END IF;
  IF public.system_agent_date_in_closed_period(p_company_id, p_payment_date) THEN
    RAISE EXCEPTION 'Monthly-obligation payment posting is blocked by a closed accounting period'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_obligation.accounting_treatment = 'direct_expense' THEN
    IF EXISTS (
      SELECT 1
      FROM public.journal_entries entry
      WHERE entry.company_id = p_company_id
        AND lower(COALESCE(entry.reference_type, '')) = 'monthly_obligation_accrual'
        AND entry.reference_id = v_obligation.id
        AND lower(COALESCE(entry.status, '')) = 'posted'
        AND entry.reversal_entry_id IS NULL
    ) THEN
      RAISE EXCEPTION 'Direct-expense obligation has a posted accrual; payment treatment requires review'
        USING ERRCODE = 'P0001';
    END IF;
    PERFORM 1
    FROM public.chart_of_accounts account
    WHERE account.id = v_obligation.expense_account_id
      AND account.company_id = p_company_id
      AND account.is_active = true
      AND COALESCE(account.is_header, false) = false
      AND COALESCE(account.account_level, 0) >= 3
      AND lower(COALESCE(account.account_type, '')) IN ('expense', 'expenses')
      AND lower(COALESCE(account.balance_type, '')) = 'debit';
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Direct-expense obligation requires an active, postable debit expense account'
        USING ERRCODE = 'P0001';
    END IF;
    v_principal := p_amount;
    v_interest := 0;
  ELSE
    IF COALESCE(v_installment.payment_ledger_baseline, 0) > 0 THEN
      RAISE EXCEPTION 'Legacy financing payment lacks principal and interest detail; review is required before another payment'
        USING ERRCODE = 'P0001';
    END IF;
    IF abs((v_installment.principal_amount + v_installment.interest_amount) - v_installment.amount) > 0.01 THEN
      RAISE EXCEPTION 'Financing installment principal and interest do not match its amount'
        USING ERRCODE = 'P0001';
    END IF;

    PERFORM 1
    FROM public.chart_of_accounts account
    WHERE account.id = v_obligation.liability_account_id
      AND account.company_id = p_company_id
      AND account.is_active = true
      AND COALESCE(account.is_header, false) = false
      AND COALESCE(account.account_level, 0) >= 3
      AND lower(COALESCE(account.account_type, '')) IN ('liability', 'liabilities')
      AND lower(COALESCE(account.balance_type, '')) = 'credit';
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Financing obligation requires an active, postable credit liability account'
        USING ERRCODE = 'P0001';
    END IF;

    v_remaining_interest := GREATEST(v_installment.interest_amount - v_previous_interest, 0);
    IF p_amount >= v_remaining - 0.001 THEN
      v_interest := LEAST(v_remaining_interest, p_amount);
    ELSE
      v_interest := LEAST(round(p_amount * v_remaining_interest / v_remaining, 2), p_amount);
    END IF;
    v_principal := p_amount - v_interest;

    IF v_principal > GREATEST(v_installment.principal_amount - v_previous_principal, 0) + 0.01 THEN
      RAISE EXCEPTION 'Payment principal exceeds the remaining installment principal'
        USING ERRCODE = 'P0001';
    END IF;

    IF v_interest > 0 THEN
      PERFORM 1
      FROM public.chart_of_accounts account
      WHERE account.id = v_obligation.interest_expense_account_id
        AND account.company_id = p_company_id
        AND account.is_active = true
        AND COALESCE(account.is_header, false) = false
        AND COALESCE(account.account_level, 0) >= 3
        AND lower(COALESCE(account.account_type, '')) IN ('expense', 'expenses')
        AND lower(COALESCE(account.balance_type, '')) = 'debit';
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Financing obligation with interest requires an active, postable debit interest-expense account'
          USING ERRCODE = 'P0001';
      END IF;
    END IF;
  END IF;

  IF v_obligation.vendor_id IS NOT NULL THEN
    PERFORM 1
    FROM public.vendors vendor
    WHERE vendor.id = v_obligation.vendor_id
      AND vendor.company_id = p_company_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Obligation vendor does not belong to the current company'
        USING ERRCODE = 'P0001';
    END IF;
    IF v_actor_id IS NULL THEN
      RAISE EXCEPTION 'Actor is required when a vendor payment is created'
        USING ERRCODE = 'P0001';
    END IF;
    v_vendor_payment_id := gen_random_uuid();
  END IF;
  IF p_bank_id IS NOT NULL THEN
    v_bank_transaction_id := gen_random_uuid();
  END IF;

  v_entry_number := 'JE-MOP-' || to_char(p_payment_date, 'YYYYMMDD') || '-' || left(v_journal_id::text, 8);
  v_description := 'Monthly obligation payment - ' || v_obligation.obligation_number
    || ' - installment ' || v_installment.installment_number;

  INSERT INTO public.journal_entries (
    id, company_id, entry_number, entry_date, description, reference_type, reference_id,
    status, total_debit, total_credit, created_by, posted_by, posted_at
  ) VALUES (
    v_journal_id, p_company_id, v_entry_number, p_payment_date, v_description,
    'monthly_obligation_payment', v_payment_id, 'posted', p_amount, p_amount,
    v_actor_id, v_actor_id, now()
  );

  IF v_obligation.accounting_treatment = 'direct_expense' THEN
    INSERT INTO public.journal_entry_lines (
      journal_entry_id, account_id, cost_center_id, line_description,
      debit_amount, credit_amount, line_number
    ) VALUES (
      v_journal_id, v_obligation.expense_account_id, v_obligation.cost_center_id,
      v_description, p_amount, 0, 1
    );
  ELSE
    INSERT INTO public.journal_entry_lines (
      journal_entry_id, account_id, cost_center_id, asset_id,
      line_description, debit_amount, credit_amount, line_number
    ) VALUES (
      v_journal_id, v_obligation.liability_account_id, v_obligation.cost_center_id,
      v_obligation.fixed_asset_id, v_description, v_principal, 0, 1
    );
    IF v_interest > 0 THEN
      INSERT INTO public.journal_entry_lines (
        journal_entry_id, account_id, cost_center_id, line_description,
        debit_amount, credit_amount, line_number
      ) VALUES (
        v_journal_id, v_obligation.interest_expense_account_id, v_obligation.cost_center_id,
        'Interest - ' || v_description, v_interest, 0, 2
      );
    END IF;
  END IF;

  INSERT INTO public.journal_entry_lines (
    journal_entry_id, account_id, cost_center_id,
    line_description, debit_amount, credit_amount, line_number
  ) VALUES (
    v_journal_id, p_cash_account_id, v_obligation.cost_center_id,
    v_description, 0, p_amount,
    CASE
      WHEN v_obligation.accounting_treatment <> 'direct_expense' AND v_interest > 0 THEN 3
      ELSE 2
    END
  );

  IF v_vendor_payment_id IS NOT NULL THEN
    INSERT INTO public.vendor_payments (
      id, company_id, vendor_id, payment_number, payment_date, amount, currency,
      payment_method, bank_id, reference_number, description, notes, status,
      journal_entry_id, created_by
    ) VALUES (
      v_vendor_payment_id, p_company_id, v_obligation.vendor_id,
      'VP-MOP-' || left(v_payment_id::text, 12), p_payment_date, p_amount,
      v_obligation.currency, CASE WHEN p_bank_id IS NULL THEN 'cash' ELSE 'bank_transfer' END,
      p_bank_id, NULLIF(BTRIM(COALESCE(p_reference_number, '')), ''),
      v_description, NULLIF(BTRIM(COALESCE(p_notes, '')), ''), 'completed',
      v_journal_id, v_actor_id
    );
  END IF;

  IF v_bank_transaction_id IS NOT NULL THEN
    v_bank_balance := v_bank_balance - p_amount;
    INSERT INTO public.bank_transactions (
      id, company_id, bank_id, transaction_number, transaction_date, transaction_type,
      amount, balance_after, description, reference_number, status, created_by,
      journal_entry_id
    ) VALUES (
      v_bank_transaction_id, p_company_id, p_bank_id,
      'BT-MOP-' || left(v_payment_id::text, 12), p_payment_date, 'withdrawal',
      p_amount, v_bank_balance, v_description,
      NULLIF(BTRIM(COALESCE(p_reference_number, '')), ''), 'completed',
      v_actor_id, v_journal_id
    );

    v_bank_balance := public.recalculate_bank_balance(p_bank_id);
    UPDATE public.bank_transactions
    SET balance_after = v_bank_balance, updated_at = now()
    WHERE id = v_bank_transaction_id AND company_id = p_company_id;
  END IF;

  INSERT INTO public.monthly_obligation_payments (
    id, company_id, installment_id, amount, principal_amount, interest_amount,
    payment_date, bank_id, cash_account_id, vendor_payment_id, bank_transaction_id,
    journal_entry_id, reference_number, notes, idempotency_key, created_by
  ) VALUES (
    v_payment_id, p_company_id, p_installment_id, p_amount, v_principal, v_interest,
    p_payment_date, p_bank_id, p_cash_account_id, v_vendor_payment_id,
    v_bank_transaction_id, v_journal_id,
    NULLIF(BTRIM(COALESCE(p_reference_number, '')), ''),
    NULLIF(BTRIM(COALESCE(p_notes, '')), ''), p_idempotency_key, v_actor_id
  )
  RETURNING * INTO v_payment;

  v_new_paid := v_previous_paid + p_amount;
  PERFORM set_config('app.monthly_obligation_payment_v1', 'authorized', true);
  UPDATE public.monthly_obligation_installments
  SET paid_amount = v_new_paid,
      status = CASE WHEN v_new_paid >= amount - 0.001 THEN 'paid' ELSE 'partial' END,
      payment_date = p_payment_date,
      vendor_payment_id = v_vendor_payment_id,
      bank_transaction_id = v_bank_transaction_id,
      journal_entry_id = v_journal_id,
      reference_number = NULLIF(BTRIM(COALESCE(p_reference_number, '')), ''),
      notes = COALESCE(NULLIF(BTRIM(COALESCE(p_notes, '')), ''), notes),
      updated_at = now()
  WHERE id = p_installment_id AND company_id = p_company_id;
  PERFORM set_config('app.monthly_obligation_payment_v1', v_previous_guard, true);

  IF NOT EXISTS (
    SELECT 1
    FROM public.monthly_obligation_installments installment
    WHERE installment.obligation_id = v_obligation.id
      AND installment.company_id = p_company_id
      AND installment.status <> 'paid'
  ) THEN
    UPDATE public.monthly_obligations
    SET status = 'completed', updated_at = now()
    WHERE id = v_obligation.id AND company_id = p_company_id;
  END IF;

  RETURN v_payment;
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('app.monthly_obligation_payment_v1', v_previous_guard, true);
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.pay_monthly_obligation_installment_v1(
  uuid, uuid, numeric, date, uuid, uuid, text, text, uuid, uuid
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pay_monthly_obligation_installment_v1(
  uuid, uuid, numeric, date, uuid, uuid, text, text, uuid, uuid
) TO authenticated, service_role;

COMMENT ON FUNCTION public.pay_monthly_obligation_installment_v1(
  uuid, uuid, numeric, date, uuid, uuid, text, text, uuid, uuid
) IS 'Atomically and idempotently posts a monthly-obligation installment payment and its vendor, bank, journal, and ledger records.';

INSERT INTO public.system_agent_command_registry (
  command, domain, description, entity_table, allowed_fields,
  reversible, approval_required, closed_period_policy, min_confidence, enabled
) VALUES (
  'monthly_obligation.sync_payment_state',
  'accounting',
  'Derive a monthly-obligation installment payment state from its canonical payment ledger.',
  'monthly_obligation_installments',
  ARRAY['paid_amount', 'status', 'payment_date'],
  true, false, 'allow_derived', 1.0, true
)
ON CONFLICT (command) DO UPDATE SET
  domain = EXCLUDED.domain,
  description = EXCLUDED.description,
  entity_table = EXCLUDED.entity_table,
  allowed_fields = EXCLUDED.allowed_fields,
  reversible = EXCLUDED.reversible,
  approval_required = EXCLUDED.approval_required,
  closed_period_policy = EXCLUDED.closed_period_policy,
  min_confidence = EXCLUDED.min_confidence,
  enabled = EXCLUDED.enabled,
  updated_at = now();

CREATE OR REPLACE FUNCTION public.system_agent_apply_monthly_obligation_repair_v1(
  p_run_id uuid,
  p_job_id uuid,
  p_finding_id uuid,
  p_command text,
  p_company_id uuid,
  p_entity_id text,
  p_expected_before jsonb DEFAULT '{}'::jsonb,
  p_values jsonb DEFAULT '{}'::jsonb,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job public.system_agent_jobs%ROWTYPE;
  v_finding public.system_agent_findings%ROWTYPE;
  v_registry public.system_agent_command_registry%ROWTYPE;
  v_installment public.monthly_obligation_installments%ROWTYPE;
  v_before jsonb;
  v_after jsonb;
  v_ledger_paid numeric;
  v_latest_payment_date date;
  v_target_status text;
  v_repair_id uuid := gen_random_uuid();
  v_previous_guard text := COALESCE(current_setting('app.monthly_obligation_payment_v1', true), '');
BEGIN
  IF p_command <> 'monthly_obligation.sync_payment_state' THEN
    RAISE EXCEPTION 'Command is not handled by the monthly-obligation repair gateway';
  END IF;
  IF COALESCE(p_values, '{}'::jsonb) <> '{}'::jsonb THEN
    RAISE EXCEPTION 'Monthly-obligation repairs do not accept caller-selected values';
  END IF;

  SELECT * INTO v_job
  FROM public.system_agent_jobs job
  WHERE job.id = p_job_id
    AND job.run_id = p_run_id
    AND job.company_id = p_company_id
  FOR UPDATE;
  IF v_job.id IS NULL OR v_job.status <> 'running' OR v_job.mode <> 'apply'
     OR v_job.domain <> 'accounting'
  THEN
    RAISE EXCEPTION 'System agent accounting job is not an active apply job';
  END IF;

  SELECT * INTO v_finding
  FROM public.system_agent_findings finding
  WHERE finding.id = p_finding_id
    AND finding.run_id = p_run_id
    AND finding.job_id = p_job_id
    AND finding.company_id = p_company_id
  FOR UPDATE;
  IF v_finding.id IS NULL
     OR v_finding.repair_command IS DISTINCT FROM p_command
     OR v_finding.entity_type IS DISTINCT FROM 'monthly_obligation_installment'
     OR v_finding.entity_id IS DISTINCT FROM p_entity_id
     OR v_finding.status IN ('repaired', 'rolled_back')
  THEN
    RAISE EXCEPTION 'Monthly-obligation finding is invalid, mismatched, or already processed';
  END IF;

  SELECT * INTO v_registry
  FROM public.system_agent_command_registry registry
  WHERE registry.command = p_command
    AND registry.domain = 'accounting'
    AND registry.enabled
    AND registry.reversible
    AND NOT registry.approval_required;
  IF v_registry.command IS NULL OR v_finding.confidence < v_registry.min_confidence THEN
    RAISE EXCEPTION 'Monthly-obligation repair command is disabled or below confidence threshold';
  END IF;

  SELECT * INTO v_installment
  FROM public.monthly_obligation_installments installment
  WHERE installment.id = p_entity_id::uuid
    AND installment.company_id = p_company_id
  FOR UPDATE;
  IF v_installment.id IS NULL THEN
    RAISE EXCEPTION 'Monthly-obligation installment is outside the active company';
  END IF;
  IF COALESCE(v_installment.payment_ledger_baseline, 0) > 0 THEN
    RAISE EXCEPTION 'Legacy payment baselines require accounting review';
  END IF;

  v_before := public.system_agent_pick_fields(
    to_jsonb(v_installment), v_registry.allowed_fields
  );
  IF NOT (v_before @> COALESCE(p_expected_before, '{}'::jsonb)) THEN
    RAISE EXCEPTION 'Monthly-obligation installment changed after detection';
  END IF;

  SELECT
    round(COALESCE(sum(payment.amount) FILTER (
      WHERE payment.status = 'completed'
    ), 0)::numeric, 2),
    max(payment.payment_date) FILTER (WHERE payment.status = 'completed')
  INTO v_ledger_paid, v_latest_payment_date
  FROM public.monthly_obligation_payments payment
  WHERE payment.installment_id = v_installment.id
    AND payment.company_id = p_company_id;

  IF v_ledger_paid <= 0 OR v_latest_payment_date IS NULL THEN
    RAISE EXCEPTION 'No completed canonical payments support an automatic state repair';
  END IF;
  IF v_ledger_paid > v_installment.amount + 0.01 THEN
    RAISE EXCEPTION 'Canonical payment ledger exceeds the installment amount';
  END IF;

  v_target_status := CASE
    WHEN v_ledger_paid >= v_installment.amount - 0.001 THEN 'paid'
    ELSE 'partial'
  END;

  PERFORM set_config('app.monthly_obligation_payment_v1', 'authorized', true);
  UPDATE public.monthly_obligation_installments
  SET paid_amount = v_ledger_paid,
      status = v_target_status,
      payment_date = v_latest_payment_date,
      updated_at = now()
  WHERE id = v_installment.id
    AND company_id = p_company_id;
  PERFORM set_config('app.monthly_obligation_payment_v1', v_previous_guard, true);

  SELECT * INTO v_installment
  FROM public.monthly_obligation_installments installment
  WHERE installment.id = v_installment.id;
  v_after := public.system_agent_pick_fields(
    to_jsonb(v_installment), v_registry.allowed_fields
  );
  IF v_before IS NOT DISTINCT FROM v_after THEN
    UPDATE public.system_agent_findings
    SET status = 'ignored', repair_id = NULL, error = NULL, updated_at = now()
    WHERE id = p_finding_id;
    RETURN jsonb_build_object('status', 'verified_no_change', 'state', v_after);
  END IF;

  INSERT INTO public.system_agent_repairs (
    id, run_id, job_id, finding_id, company_id, domain, command,
    entity_table, entity_id, before_state, after_state, rollback_metadata
  ) VALUES (
    v_repair_id, p_run_id, p_job_id, p_finding_id, p_company_id,
    'accounting', p_command, 'monthly_obligation_installments',
    v_installment.id::text, v_before, v_after,
    COALESCE(p_metadata, '{}'::jsonb)
      || jsonb_build_object('handler_version', 'monthly_obligation_v1')
  );
  UPDATE public.system_agent_findings
  SET status = 'repaired', repair_id = v_repair_id, error = NULL, updated_at = now()
  WHERE id = p_finding_id;

  RETURN jsonb_build_object(
    'status', 'repaired',
    'repair_id', v_repair_id,
    'command', p_command,
    'entity_id', v_installment.id,
    'before', v_before,
    'after', v_after
  );
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('app.monthly_obligation_payment_v1', v_previous_guard, true);
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.system_agent_apply_monthly_obligation_repair_v1(
  uuid, uuid, uuid, text, uuid, text, jsonb, jsonb, jsonb
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_apply_monthly_obligation_repair_v1(
  uuid, uuid, uuid, text, uuid, text, jsonb, jsonb, jsonb
) TO service_role;

DO $$
BEGIN
  IF to_regprocedure('public.system_agent_rollback_repair_before_monthly_obligation_v1(uuid,text)') IS NULL THEN
    ALTER FUNCTION public.system_agent_rollback_repair(uuid, text)
      RENAME TO system_agent_rollback_repair_before_monthly_obligation_v1;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.system_agent_rollback_repair_before_monthly_obligation_v1(uuid, text)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.system_agent_rollback_repair(
  p_repair_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_repair public.system_agent_repairs%ROWTYPE;
  v_installment public.monthly_obligation_installments%ROWTYPE;
  v_current jsonb;
  v_previous_guard text := COALESCE(current_setting('app.monthly_obligation_payment_v1', true), '');
BEGIN
  SELECT * INTO v_repair
  FROM public.system_agent_repairs repair
  WHERE repair.id = p_repair_id
  FOR UPDATE;
  IF v_repair.id IS NULL THEN RAISE EXCEPTION 'Repair was not found'; END IF;
  IF COALESCE(v_repair.rollback_metadata ->> 'handler_version', '') <> 'monthly_obligation_v1' THEN
    RETURN public.system_agent_rollback_repair_before_monthly_obligation_v1(
      p_repair_id, p_reason
    );
  END IF;
  IF v_repair.status = 'rolled_back' THEN
    RETURN jsonb_build_object('repair_id', p_repair_id, 'status', 'rolled_back');
  END IF;
  IF v_repair.status <> 'applied'
     OR v_repair.command <> 'monthly_obligation.sync_payment_state'
  THEN
    RAISE EXCEPTION 'Only an applied monthly-obligation repair can be rolled back';
  END IF;

  SELECT * INTO v_installment
  FROM public.monthly_obligation_installments installment
  WHERE installment.id = v_repair.entity_id::uuid
    AND installment.company_id = v_repair.company_id
  FOR UPDATE;
  IF v_installment.id IS NULL THEN
    RAISE EXCEPTION 'Monthly-obligation installment was not found';
  END IF;

  v_current := public.system_agent_pick_fields(
    to_jsonb(v_installment), ARRAY['paid_amount', 'status', 'payment_date']::text[]
  );
  IF v_current IS DISTINCT FROM v_repair.after_state THEN
    RAISE EXCEPTION 'Monthly-obligation installment changed after repair; rollback was safely aborted';
  END IF;

  PERFORM set_config('app.monthly_obligation_payment_v1', 'authorized', true);
  UPDATE public.monthly_obligation_installments
  SET paid_amount = (v_repair.before_state ->> 'paid_amount')::numeric,
      status = v_repair.before_state ->> 'status',
      payment_date = NULLIF(v_repair.before_state ->> 'payment_date', '')::date,
      updated_at = now()
  WHERE id = v_installment.id
    AND company_id = v_repair.company_id;
  PERFORM set_config('app.monthly_obligation_payment_v1', v_previous_guard, true);

  UPDATE public.system_agent_repairs
  SET status = 'rolled_back',
      rolled_back_at = now(),
      rollback_reason = left(
        COALESCE(NULLIF(BTRIM(p_reason), ''), 'System agent rollback'), 1000
      ),
      error = NULL,
      updated_at = now()
  WHERE id = p_repair_id;
  UPDATE public.system_agent_findings
  SET status = 'rolled_back', error = NULL, updated_at = now()
  WHERE id = v_repair.finding_id;

  RETURN jsonb_build_object('repair_id', p_repair_id, 'status', 'rolled_back');
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('app.monthly_obligation_payment_v1', v_previous_guard, true);
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.system_agent_rollback_repair(uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_agent_rollback_repair(uuid, text) TO service_role;
