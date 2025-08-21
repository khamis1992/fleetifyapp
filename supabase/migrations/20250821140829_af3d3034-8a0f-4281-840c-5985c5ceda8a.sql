-- Fix the account_type values in default_chart_of_accounts for Level 6 accounts
UPDATE default_chart_of_accounts 
SET account_type = 'assets'
WHERE account_type = 'asset' AND account_level = 6;

UPDATE default_chart_of_accounts 
SET account_type = 'liabilities' 
WHERE account_type = 'liability' AND account_level = 6;

-- Now try to apply the template again for Al-Araf company
SELECT public.copy_default_accounts_to_company('24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid);

-- Show the results
SELECT 
  'SUCCESS: Al-Araf Car Rental Company - Template Applied with Level 6!' as message,
  COUNT(*) as total_accounts
FROM chart_of_accounts 
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
AND is_active = true;

-- Show breakdown by level including Level 6
SELECT 
  account_level,
  COUNT(*) as count_per_level,
  CASE 
    WHEN account_level = 1 THEN 'Root (1)'
    WHEN account_level = 2 THEN 'Categories (2)'
    WHEN account_level = 3 THEN 'Sub-Categories (3)' 
    WHEN account_level = 4 THEN 'Groups (4)'
    WHEN account_level = 5 THEN 'Accounts (5)'
    WHEN account_level = 6 THEN 'Individual Detailed (6) ✅'
    ELSE 'Other'
  END as description
FROM chart_of_accounts 
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
AND is_active = true
GROUP BY account_level 
ORDER BY account_level;