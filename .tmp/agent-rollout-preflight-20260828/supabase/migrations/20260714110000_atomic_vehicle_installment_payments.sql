-- Canonical, atomic vehicle-installment payments and their posted journals.

INSERT INTO public.default_account_types (
  type_code, type_name, type_name_ar, account_category, description, is_system
)
SELECT *
FROM (VALUES
  ('VEHICLE_INSTALLMENT_PAYABLE', 'Vehicle Installment Payable', 'التزامات أقساط المركبات', 'liabilities', 'Liability reduced when a vehicle installment principal is paid.', true),
  ('VEHICLE_INSTALLMENT_INTEREST_EXPENSE', 'Vehicle Installment Interest Expense', 'مصروف فوائد أقساط المركبات', 'expenses', 'Interest expense recognized when a vehicle installment is paid.', true)
) AS account_type(type_code, type_name, type_name_ar, account_category, description, is_system)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.default_account_types existing
  WHERE existing.type_code = account_type.type_code
);
CREATE TABLE public.vehicle_installment_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  installment_id uuid NOT NULL REFERENCES public.vehicle_installments(id) ON DELETE RESTRICT,
  schedule_id uuid NOT NULL REFERENCES public.vehicle_installment_schedules(id) ON DELETE RESTRICT,
  payment_date date NOT NULL,
  amount numeric(15,2) NOT NULL CHECK (amount > 0),
  principal_amount numeric(15,2) NOT NULL CHECK (principal_amount >= 0),
  interest_amount numeric(15,2) NOT NULL CHECK (interest_amount >= 0),
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'check', 'credit_card')),
  payment_reference text,
  notes text,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'reversed')),
  journal_entry_id uuid NOT NULL UNIQUE REFERENCES public.journal_entries(id) ON DELETE RESTRICT,
  reversal_journal_entry_id uuid UNIQUE REFERENCES public.journal_entries(id) ON DELETE RESTRICT,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vehicle_installment_payment_components_match
    CHECK (abs((principal_amount + interest_amount) - amount) <= 0.01)
);
CREATE INDEX idx_vehicle_installment_payments_company
  ON public.vehicle_installment_payments(company_id, payment_date DESC);
CREATE INDEX idx_vehicle_installment_payments_schedule
  ON public.vehicle_installment_payments(schedule_id, created_at);
CREATE INDEX idx_vehicle_installment_payments_installment
  ON public.vehicle_installment_payments(installment_id, created_at);
ALTER TABLE public.vehicle_installment_payments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.vehicle_installment_payments FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.vehicle_installment_payments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.vehicle_installment_payments TO service_role;
CREATE POLICY vehicle_installment_payments_company_select
ON public.vehicle_installment_payments
FOR SELECT TO authenticated
USING (company_id = (SELECT public.get_user_company_id()));
CREATE TRIGGER update_vehicle_installment_payments_updated_at
BEFORE UPDATE ON public.vehicle_installment_payments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE FUNCTION public.process_vehicle_installment_payment_v1(
  p_company_id uuid,
  p_schedule_id uuid,
  p_amount numeric,
  p_payment_date date,
  p_payment_method text,
  p_payment_reference text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
)
RETURNS public.vehicle_installment_payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_schedule public.vehicle_installment_schedules%ROWTYPE;
  v_installment public.vehicle_installments%ROWTYPE;
  v_previous_paid numeric;
  v_new_paid numeric;
  v_remaining numeric;
  v_interest numeric;
  v_principal numeric;
  v_payable_account_id uuid;
  v_interest_account_id uuid;
  v_cash_account_id uuid;
  v_cash_type text;
  v_payment_id uuid := gen_random_uuid();
  v_journal_id uuid := gen_random_uuid();
  v_entry_number text;
  v_description text;
  v_payment public.vehicle_installment_payments%ROWTYPE;
