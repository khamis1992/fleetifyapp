-- Atomic payroll accrual/payment transitions with mapped accounts.

INSERT INTO public.default_account_types (
  type_code, type_name, type_name_ar, account_category, description, is_system
)
SELECT * FROM (VALUES
  ('PAYROLL_EXPENSE', 'Payroll Expense', 'مصروف الرواتب', 'expenses', 'Gross payroll expense.', true),
  ('PAYROLL_PAYABLE', 'Payroll Payable', 'رواتب مستحقة', 'liabilities', 'Net salaries payable to employees.', true),
  ('PAYROLL_DEDUCTION_PAYABLE', 'Payroll Deduction Payable', 'استقطاعات رواتب مستحقة', 'liabilities', 'Payroll deductions held as a liability.', true),
  ('PAYROLL_TAX_PAYABLE', 'Payroll Tax Payable', 'ضرائب رواتب مستحقة', 'liabilities', 'Payroll taxes held as a liability.', true)
) AS account_type(type_code, type_name, type_name_ar, account_category, description, is_system)
WHERE NOT EXISTS (
  SELECT 1 FROM public.default_account_types existing
  WHERE existing.type_code = account_type.type_code
);
DROP TRIGGER IF EXISTS handle_payroll_changes_trigger ON public.payroll;
CREATE OR REPLACE FUNCTION public.guard_payroll_financial_state_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'draft' OR NEW.journal_entry_id IS NOT NULL THEN
      RAISE EXCEPTION 'Payroll must be created as an unposted draft' USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status <> 'draft' AND (
    NEW.company_id IS DISTINCT FROM OLD.company_id OR
    NEW.employee_id IS DISTINCT FROM OLD.employee_id OR
    NEW.payroll_date IS DISTINCT FROM OLD.payroll_date OR
    NEW.pay_period_start IS DISTINCT FROM OLD.pay_period_start OR
    NEW.pay_period_end IS DISTINCT FROM OLD.pay_period_end OR
    NEW.basic_salary IS DISTINCT FROM OLD.basic_salary OR
    NEW.allowances IS DISTINCT FROM OLD.allowances OR
    NEW.overtime_amount IS DISTINCT FROM OLD.overtime_amount OR
    NEW.deductions IS DISTINCT FROM OLD.deductions OR
    NEW.tax_amount IS DISTINCT FROM OLD.tax_amount OR
    NEW.net_amount IS DISTINCT FROM OLD.net_amount OR
    NEW.payment_method IS DISTINCT FROM OLD.payment_method OR
    NEW.bank_account IS DISTINCT FROM OLD.bank_account OR
    NEW.journal_entry_id IS DISTINCT FROM OLD.journal_entry_id
  ) THEN
    RAISE EXCEPTION 'Approved payroll financial fields are immutable; use an approved reversal workflow'
      USING ERRCODE = 'P0001';
  END IF;

  IF (NEW.status IS DISTINCT FROM OLD.status OR NEW.journal_entry_id IS DISTINCT FROM OLD.journal_entry_id)
     AND COALESCE(current_setting('app.payroll_transition_v1', true), '') <> 'authorized'
  THEN
    RAISE EXCEPTION 'Payroll status and journal linkage can only change through the payroll transition gateway'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_payroll_financial_state_v1()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_payroll_financial_state_v1() TO service_role;
CREATE TRIGGER guard_payroll_financial_state_v1
BEFORE INSERT OR UPDATE ON public.payroll
FOR EACH ROW EXECUTE FUNCTION public.guard_payroll_financial_state_v1();
CREATE OR REPLACE FUNCTION public.transition_payroll_status_v1(
  p_company_id uuid,
  p_payroll_id uuid,
  p_target_status text,
  p_actor_id uuid DEFAULT NULL
)
RETURNS public.payroll
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payroll public.payroll%ROWTYPE;
  v_actor_id uuid;
  v_gross numeric;
  v_net numeric;
  v_deductions numeric;
  v_tax numeric;
  v_expected_net numeric;
  v_expense_account_id uuid;
  v_payable_account_id uuid;
  v_deduction_account_id uuid;
  v_tax_account_id uuid;
  v_cash_account_id uuid;
  v_cash_type text;
  v_journal_id uuid := gen_random_uuid();
  v_entry_date date;
  v_entry_number text;
  v_line_number integer := 1;
  v_accrual public.journal_entries%ROWTYPE;
  v_existing_payment public.journal_entries%ROWTYPE;
  v_active_count integer;
  v_line_count integer;
  v_line_debit numeric;
  v_line_credit numeric;
