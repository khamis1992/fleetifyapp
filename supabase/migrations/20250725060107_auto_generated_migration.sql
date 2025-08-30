-- Fix account_type mismatch between chart_of_accounts and default_chart_of_accounts

-- First, drop the existing check constraint
ALTER TABLE public.chart_of_accounts DROP CONSTRAINT IF EXISTS chart_of_accounts_account_type_check;

-- Update existing records to use plural forms to match default_chart_of_accounts
UPDATE public.chart_of_accounts 
SET account_type = CASE 
    WHEN account_type = 'asset' THEN 'assets'
    WHEN account_type = 'liability' THEN 'liabilities'
    WHEN account_type = 'expense' THEN 'expenses'
    WHEN account_type = 'equity' THEN 'equity'
    WHEN account_type = 'revenue' THEN 'revenue'
    ELSE account_type
END
WHERE account_type IN ('asset', 'liability', 'expense');

-- Create new check constraint with plural forms (matching default_chart_of_accounts)
ALTER TABLE public.chart_of_accounts 
ADD CONSTRAINT chart_of_accounts_account_type_check 
CHECK (account_type IN ('assets', 'liabilities', 'equity', 'revenue', 'expenses'));