BEGIN
  IF p_company_id IS NULL OR p_schedule_id IS NULL THEN
    RAISE EXCEPTION 'Company and installment schedule are required' USING ERRCODE = 'P0001';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Installment payment amount must be greater than zero' USING ERRCODE = 'P0001';
  END IF;
  IF p_payment_method NOT IN ('cash', 'bank_transfer', 'check', 'credit_card') THEN
    RAISE EXCEPTION 'Unsupported installment payment method' USING ERRCODE = 'P0001';
  END IF;

  v_actor_id := CASE WHEN auth.uid() IS NOT NULL THEN auth.uid() ELSE p_actor_id END;
  IF auth.uid() IS NULL AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Authentication is required' USING ERRCODE = '42501';
  END IF;
  IF auth.uid() IS NOT NULL AND public.get_user_company_id() IS DISTINCT FROM p_company_id THEN
    RAISE EXCEPTION 'Installment payment does not belong to the current company' USING ERRCODE = '42501';
  END IF;

  SELECT schedule.*
  INTO v_schedule
  FROM public.vehicle_installment_schedules schedule
  WHERE schedule.id = p_schedule_id
    AND schedule.company_id = p_company_id
  FOR UPDATE;
  IF v_schedule.id IS NULL THEN
    RAISE EXCEPTION 'Installment schedule was not found for the current company' USING ERRCODE = 'P0001';
  END IF;

  SELECT installment.*
  INTO v_installment
  FROM public.vehicle_installments installment
  WHERE installment.id = v_schedule.installment_id
    AND installment.company_id = p_company_id
  FOR UPDATE;
  IF v_installment.id IS NULL THEN
    RAISE EXCEPTION 'Installment agreement was not found for the current company' USING ERRCODE = 'P0001';
  END IF;
  IF v_installment.status IN ('cancelled', 'completed') THEN
    RAISE EXCEPTION 'A cancelled or completed installment agreement cannot receive a payment' USING ERRCODE = 'P0001';
  END IF;

  v_previous_paid := COALESCE(v_schedule.paid_amount, 0);
  v_remaining := GREATEST(COALESCE(v_schedule.amount, 0) - v_previous_paid, 0);
  IF v_remaining <= 0.001 THEN
    RAISE EXCEPTION 'This installment schedule is already fully paid' USING ERRCODE = 'P0001';
  END IF;
  IF p_amount > v_remaining + 0.001 THEN
    RAISE EXCEPTION 'Installment payment exceeds the remaining balance of %', v_remaining USING ERRCODE = 'P0001';
  END IF;

  IF public.system_agent_date_in_closed_period(p_company_id, COALESCE(p_payment_date, CURRENT_DATE)) THEN
    RAISE EXCEPTION 'Installment payment posting is blocked by a closed accounting period' USING ERRCODE = 'P0001';
  END IF;

  v_interest := round(
    p_amount * GREATEST(COALESCE(v_schedule.interest_amount, 0), 0)
      / GREATEST(COALESCE(v_schedule.amount, 0), 0.01),
    2
  );
  v_interest := LEAST(v_interest, p_amount);
  v_principal := p_amount - v_interest;
  v_cash_type := CASE WHEN p_payment_method = 'cash' THEN 'CASH' ELSE 'BANK' END;

  SELECT account.id INTO v_payable_account_id
  FROM public.account_mappings mapping
  JOIN public.default_account_types account_type ON account_type.id = mapping.default_account_type_id
  JOIN public.chart_of_accounts account ON account.id = mapping.chart_of_accounts_id
  WHERE mapping.company_id = p_company_id
    AND mapping.is_active = true
    AND account_type.type_code = 'VEHICLE_INSTALLMENT_PAYABLE'
    AND account.company_id = p_company_id
    AND account.is_active = true
    AND COALESCE(account.is_header, false) = false
    AND COALESCE(account.account_level, 0) >= 3
    AND lower(COALESCE(account.account_type, '')) = 'liabilities'
    AND lower(COALESCE(account.balance_type, '')) = 'credit'
  ORDER BY mapping.id LIMIT 1;

  IF v_interest > 0 THEN
    SELECT account.id INTO v_interest_account_id
    FROM public.account_mappings mapping
    JOIN public.default_account_types account_type ON account_type.id = mapping.default_account_type_id
    JOIN public.chart_of_accounts account ON account.id = mapping.chart_of_accounts_id
    WHERE mapping.company_id = p_company_id
      AND mapping.is_active = true
      AND account_type.type_code = 'VEHICLE_INSTALLMENT_INTEREST_EXPENSE'
      AND account.company_id = p_company_id
      AND account.is_active = true
      AND COALESCE(account.is_header, false) = false
      AND COALESCE(account.account_level, 0) >= 3
      AND lower(COALESCE(account.account_type, '')) IN ('expense', 'expenses')
      AND lower(COALESCE(account.balance_type, '')) = 'debit'
    ORDER BY mapping.id LIMIT 1;
  END IF;

  SELECT account.id INTO v_cash_account_id
  FROM public.account_mappings mapping
  JOIN public.default_account_types account_type ON account_type.id = mapping.default_account_type_id
  JOIN public.chart_of_accounts account ON account.id = mapping.chart_of_accounts_id
  WHERE mapping.company_id = p_company_id
    AND mapping.is_active = true
    AND account_type.type_code = v_cash_type
    AND account.company_id = p_company_id
    AND account.is_active = true
    AND COALESCE(account.is_header, false) = false
    AND COALESCE(account.account_level, 0) >= 3
    AND lower(COALESCE(account.account_type, '')) = 'assets'
    AND lower(COALESCE(account.balance_type, '')) = 'debit'
  ORDER BY mapping.id LIMIT 1;

  IF v_payable_account_id IS NULL THEN
    RAISE EXCEPTION 'A valid VEHICLE_INSTALLMENT_PAYABLE account mapping is required' USING ERRCODE = 'P0001';
  END IF;
  IF v_interest > 0 AND v_interest_account_id IS NULL THEN
    RAISE EXCEPTION 'A valid VEHICLE_INSTALLMENT_INTEREST_EXPENSE account mapping is required' USING ERRCODE = 'P0001';
  END IF;
  IF v_cash_account_id IS NULL THEN
    RAISE EXCEPTION 'A valid % account mapping is required', v_cash_type USING ERRCODE = 'P0001';
  END IF;

  v_entry_number := 'JE-VIP-' || to_char(COALESCE(p_payment_date, CURRENT_DATE), 'YYYYMMDD') || '-' || left(v_journal_id::text, 8);
  v_description := 'سداد قسط مركبة - ' || v_installment.agreement_number || ' - قسط ' || v_schedule.installment_number;

  INSERT INTO public.journal_entries (
    id, company_id, entry_number, entry_date, description, reference_type, reference_id,
    status, total_debit, total_credit, created_by, posted_by, posted_at
  ) VALUES (
    v_journal_id, p_company_id, v_entry_number, COALESCE(p_payment_date, CURRENT_DATE),
    v_description, 'vehicle_installment_payment', v_payment_id,
    'posted', p_amount, p_amount, v_actor_id, v_actor_id, now()
  );

  INSERT INTO public.journal_entry_lines (
    journal_entry_id, account_id, line_description, debit_amount, credit_amount, line_number
  ) VALUES
    (v_journal_id, v_payable_account_id, v_description, v_principal, 0, 1);

  IF v_interest > 0 THEN
    INSERT INTO public.journal_entry_lines (
      journal_entry_id, account_id, line_description, debit_amount, credit_amount, line_number
    ) VALUES (
      v_journal_id, v_interest_account_id, 'مصروف فائدة - ' || v_description, v_interest, 0, 2
    );
  END IF;

  INSERT INTO public.journal_entry_lines (
    journal_entry_id, account_id, line_description, debit_amount, credit_amount, line_number
  ) VALUES (
    v_journal_id, v_cash_account_id, v_description, 0, p_amount, CASE WHEN v_interest > 0 THEN 3 ELSE 2 END
  );

  INSERT INTO public.vehicle_installment_payments (
    id, company_id, installment_id, schedule_id, payment_date, amount,
    principal_amount, interest_amount, payment_method, payment_reference,
    notes, journal_entry_id, created_by
  ) VALUES (
    v_payment_id, p_company_id, v_installment.id, v_schedule.id,
    COALESCE(p_payment_date, CURRENT_DATE), p_amount, v_principal, v_interest,
    p_payment_method, NULLIF(BTRIM(COALESCE(p_payment_reference, '')), ''),
    NULLIF(BTRIM(COALESCE(p_notes, '')), ''), v_journal_id, v_actor_id
  ) RETURNING * INTO v_payment;

  v_new_paid := v_previous_paid + p_amount;
  UPDATE public.vehicle_installment_schedules
  SET paid_amount = v_new_paid,
      paid_date = COALESCE(p_payment_date, CURRENT_DATE),
      payment_reference = NULLIF(BTRIM(COALESCE(p_payment_reference, '')), ''),
      notes = COALESCE(NULLIF(BTRIM(COALESCE(p_notes, '')), ''), notes),
      status = CASE WHEN v_new_paid >= amount - 0.001 THEN 'paid' ELSE 'partially_paid' END,
      journal_entry_id = COALESCE(journal_entry_id, v_journal_id),
      updated_at = now()
  WHERE id = v_schedule.id AND company_id = p_company_id;

  IF NOT EXISTS (
    SELECT 1 FROM public.vehicle_installment_schedules schedule
    WHERE schedule.installment_id = v_installment.id
      AND schedule.company_id = p_company_id
      AND schedule.status <> 'paid'
  ) THEN
    UPDATE public.vehicle_installments
    SET status = 'completed', updated_at = now()
    WHERE id = v_installment.id AND company_id = p_company_id;
  END IF;

  RETURN v_payment;
END;
$$;
REVOKE ALL ON FUNCTION public.process_vehicle_installment_payment_v1(
  uuid, uuid, numeric, date, text, text, text, uuid
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_vehicle_installment_payment_v1(
  uuid, uuid, numeric, date, text, text, text, uuid
) TO authenticated, service_role;
COMMENT ON FUNCTION public.process_vehicle_installment_payment_v1(
  uuid, uuid, numeric, date, text, text, text, uuid
) IS 'Atomically posts a mapped vehicle-installment payment journal, records the payment, and refreshes schedule and agreement state.';
