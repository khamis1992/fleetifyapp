-- Delete all related data that references inactive accounts completely
DELETE FROM public.account_mappings WHERE chart_of_accounts_id IN (SELECT id FROM public.chart_of_accounts WHERE is_active = false);
DELETE FROM public.budget_items WHERE account_id IN (SELECT id FROM public.chart_of_accounts WHERE is_active = false);
DELETE FROM public.essential_account_mappings WHERE account_id IN (SELECT id FROM public.chart_of_accounts WHERE is_active = false);
DELETE FROM public.vendor_accounts WHERE account_id IN (SELECT id FROM public.chart_of_accounts WHERE is_active = false);

-- Delete journal entries that have lines with inactive accounts
DELETE FROM public.journal_entries 
WHERE id IN (
    SELECT DISTINCT journal_entry_id 
    FROM public.journal_entry_lines 
    WHERE account_id IN (SELECT id FROM public.chart_of_accounts WHERE is_active = false)
);

-- Delete legal case account mappings
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

-- Update tables where foreign key can be NULL
UPDATE public.account_deletion_log SET transfer_to_account_id = NULL WHERE transfer_to_account_id IN (SELECT id FROM public.chart_of_accounts WHERE is_active = false);
UPDATE public.contracts SET account_id = NULL WHERE account_id IN (SELECT id FROM public.chart_of_accounts WHERE is_active = false);
UPDATE public.fixed_assets SET asset_account_id = NULL, depreciation_account_id = NULL WHERE asset_account_id IN (SELECT id FROM public.chart_of_accounts WHERE is_active = false) OR depreciation_account_id IN (SELECT id FROM public.chart_of_accounts WHERE is_active = false);
UPDATE public.contract_templates SET account_id = NULL WHERE account_id IN (SELECT id FROM public.chart_of_accounts WHERE is_active = false);
UPDATE public.invoice_items SET account_id = NULL WHERE account_id IN (SELECT id FROM public.chart_of_accounts WHERE is_active = false);
UPDATE public.payments SET account_id = NULL WHERE account_id IN (SELECT id FROM public.chart_of_accounts WHERE is_active = false);
UPDATE public.maintenance_account_mappings SET 
    asset_account_id = NULL, 
    expense_account_id = NULL 
WHERE asset_account_id IN (SELECT id FROM public.chart_of_accounts WHERE is_active = false) 
   OR expense_account_id IN (SELECT id FROM public.chart_of_accounts WHERE is_active = false);

-- Finally, delete all inactive accounts
DELETE FROM public.chart_of_accounts WHERE is_active = false;