-- Check constraint properly and fix all asset/liability values
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conname = 'chart_of_accounts_account_type_check';

-- Fix ALL account type values that don't match the constraint
UPDATE default_chart_of_accounts 
SET account_type = 'assets'
WHERE account_type = 'asset';

UPDATE default_chart_of_accounts 
SET account_type = 'liabilities'
WHERE account_type = 'liability';

-- Verify all types are now valid
SELECT DISTINCT account_type, COUNT(*) as count
FROM default_chart_of_accounts 
GROUP BY account_type
ORDER BY account_type;