DO $$
DECLARE
  v_company_id constant uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_expense_account_id uuid;
  v_payable_account_id uuid;
BEGIN
  SELECT id INTO v_expense_account_id
  FROM public.chart_of_accounts
  WHERE company_id = v_company_id AND account_code = '51111';

  SELECT id INTO v_payable_account_id
  FROM public.chart_of_accounts
  WHERE company_id = v_company_id AND account_code = '21141';

  DELETE FROM public.maintenance_account_mappings
  WHERE company_id = v_company_id
    AND maintenance_type = 'historical_excel_import'
    AND expense_account_id = v_expense_account_id;

  DELETE FROM public.account_mappings
  WHERE company_id = v_company_id
    AND chart_of_accounts_id IN (v_expense_account_id, v_payable_account_id);

  DELETE FROM public.chart_of_accounts account
  WHERE account.company_id = v_company_id
    AND account.id IN (v_expense_account_id, v_payable_account_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.journal_entry_lines line WHERE line.account_id = account.id
    );
END;
$$;
