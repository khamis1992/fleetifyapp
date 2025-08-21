-- Apply the template now that all account types are corrected
SELECT public.copy_default_accounts_to_company('24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid);

-- Show final success verification
SELECT 
  '🎉 تم تطبيق قالب تأجير السيارات بالكامل بنجاح!' as message,
  COUNT(*) as total_accounts,
  MAX(account_level) as max_level_included
FROM chart_of_accounts 
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
AND is_active = true;

-- Show breakdown by level
SELECT 
  account_level,
  COUNT(*) as accounts_per_level,
  CASE 
    WHEN account_level = 1 THEN 'المستوى الأول - الجذر'
    WHEN account_level = 2 THEN 'المستوى الثاني - الفئات'
    WHEN account_level = 3 THEN 'المستوى الثالث - الفئات الفرعية' 
    WHEN account_level = 4 THEN 'المستوى الرابع - المجموعات'
    WHEN account_level = 5 THEN 'المستوى الخامس - الحسابات'
    WHEN account_level = 6 THEN 'المستوى السادس - التفصيلية ✅'
    ELSE 'أخرى'
  END as level_description
FROM chart_of_accounts 
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
AND is_active = true
GROUP BY account_level 
ORDER BY account_level;