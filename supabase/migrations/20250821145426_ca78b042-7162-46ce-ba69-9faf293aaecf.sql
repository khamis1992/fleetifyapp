-- Use the enhanced deletion function to completely clear accounts
SELECT public.direct_delete_all_accounts('24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid, true);

-- Now apply the complete template
SELECT public.copy_default_accounts_to_company('24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid);

-- Final verification
SELECT 
  '🎯 تم تطبيق قالب تأجير السيارات الكامل مع 247 حساب!' as final_message,
  COUNT(*) as total_accounts,
  MAX(account_level) as max_level
FROM chart_of_accounts 
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
AND is_active = true;