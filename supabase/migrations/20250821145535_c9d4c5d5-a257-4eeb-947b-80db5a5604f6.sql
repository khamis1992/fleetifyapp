-- Check current constraint values
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'account_type_enum')
ORDER BY enumsortorder;

-- Check what valid values the constraint expects
SELECT conname, consrc 
FROM pg_constraint 
WHERE conname = 'chart_of_accounts_account_type_check';

-- Fix the specific failing row first
UPDATE default_chart_of_accounts 
SET account_type = 'assets'
WHERE account_code = '112101001' AND account_type = 'asset';

-- Update ALL remaining asset/liability entries
UPDATE default_chart_of_accounts 
SET account_type = CASE 
  WHEN account_type = 'asset' THEN 'assets'
  WHEN account_type = 'liability' THEN 'liabilities'
  ELSE account_type
END
WHERE account_type IN ('asset', 'liability');