-- First, delete budget items that reference inactive accounts
DELETE FROM public.budget_items 
WHERE account_id IN (
    SELECT id FROM public.chart_of_accounts WHERE is_active = false
);

-- Delete any account mappings for inactive accounts
DELETE FROM public.account_mappings 
WHERE chart_of_accounts_id IN (
    SELECT id FROM public.chart_of_accounts WHERE is_active = false
);

-- Finally, delete all inactive accounts from chart_of_accounts
DELETE FROM public.chart_of_accounts 
WHERE is_active = false;