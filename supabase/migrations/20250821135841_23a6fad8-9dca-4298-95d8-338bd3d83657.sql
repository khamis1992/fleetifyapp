-- Fix the cleanup issue and apply the complete template

-- Step 1: Direct cleanup of Al-Araf company accounts
DELETE FROM chart_of_accounts 
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
AND is_system = false; -- Keep only system accounts

-- Step 2: Now apply the complete template including all Level 6 accounts
SELECT public.copy_default_accounts_to_company('24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid);

-- Step 3: Show the final results
SELECT 
  'SUCCESS: Al-Araf Car Rental Company - Complete Template Applied' as message,
  'Total accounts: ' || COUNT(*) as total_count
FROM chart_of_accounts 
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
AND is_active = true;

-- Step 4: Show breakdown by level
SELECT 
  account_level,
  COUNT(*) as count_per_level,
  'Level ' || account_level || ': ' || COUNT(*) || ' accounts' as description
FROM chart_of_accounts 
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
AND is_active = true
GROUP BY account_level 
ORDER BY account_level;

-- Step 5: Verify Level 6 accounts are included
SELECT 
  'Level 6 Individual Accounts:' as category,
  COUNT(*) FILTER (WHERE account_code LIKE '112101%') as customer_accounts_ahmed,
  COUNT(*) FILTER (WHERE account_code LIKE '115101%') as vehicle_accounts_toyota,
  COUNT(*) FILTER (WHERE account_code LIKE '217101%') as supplier_accounts_dealers
FROM chart_of_accounts 
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
AND account_level = 6
AND is_active = true;