-- Complete cleanup and template application for Al-Araf company

-- Step 1: Complete cleanup - remove ALL accounts for this company
DELETE FROM chart_of_accounts 
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4';

-- Step 2: Apply the complete template including all Level 6 accounts
SELECT public.copy_default_accounts_to_company('24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid);

-- Step 3: Final verification and results
SELECT 
  'SUCCESS: Al-Araf Car Rental Company - Complete Template Applied' as message,
  COUNT(*) as total_accounts
FROM chart_of_accounts 
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
AND is_active = true;

-- Step 4: Show detailed breakdown by level
SELECT 
  account_level,
  COUNT(*) as count_per_level,
  CASE 
    WHEN account_level = 1 THEN 'Root Accounts'
    WHEN account_level = 2 THEN 'Main Categories'
    WHEN account_level = 3 THEN 'Sub-Categories' 
    WHEN account_level = 4 THEN 'Account Groups'
    WHEN account_level = 5 THEN 'Individual Accounts'
    WHEN account_level = 6 THEN 'Detailed Individual Accounts ✅'
    ELSE 'Other'
  END as description
FROM chart_of_accounts 
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
AND is_active = true
GROUP BY account_level 
ORDER BY account_level;

-- Step 5: Verify specific Level 6 accounts are present
SELECT 
  'Level 6 Verification:' as check_type,
  COUNT(*) FILTER (WHERE account_code LIKE '112101%') as ahmed_customer_accounts,
  COUNT(*) FILTER (WHERE account_code LIKE '115101%') as toyota_vehicle_accounts,
  COUNT(*) FILTER (WHERE account_code LIKE '217101%') as dealer_supplier_accounts,
  COUNT(*) as total_level_6_accounts
FROM chart_of_accounts 
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
AND account_level = 6
AND is_active = true;