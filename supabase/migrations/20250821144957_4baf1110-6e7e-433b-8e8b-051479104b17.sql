-- Delete all existing accounts for Al-Araf company
DELETE FROM chart_of_accounts 
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4';

-- Apply the complete template
SELECT public.copy_default_accounts_to_company('24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid);

-- Show final results
SELECT 
  '🎉 تم تطبيق قالب تأجير السيارات الكامل بنجاح!' as message,
  COUNT(*) as total_accounts
FROM chart_of_accounts 
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
AND is_active = true;