BEGIN
  IF p_target_status NOT IN ('approved', 'paid') THEN
    RAISE EXCEPTION 'Unsupported payroll target status' USING ERRCODE = 'P0001';
  END IF;
  v_actor_id := CASE WHEN auth.uid() IS NOT NULL THEN auth.uid() ELSE p_actor_id END;
  IF auth.uid() IS NULL AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Authentication is required' USING ERRCODE = '42501';
  END IF;
  IF auth.uid() IS NOT NULL AND public.get_user_company_id() IS DISTINCT FROM p_company_id THEN
    RAISE EXCEPTION 'Payroll does not belong to the current company' USING ERRCODE = '42501';
  END IF;

  SELECT payroll.* INTO v_payroll
  FROM public.payroll payroll
  WHERE payroll.id = p_payroll_id AND payroll.company_id = p_company_id
  FOR UPDATE;
  IF v_payroll.id IS NULL THEN
    RAISE EXCEPTION 'Payroll was not found for the current company' USING ERRCODE = 'P0001';
  END IF;
  IF NOT (
    (v_payroll.status = 'draft' AND p_target_status = 'approved') OR
    (v_payroll.status = 'approved' AND p_target_status IN ('approved', 'paid')) OR
    (v_payroll.status = 'paid' AND p_target_status = 'paid')
  ) THEN
    RAISE EXCEPTION 'Invalid payroll status transition from % to %', v_payroll.status, p_target_status
      USING ERRCODE = 'P0001';
  END IF;

  v_gross := round(COALESCE(v_payroll.basic_salary, 0) + COALESCE(v_payroll.allowances, 0) + COALESCE(v_payroll.overtime_amount, 0), 2);
  v_deductions := round(COALESCE(v_payroll.deductions, 0), 2);
  v_tax := round(COALESCE(v_payroll.tax_amount, 0), 2);
  v_net := round(COALESCE(v_payroll.net_amount, 0), 2);
  v_expected_net := round(v_gross - v_deductions - v_tax, 2);
  IF v_gross <= 0 OR v_net < 0 OR abs(v_expected_net - v_net) > 0.01 THEN
    RAISE EXCEPTION 'Payroll components do not reconcile to the stored net amount' USING ERRCODE = 'P0001';
  END IF;

  IF p_target_status = 'approved' THEN
    SELECT count(*) INTO v_active_count
    FROM public.journal_entries entry
    WHERE entry.company_id = p_company_id
      AND entry.reference_type = 'payroll'
      AND entry.reference_id = p_payroll_id
      AND lower(COALESCE(entry.status, '')) <> 'reversed'
      AND entry.reversal_entry_id IS NULL;
    IF v_active_count > 1 THEN
      RAISE EXCEPTION 'Payroll has duplicate active accrual journals that require review' USING ERRCODE = 'P0001';
    END IF;

    SELECT entry.* INTO v_accrual
    FROM public.journal_entries entry
    WHERE entry.company_id = p_company_id
      AND entry.reference_type = 'payroll'
      AND entry.reference_id = p_payroll_id
      AND lower(COALESCE(entry.status, '')) <> 'reversed'
      AND entry.reversal_entry_id IS NULL
    ORDER BY entry.created_at LIMIT 1 FOR UPDATE;
    IF v_accrual.id IS NOT NULL THEN
      SELECT count(*), COALESCE(sum(line.debit_amount), 0), COALESCE(sum(line.credit_amount), 0)
      INTO v_line_count, v_line_debit, v_line_credit
      FROM public.journal_entry_lines line
      WHERE line.journal_entry_id = v_accrual.id;
      IF lower(COALESCE(v_accrual.status, '')) <> 'posted'
         OR v_line_count < 2
         OR abs(COALESCE(v_accrual.total_debit, 0) - v_gross) > 0.01
         OR abs(COALESCE(v_accrual.total_credit, 0) - v_gross) > 0.01
         OR abs(v_line_debit - v_gross) > 0.01
         OR abs(v_line_credit - v_gross) > 0.01
      THEN
        RAISE EXCEPTION 'Existing payroll accrual is not posted and balanced for the payroll gross amount' USING ERRCODE = 'P0001';
      END IF;
      PERFORM set_config('app.payroll_transition_v1', 'authorized', true);
      UPDATE public.payroll SET status = 'approved', journal_entry_id = v_accrual.id, updated_at = now()
      WHERE id = p_payroll_id AND company_id = p_company_id RETURNING * INTO v_payroll;
      RETURN v_payroll;
    END IF;

    SELECT account.id INTO v_expense_account_id
    FROM public.account_mappings mapping
    JOIN public.default_account_types account_type ON account_type.id = mapping.default_account_type_id
    JOIN public.chart_of_accounts account ON account.id = mapping.chart_of_accounts_id
    WHERE mapping.company_id = p_company_id AND mapping.is_active = true
      AND account_type.type_code = 'PAYROLL_EXPENSE'
      AND account.company_id = p_company_id AND account.is_active = true
      AND COALESCE(account.is_header, false) = false AND COALESCE(account.account_level, 0) >= 3
      AND lower(COALESCE(account.account_type, '')) IN ('expense', 'expenses')
      AND lower(COALESCE(account.balance_type, '')) = 'debit'
    ORDER BY mapping.id LIMIT 1;

    SELECT account.id INTO v_payable_account_id
    FROM public.account_mappings mapping
    JOIN public.default_account_types account_type ON account_type.id = mapping.default_account_type_id
    JOIN public.chart_of_accounts account ON account.id = mapping.chart_of_accounts_id
    WHERE mapping.company_id = p_company_id AND mapping.is_active = true
      AND account_type.type_code = 'PAYROLL_PAYABLE'
      AND account.company_id = p_company_id AND account.is_active = true
      AND COALESCE(account.is_header, false) = false AND COALESCE(account.account_level, 0) >= 3
      AND lower(COALESCE(account.account_type, '')) = 'liabilities'
      AND lower(COALESCE(account.balance_type, '')) = 'credit'
    ORDER BY mapping.id LIMIT 1;

    IF v_deductions > 0 THEN
      SELECT account.id INTO v_deduction_account_id
      FROM public.account_mappings mapping
      JOIN public.default_account_types account_type ON account_type.id = mapping.default_account_type_id
      JOIN public.chart_of_accounts account ON account.id = mapping.chart_of_accounts_id
      WHERE mapping.company_id = p_company_id AND mapping.is_active = true
        AND account_type.type_code = 'PAYROLL_DEDUCTION_PAYABLE'
        AND account.company_id = p_company_id AND account.is_active = true
        AND COALESCE(account.is_header, false) = false AND COALESCE(account.account_level, 0) >= 3
        AND lower(COALESCE(account.account_type, '')) = 'liabilities'
        AND lower(COALESCE(account.balance_type, '')) = 'credit'
      ORDER BY mapping.id LIMIT 1;
    END IF;

    IF v_tax > 0 THEN
      SELECT account.id INTO v_tax_account_id
      FROM public.account_mappings mapping
      JOIN public.default_account_types account_type ON account_type.id = mapping.default_account_type_id
      JOIN public.chart_of_accounts account ON account.id = mapping.chart_of_accounts_id
      WHERE mapping.company_id = p_company_id AND mapping.is_active = true
        AND account_type.type_code = 'PAYROLL_TAX_PAYABLE'
        AND account.company_id = p_company_id AND account.is_active = true
        AND COALESCE(account.is_header, false) = false AND COALESCE(account.account_level, 0) >= 3
        AND lower(COALESCE(account.account_type, '')) = 'liabilities'
        AND lower(COALESCE(account.balance_type, '')) = 'credit'
      ORDER BY mapping.id LIMIT 1;
    END IF;

    IF v_expense_account_id IS NULL OR v_payable_account_id IS NULL
       OR (v_deductions > 0 AND v_deduction_account_id IS NULL)
       OR (v_tax > 0 AND v_tax_account_id IS NULL)
    THEN
      RAISE EXCEPTION 'Required payroll account mappings are incomplete' USING ERRCODE = 'P0001';
    END IF;

    v_entry_date := v_payroll.payroll_date;
    IF public.system_agent_date_in_closed_period(p_company_id, v_entry_date) THEN
      RAISE EXCEPTION 'Payroll accrual is blocked by a closed accounting period' USING ERRCODE = 'P0001';
    END IF;
    v_entry_number := 'JE-PR-' || to_char(v_entry_date, 'YYYYMMDD') || '-' || left(v_journal_id::text, 8);
    INSERT INTO public.journal_entries (
      id, company_id, entry_number, entry_date, description, reference_type, reference_id,
      status, total_debit, total_credit, created_by, posted_by, posted_at
    ) VALUES (
      v_journal_id, p_company_id, v_entry_number, v_entry_date,
      'استحقاق راتب - ' || v_payroll.payroll_number, 'payroll', p_payroll_id,
      'posted', v_gross, v_gross, v_actor_id, v_actor_id, now()
    );
    INSERT INTO public.journal_entry_lines (
      journal_entry_id, account_id, employee_id, line_description, debit_amount, credit_amount, line_number
    ) VALUES (v_journal_id, v_expense_account_id, v_payroll.employee_id, 'مصروف راتب - ' || v_payroll.payroll_number, v_gross, 0, v_line_number);
    v_line_number := v_line_number + 1;
    IF v_net > 0 THEN
      INSERT INTO public.journal_entry_lines (journal_entry_id, account_id, employee_id, line_description, debit_amount, credit_amount, line_number)
      VALUES (v_journal_id, v_payable_account_id, v_payroll.employee_id, 'راتب مستحق - ' || v_payroll.payroll_number, 0, v_net, v_line_number);
      v_line_number := v_line_number + 1;
    END IF;
    IF v_deductions > 0 THEN
      INSERT INTO public.journal_entry_lines (journal_entry_id, account_id, employee_id, line_description, debit_amount, credit_amount, line_number)
      VALUES (v_journal_id, v_deduction_account_id, v_payroll.employee_id, 'استقطاعات راتب - ' || v_payroll.payroll_number, 0, v_deductions, v_line_number);
      v_line_number := v_line_number + 1;
    END IF;
    IF v_tax > 0 THEN
      INSERT INTO public.journal_entry_lines (journal_entry_id, account_id, employee_id, line_description, debit_amount, credit_amount, line_number)
      VALUES (v_journal_id, v_tax_account_id, v_payroll.employee_id, 'ضريبة راتب - ' || v_payroll.payroll_number, 0, v_tax, v_line_number);
    END IF;

    PERFORM set_config('app.payroll_transition_v1', 'authorized', true);
    UPDATE public.payroll SET status = 'approved', journal_entry_id = v_journal_id, updated_at = now()
    WHERE id = p_payroll_id AND company_id = p_company_id RETURNING * INTO v_payroll;
    RETURN v_payroll;
  END IF;

  SELECT entry.* INTO v_accrual FROM public.journal_entries entry
  WHERE entry.id = v_payroll.journal_entry_id AND entry.company_id = p_company_id
    AND entry.reference_type = 'payroll' AND entry.reference_id = p_payroll_id
  FOR UPDATE;
  IF v_accrual.id IS NULL OR lower(COALESCE(v_accrual.status, '')) <> 'posted' OR v_accrual.reversal_entry_id IS NOT NULL THEN
    RAISE EXCEPTION 'Payroll payment requires an active posted accrual journal' USING ERRCODE = 'P0001';
  END IF;

  IF v_net <= 0 THEN
    PERFORM set_config('app.payroll_transition_v1', 'authorized', true);
    UPDATE public.payroll SET status = 'paid', updated_at = now()
    WHERE id = p_payroll_id AND company_id = p_company_id RETURNING * INTO v_payroll;
    RETURN v_payroll;
  END IF;

  SELECT count(*) INTO v_active_count FROM public.journal_entries entry
  WHERE entry.company_id = p_company_id AND entry.reference_type = 'payroll_payment'
    AND entry.reference_id = p_payroll_id AND lower(COALESCE(entry.status, '')) <> 'reversed'
    AND entry.reversal_entry_id IS NULL;
  IF v_active_count > 1 THEN
    RAISE EXCEPTION 'Payroll has duplicate active payment journals that require review' USING ERRCODE = 'P0001';
  END IF;

  SELECT entry.* INTO v_existing_payment FROM public.journal_entries entry
  WHERE entry.company_id = p_company_id AND entry.reference_type = 'payroll_payment'
    AND entry.reference_id = p_payroll_id AND lower(COALESCE(entry.status, '')) <> 'reversed'
    AND entry.reversal_entry_id IS NULL
  ORDER BY entry.created_at LIMIT 1 FOR UPDATE;
  IF v_existing_payment.id IS NOT NULL THEN
    SELECT count(*), COALESCE(sum(line.debit_amount), 0), COALESCE(sum(line.credit_amount), 0)
    INTO v_line_count, v_line_debit, v_line_credit
    FROM public.journal_entry_lines line
    WHERE line.journal_entry_id = v_existing_payment.id;
    IF lower(COALESCE(v_existing_payment.status, '')) <> 'posted'
       OR v_line_count < 2
       OR abs(COALESCE(v_existing_payment.total_debit, 0) - v_net) > 0.01
       OR abs(COALESCE(v_existing_payment.total_credit, 0) - v_net) > 0.01
       OR abs(v_line_debit - v_net) > 0.01
       OR abs(v_line_credit - v_net) > 0.01
    THEN
      RAISE EXCEPTION 'Existing payroll payment is not posted and balanced for the payroll net amount' USING ERRCODE = 'P0001';
    END IF;
    RETURN v_payroll;
  END IF;

  SELECT account.id INTO v_payable_account_id
  FROM public.account_mappings mapping
  JOIN public.default_account_types account_type ON account_type.id = mapping.default_account_type_id
  JOIN public.chart_of_accounts account ON account.id = mapping.chart_of_accounts_id
  WHERE mapping.company_id = p_company_id AND mapping.is_active = true
    AND account_type.type_code = 'PAYROLL_PAYABLE'
    AND account.company_id = p_company_id AND account.is_active = true
    AND COALESCE(account.is_header, false) = false AND COALESCE(account.account_level, 0) >= 3
    AND lower(COALESCE(account.account_type, '')) = 'liabilities'
    AND lower(COALESCE(account.balance_type, '')) = 'credit'
  ORDER BY mapping.id LIMIT 1;
  v_cash_type := CASE WHEN lower(COALESCE(v_payroll.payment_method, '')) = 'cash' THEN 'CASH' ELSE 'BANK' END;
  SELECT account.id INTO v_cash_account_id
  FROM public.account_mappings mapping
  JOIN public.default_account_types account_type ON account_type.id = mapping.default_account_type_id
  JOIN public.chart_of_accounts account ON account.id = mapping.chart_of_accounts_id
  WHERE mapping.company_id = p_company_id AND mapping.is_active = true
    AND account_type.type_code = v_cash_type
    AND account.company_id = p_company_id AND account.is_active = true
    AND COALESCE(account.is_header, false) = false AND COALESCE(account.account_level, 0) >= 3
    AND lower(COALESCE(account.account_type, '')) = 'assets'
    AND lower(COALESCE(account.balance_type, '')) = 'debit'
  ORDER BY mapping.id LIMIT 1;
  IF v_payable_account_id IS NULL OR v_cash_account_id IS NULL THEN
    RAISE EXCEPTION 'Payroll payable and cash/bank mappings are required for payment' USING ERRCODE = 'P0001';
  END IF;

  v_entry_date := CURRENT_DATE;
  IF public.system_agent_date_in_closed_period(p_company_id, v_entry_date) THEN
    RAISE EXCEPTION 'Payroll payment is blocked by a closed accounting period' USING ERRCODE = 'P0001';
  END IF;
  v_entry_number := 'JE-PRP-' || to_char(v_entry_date, 'YYYYMMDD') || '-' || left(v_journal_id::text, 8);
  INSERT INTO public.journal_entries (
    id, company_id, entry_number, entry_date, description, reference_type, reference_id,
    status, total_debit, total_credit, created_by, posted_by, posted_at
  ) VALUES (
    v_journal_id, p_company_id, v_entry_number, v_entry_date,
    'سداد راتب - ' || v_payroll.payroll_number, 'payroll_payment', p_payroll_id,
    'posted', v_net, v_net, v_actor_id, v_actor_id, now()
  );
  INSERT INTO public.journal_entry_lines (
    journal_entry_id, account_id, employee_id, line_description, debit_amount, credit_amount, line_number
  ) VALUES
    (v_journal_id, v_payable_account_id, v_payroll.employee_id, 'تسوية راتب مستحق - ' || v_payroll.payroll_number, v_net, 0, 1),
    (v_journal_id, v_cash_account_id, v_payroll.employee_id, 'سداد راتب - ' || v_payroll.payroll_number, 0, v_net, 2);

  PERFORM set_config('app.payroll_transition_v1', 'authorized', true);
  UPDATE public.payroll SET status = 'paid', updated_at = now()
  WHERE id = p_payroll_id AND company_id = p_company_id RETURNING * INTO v_payroll;
  RETURN v_payroll;
END;
$$;
REVOKE ALL ON FUNCTION public.transition_payroll_status_v1(uuid, uuid, text, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transition_payroll_status_v1(uuid, uuid, text, uuid)
  TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.create_payroll_journal_entry(uuid) FROM anon, authenticated;
