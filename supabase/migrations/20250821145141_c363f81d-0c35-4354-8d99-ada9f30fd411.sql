-- Fix ALL remaining incorrect account types
UPDATE default_chart_of_accounts 
SET account_type = 'assets'
WHERE account_type = 'asset';

UPDATE default_chart_of_accounts 
SET account_type = 'liabilities' 
WHERE account_type = 'liability';

-- Verify no invalid types remain
SELECT 
  'Fixed account types' as action,
  COUNT(*) as invalid_types_remaining
FROM default_chart_of_accounts 
WHERE account_type NOT IN ('assets', 'liabilities', 'equity', 'revenue', 'expenses');

-- Now apply template successfully
SELECT public.copy_default_accounts_to_company('24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid);

-- Show success message
SELECT 
  '✅ تم تطبيق قالب تأجير السيارات بالكامل!' as status,
  COUNT(*) as total_accounts
FROM chart_of_accounts 
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4';