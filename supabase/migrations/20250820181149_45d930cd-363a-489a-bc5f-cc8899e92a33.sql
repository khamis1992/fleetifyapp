-- Delete journal entry lines that reference inactive accounts
DELETE FROM public.journal_entry_lines 
WHERE account_id IN (
    SELECT id FROM public.chart_of_accounts WHERE is_active = false
);

-- Delete budget items that reference inactive accounts
DELETE FROM public.budget_items 
WHERE account_id IN (
    SELECT id FROM public.chart_of_accounts WHERE is_active = false
);

-- Delete any account mappings for inactive accounts  
DELETE FROM public.account_mappings 
WHERE chart_of_accounts_id IN (
    SELECT id FROM public.chart_of_accounts WHERE is_active = false
);

-- Update fixed assets to remove references to inactive accounts
UPDATE public.fixed_assets 
SET 
    asset_account_id = NULL,
    depreciation_account_id = NULL
WHERE asset_account_id IN (
    SELECT id FROM public.chart_of_accounts WHERE is_active = false
) OR depreciation_account_id IN (
    SELECT id FROM public.chart_of_accounts WHERE is_active = false
);

-- Finally, delete all inactive accounts
DELETE FROM public.chart_of_accounts 
WHERE is_active = false;