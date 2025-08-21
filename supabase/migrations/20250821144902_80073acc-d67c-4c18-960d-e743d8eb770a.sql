-- Delete all accounts for Al-Araf company and reapply the complete template
DELETE FROM chart_of_accounts 
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4';

-- Apply the complete template with all levels
SELECT public.copy_default_accounts_to_company('24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid);

-- Verify results
SELECT 
  'تم تطبيق قالب تأجير السيارات بنجاح!' as message,
  COUNT(*) as total_accounts
FROM chart_of_accounts 
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
AND is_active = true;

-- Show detailed breakdown
SELECT 
  account_level,
  COUNT(*) as count_per_level,
  CASE 
    WHEN account_level = 1 THEN 'المستوى الأول - الجذر'
    WHEN account_level = 2 THEN 'المستوى الثاني - الفئات'
    WHEN account_level = 3 THEN 'المستوى الثالث - الفئات الفرعية' 
    WHEN account_level = 4 THEN 'المستوى الرابع - المجموعات'
    WHEN account_level = 5 THEN 'المستوى الخامس - الحسابات'
    WHEN account_level = 6 THEN 'المستوى السادس - التفصيلية ✅'
    ELSE 'أخرى'
  END as description
FROM chart_of_accounts 
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
AND is_active = true
GROUP BY account_level 
ORDER BY account_level;