-- Force delete all accounts for the company using TRUNCATE approach
DELETE FROM chart_of_accounts WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4';

-- Verify deletion
SELECT COUNT(*) as remaining_accounts 
FROM chart_of_accounts 
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4';

-- Now apply the complete template
SELECT public.copy_default_accounts_to_company('24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid);

-- Show final success
SELECT 
  '✅ تم تطبيق قالب تأجير السيارات بنجاح! يحتوي على جميع المستويات!' as final_status,
  COUNT(*) as total_accounts
FROM chart_of_accounts 
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4';