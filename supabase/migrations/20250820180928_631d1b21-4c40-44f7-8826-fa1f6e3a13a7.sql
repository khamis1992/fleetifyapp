-- Delete all inactive accounts from chart_of_accounts
DELETE FROM public.chart_of_accounts 
WHERE is_active = false;

-- Also delete any related account mappings for inactive accounts
DELETE FROM public.account_mappings 
WHERE chart_of_accounts_id NOT IN (
    SELECT id FROM public.chart_of_accounts WHERE is_active = true
);