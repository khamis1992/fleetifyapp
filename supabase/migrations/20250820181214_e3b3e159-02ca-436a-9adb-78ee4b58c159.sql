-- Step 1: Update all tables with nullable foreign keys to NULL
UPDATE public.account_deletion_log SET transfer_to_account_id = NULL WHERE transfer_to_account_id IN (SELECT id FROM public.chart_of_accounts WHERE is_active = false);
UPDATE public.contracts SET account_id = NULL WHERE account_id IN (SELECT id FROM public.chart_of_accounts WHERE is_active = false);
UPDATE public.fixed_assets SET asset_account_id = NULL, depreciation_account_id = NULL WHERE asset_account_id IN (SELECT id FROM public.chart_of_accounts WHERE is_active = false) OR depreciation_account_id IN (SELECT id FROM public.chart_of_accounts WHERE is_active = false);
UPDATE public.contract_templates SET account_id = NULL WHERE account_id IN (SELECT id FROM public.chart_of_accounts WHERE is_active = false);
UPDATE public.invoice_items SET account_id = NULL WHERE account_id IN (SELECT id FROM public.chart_of_accounts WHERE is_active = false);
UPDATE public.payments SET account_id = NULL WHERE account_id IN (SELECT id FROM public.chart_of_accounts WHERE is_active = false);

-- Step 2: Delete records from tables that require accounts
DELETE FROM public.account_mappings WHERE chart_of_accounts_id IN (SELECT id FROM public.chart_of_accounts WHERE is_active = false);
DELETE FROM public.budget_items WHERE account_id IN (SELECT id FROM public.chart_of_accounts WHERE is_active = false);
DELETE FROM public.essential_account_mappings WHERE account_id IN (SELECT id FROM public.chart_of_accounts WHERE is_active = false);
DELETE FROM public.journal_entry_lines WHERE account_id IN (SELECT id FROM public.chart_of_accounts WHERE is_active = false);
DELETE FROM public.vendor_accounts WHERE account_id IN (SELECT id FROM public.chart_of_accounts WHERE is_active = false);
DELETE FROM public.legal_case_account_mappings WHERE 
    client_retainer_liability_account_id IN (SELECT id FROM public.chart_of_accounts WHERE is_active = false) OR
    consultation_revenue_account_id IN (SELECT id FROM public.chart_of_accounts WHERE is_active = false) OR
    court_fees_expense_account_id IN (SELECT id FROM public.chart_of_accounts WHERE is_active = false) OR
    expert_witness_expense_account_id IN (SELECT id FROM public.chart_of_accounts WHERE is_active = false) OR
    legal_expenses_account_id IN (SELECT id FROM public.chart_of_accounts WHERE is_active = false) OR
    legal_fees_receivable_account_id IN (SELECT id FROM public.chart_of_accounts WHERE is_active = false) OR
    legal_fees_revenue_account_id IN (SELECT id FROM public.chart_of_accounts WHERE is_active = false) OR
    legal_research_expense_account_id IN (SELECT id FROM public.chart_of_accounts WHERE is_active = false) OR
    settlements_expense_account_id IN (SELECT id FROM public.chart_of_accounts WHERE is_active = false) OR
    settlements_payable_account_id IN (SELECT id FROM public.chart_of_accounts WHERE is_active = false);

-- Step 3: Update maintenance account mappings
UPDATE public.maintenance_account_mappings SET 
    asset_account_id = NULL, 
    expense_account_id = NULL 
WHERE asset_account_id IN (SELECT id FROM public.chart_of_accounts WHERE is_active = false) 
   OR expense_account_id IN (SELECT id FROM public.chart_of_accounts WHERE is_active = false);

-- Step 4: Finally, delete all inactive accounts
DELETE FROM public.chart_of_accounts WHERE is_active = false;