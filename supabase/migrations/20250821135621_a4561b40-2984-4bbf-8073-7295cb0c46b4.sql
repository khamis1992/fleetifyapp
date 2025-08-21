-- Clean up Al-Araf company and apply the complete car rental template with Level 6 accounts

-- Step 1: Clean up the existing partial data
SELECT public.reset_company_chart_for_complete_template(
  '24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid,
  'car_rental'
);

-- Step 2: Apply the complete template including all Level 6 accounts
SELECT public.copy_default_accounts_to_company('24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid);

-- Step 3: Show the final results
SELECT 
  'Final Results: Al-Araf Car Rental Company Chart of Accounts' as summary;
  
SELECT 
  account_level,
  COUNT(*) as count_per_level,
  COUNT(*) FILTER (WHERE account_code LIKE '112%') as customer_accounts,
  COUNT(*) FILTER (WHERE account_code LIKE '115%') as vehicle_accounts,
  COUNT(*) FILTER (WHERE account_code LIKE '217%') as supplier_accounts
FROM chart_of_accounts 
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
AND is_active = true
GROUP BY account_level 
ORDER BY account_level;