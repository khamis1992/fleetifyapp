-- Delete all data that references inactive accounts
-- Delete budget items
DELETE FROM public.budget_items 
WHERE account_id IN (
    SELECT id FROM public.chart_of_accounts WHERE is_active = false
);

-- Delete account mappings
DELETE FROM public.account_mappings 
WHERE chart_of_accounts_id IN (
    SELECT id FROM public.chart_of_accounts WHERE is_active = false
);

-- Update fixed assets to remove references to inactive accounts
UPDATE public.fixed_assets 
SET asset_account_id = NULL 
WHERE asset_account_id IN (
    SELECT id FROM public.chart_of_accounts WHERE is_active = false
);

-- Update customers to remove references to inactive accounts
UPDATE public.customers 
SET account_id = NULL 
WHERE account_id IN (
    SELECT id FROM public.chart_of_accounts WHERE is_active = false
);

-- Update contracts to remove references to inactive accounts
UPDATE public.contracts 
SET account_id = NULL 
WHERE account_id IN (
    SELECT id FROM public.chart_of_accounts WHERE is_active = false
);

-- Update invoices to remove references to inactive accounts
UPDATE public.invoices 
SET account_id = NULL 
WHERE account_id IN (
    SELECT id FROM public.chart_of_accounts WHERE is_active = false
);

-- Update payments to remove references to inactive accounts
UPDATE public.payments 
SET account_id = NULL 
WHERE account_id IN (
    SELECT id FROM public.chart_of_accounts WHERE is_active = false
);

-- Finally, delete all inactive accounts
DELETE FROM public.chart_of_accounts 
WHERE is_active = false;