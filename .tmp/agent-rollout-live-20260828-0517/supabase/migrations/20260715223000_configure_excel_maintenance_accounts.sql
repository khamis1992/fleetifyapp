DO $$
DECLARE
  v_company_id constant uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_expense_parent_id uuid;
  v_payable_parent_id uuid;
  v_expense_account_id uuid;
  v_payable_account_id uuid;
  v_expense_type_id uuid;
  v_payable_type_id uuid;
BEGIN
  SELECT id INTO v_expense_parent_id
  FROM public.chart_of_accounts
  WHERE company_id = v_company_id
    AND account_code = '5111'
    AND is_active = true
    AND is_header = true;

  SELECT id INTO v_payable_parent_id
  FROM public.chart_of_accounts
  WHERE company_id = v_company_id
    AND account_code = '2114'
    AND is_active = true
    AND is_header = true;

  IF v_expense_parent_id IS NULL OR v_payable_parent_id IS NULL THEN
    RAISE EXCEPTION 'Required maintenance expense or payable parent account is missing'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.chart_of_accounts (
    company_id, account_code, account_name, account_name_ar,
    account_type, balance_type, account_level, parent_account_code,
    parent_account_id, is_header, is_active, is_system, is_default,
    description
  ) VALUES (
    v_company_id, '51111', 'Historical Vehicle Maintenance Expense',
    'مصروف صيانة المركبات التاريخي', 'expenses', 'debit', 5, '5111',
    v_expense_parent_id, false, true, true, true,
    'Posting account for explicit historical maintenance imported from approved Excel files.'
  ) ON CONFLICT (company_id, account_code) DO NOTHING;

  INSERT INTO public.chart_of_accounts (
    company_id, account_code, account_name, account_name_ar,
    account_type, balance_type, account_level, parent_account_code,
    parent_account_id, is_header, is_active, is_system, is_default,
    description
  ) VALUES (
    v_company_id, '21141', 'Unspecified Maintenance Payables',
    'ذمم صيانة غير محددة', 'liabilities', 'credit', 5, '2114',
    v_payable_parent_id, false, true, true, true,
    'Credit account for historical maintenance whose original settlement method is unknown.'
  ) ON CONFLICT (company_id, account_code) DO NOTHING;

  SELECT id INTO v_expense_account_id
  FROM public.chart_of_accounts
  WHERE company_id = v_company_id
    AND account_code = '51111'
    AND is_active = true
    AND is_header = false
    AND account_level >= 3
    AND lower(account_type) IN ('expense', 'expenses')
    AND lower(balance_type) = 'debit';

  SELECT id INTO v_payable_account_id
  FROM public.chart_of_accounts
  WHERE company_id = v_company_id
    AND account_code = '21141'
    AND is_active = true
    AND is_header = false
    AND account_level >= 3
    AND lower(account_type) = 'liabilities'
    AND lower(balance_type) = 'credit';

  IF v_expense_account_id IS NULL OR v_payable_account_id IS NULL THEN
    RAISE EXCEPTION 'Maintenance posting accounts are not valid posting accounts'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT id INTO v_expense_type_id
  FROM public.default_account_types
  WHERE type_code IN ('MAINTENANCE_EXPENSES', 'MAINTENANCE_EXPENSE')
  ORDER BY CASE type_code WHEN 'MAINTENANCE_EXPENSES' THEN 1 ELSE 2 END
  LIMIT 1;

  SELECT id INTO v_payable_type_id
  FROM public.default_account_types
  WHERE type_code = 'PAYABLES'
  LIMIT 1;

  IF v_expense_type_id IS NULL OR v_payable_type_id IS NULL THEN
    RAISE EXCEPTION 'Required default maintenance or payable account type is missing'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.account_mappings
  SET chart_of_accounts_id = v_expense_account_id,
      is_active = true,
      updated_at = now()
  WHERE company_id = v_company_id
    AND default_account_type_id = v_expense_type_id;
  IF NOT FOUND THEN
    INSERT INTO public.account_mappings (
      company_id, default_account_type_id, chart_of_accounts_id, is_active
    ) VALUES (
      v_company_id, v_expense_type_id, v_expense_account_id, true
    );
  END IF;

  UPDATE public.account_mappings
  SET chart_of_accounts_id = v_payable_account_id,
      is_active = true,
      updated_at = now()
  WHERE company_id = v_company_id
    AND default_account_type_id = v_payable_type_id;
  IF NOT FOUND THEN
    INSERT INTO public.account_mappings (
      company_id, default_account_type_id, chart_of_accounts_id, is_active
    ) VALUES (
      v_company_id, v_payable_type_id, v_payable_account_id, true
    );
  END IF;

  UPDATE public.maintenance_account_mappings
  SET expense_account_id = v_expense_account_id,
      is_active = true,
      description = 'Historical maintenance imported from approved Excel files.',
      updated_at = now()
  WHERE company_id = v_company_id
    AND maintenance_type = 'historical_excel_import';
  IF NOT FOUND THEN
    INSERT INTO public.maintenance_account_mappings (
      company_id, maintenance_type, expense_account_id, is_active, description
    ) VALUES (
      v_company_id, 'historical_excel_import', v_expense_account_id, true,
      'Historical maintenance imported from approved Excel files.'
    );
  END IF;
END;
$$;
