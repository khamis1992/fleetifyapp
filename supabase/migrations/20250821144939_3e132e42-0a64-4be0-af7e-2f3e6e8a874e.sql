-- Fix account types in default template to match constraint
UPDATE default_chart_of_accounts 
SET account_type = 'assets'
WHERE account_type = 'asset';

UPDATE default_chart_of_accounts 
SET account_type = 'liabilities' 
WHERE account_type = 'liability';

UPDATE default_chart_of_accounts 
SET account_type = 'equity'
WHERE account_type = 'owners_equity';

-- Now apply template for Al-Araf company
SELECT public.copy_default_accounts_to_company('24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid);

-- Verify success
SELECT 
  '✅ تم تطبيق قالب تأجير السيارات بنجاح!' as status,
  COUNT(*) as total_accounts
FROM chart_of_accounts 
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4';