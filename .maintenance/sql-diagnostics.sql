-- 🔍 استعلامات تشخيصية للتحقق من التناقضات المحاسبية
-- شركة العراف: 24bc0b21-4e2d-4413-9842-31719a3669f4

-- ========================================
-- 1. فحص حسابات الإيرادات (4xxxx)
-- ========================================
SELECT 
    account_code,
    account_name,
    account_type,
    balance_type,
    current_balance,
    is_header,
    account_level
FROM chart_of_accounts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND account_code LIKE '4%'
    AND is_active = true
ORDER BY account_code;

-- ========================================
-- 2. إجمالي الإيرادات من دليل الحسابات
-- ========================================
SELECT 
    account_type,
    COUNT(*) as عدد_الحسابات,
    SUM(current_balance) as الرصيد_الإجمالي,
    SUM(CASE WHEN is_header = false AND account_level >= 3 THEN current_balance ELSE 0 END) as رصيد_الحسابات_القابلة_للقيد
FROM chart_of_accounts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND account_code LIKE '4%'
    AND is_active = true
GROUP BY account_type;

-- ========================================
-- 3. فحص القيود المحاسبية للإيرادات
-- ========================================
SELECT 
    je.id,
    je.entry_number,
    je.entry_date,
    je.description,
    je.total_debit,
    je.total_credit,
    je.status,
    COUNT(jel.id) as عدد_السطور
FROM journal_entries je
LEFT JOIN journal_entry_lines jel ON je.id = jel.journal_entry_id
WHERE je.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND je.status = 'posted'
GROUP BY je.id
ORDER BY je.entry_date DESC
LIMIT 10;

-- ========================================
-- 4. فحص سطور القيود التي تؤثر على حسابات الإيرادات
-- ========================================
SELECT 
    coa.account_code,
    coa.account_name,
    coa.account_type,
    SUM(jel.credit_amount - jel.debit_amount) as صافي_الحركة,
    COUNT(*) as عدد_القيود
FROM journal_entry_lines jel
INNER JOIN chart_of_accounts coa ON jel.account_code = coa.account_code
INNER JOIN journal_entries je ON jel.journal_entry_id = je.id
WHERE je.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND coa.account_code LIKE '4%'
    AND je.status = 'posted'
GROUP BY coa.account_code, coa.account_name, coa.account_type
ORDER BY coa.account_code;

-- ========================================
-- 5. فحص توازن القيود (Debit = Credit)
-- ========================================
SELECT 
    je.entry_number,
    je.entry_date,
    je.total_debit,
    je.total_credit,
    (je.total_debit - je.total_credit) as الفرق,
    CASE 
        WHEN ABS(je.total_debit - je.total_credit) < 0.01 THEN 'متوازن'
        ELSE 'غير متوازن'
    END as الحالة
FROM journal_entries je
WHERE je.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND je.status = 'posted'
    AND ABS(je.total_debit - je.total_credit) >= 0.01
ORDER BY ABS(je.total_debit - je.total_credit) DESC;

-- ========================================
-- 6. فحص أرصدة الحسابات الرئيسية
-- ========================================
SELECT 
    SUBSTRING(account_code, 1, 1) as نوع_الحساب,
    CASE 
        WHEN SUBSTRING(account_code, 1, 1) = '1' THEN 'أصول'
        WHEN SUBSTRING(account_code, 1, 1) = '2' THEN 'خصوم'
        WHEN SUBSTRING(account_code, 1, 1) = '3' THEN 'حقوق ملكية'
        WHEN SUBSTRING(account_code, 1, 1) = '4' THEN 'إيرادات'
        WHEN SUBSTRING(account_code, 1, 1) = '5' THEN 'مصروفات'
        ELSE 'أخرى'
    END as التصنيف,
    COUNT(*) as عدد_الحسابات,
    SUM(current_balance) as الرصيد_الإجمالي,
    SUM(CASE WHEN is_header = false THEN current_balance ELSE 0 END) as رصيد_الحسابات_التشغيلية
FROM chart_of_accounts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND is_active = true
GROUP BY SUBSTRING(account_code, 1, 1)
ORDER BY SUBSTRING(account_code, 1, 1);

-- ========================================
-- 7. التحقق من الميزانية العمومية (Assets = Liabilities + Equity)
-- ========================================
WITH balances AS (
    SELECT 
        SUM(CASE WHEN account_code LIKE '1%' THEN current_balance ELSE 0 END) as اجمالي_الاصول,
        SUM(CASE WHEN account_code LIKE '2%' THEN current_balance ELSE 0 END) as اجمالي_الخصوم,
        SUM(CASE WHEN account_code LIKE '3%' THEN current_balance ELSE 0 END) as اجمالي_حقوق_الملكية,
        SUM(CASE WHEN account_code LIKE '4%' THEN current_balance ELSE 0 END) as اجمالي_الايرادات,
        SUM(CASE WHEN account_code LIKE '5%' THEN current_balance ELSE 0 END) as اجمالي_المصروفات
    FROM chart_of_accounts
    WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
        AND is_active = true
        AND is_header = false
)
SELECT 
    اجمالي_الاصول,
    اجمالي_الخصوم,
    اجمالي_حقوق_الملكية,
    (اجمالي_الخصوم + اجمالي_حقوق_الملكية) as الجانب_الدائن,
    (اجمالي_الاصول - (اجمالي_الخصوم + اجمالي_حقوق_الملكية)) as الفرق_في_الميزانية,
    اجمالي_الايرادات,
    اجمالي_المصروفات,
    (اجمالي_الايرادات - اجمالي_المصروفات) as صافي_الدخل,
    CASE 
        WHEN ABS(اجمالي_الاصول - (اجمالي_الخصوم + اجمالي_حقوق_الملكية)) < 1 THEN 'متوازنة ✅'
        ELSE 'غير متوازنة ❌'
    END as حالة_الميزانية
FROM balances;

-- ========================================
-- 8. فحص حسابات بدون حركة لكن لها أرصدة
-- ========================================
SELECT 
    coa.account_code,
    coa.account_name,
    coa.current_balance,
    coa.is_header,
    coa.account_level,
    COUNT(jel.id) as عدد_القيود
FROM chart_of_accounts coa
LEFT JOIN journal_entry_lines jel ON coa.account_code = jel.account_code
WHERE coa.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    AND coa.is_active = true
    AND ABS(coa.current_balance) > 0
GROUP BY coa.account_code, coa.account_name, coa.current_balance, coa.is_header, coa.account_level
HAVING COUNT(jel.id) = 0
ORDER BY ABS(coa.current_balance) DESC
LIMIT 20;

-- ========================================
-- 9. فحص آخر 20 قيد محاسبي
-- ========================================
SELECT 
    je.entry_number,
    je.entry_date,
    je.description,
    je.total_debit,
    je.total_credit,
    je.status,
    je.created_at,
    u.email as المُنشئ
FROM journal_entries je
LEFT JOIN users u ON je.created_by = u.id
WHERE je.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
ORDER BY je.created_at DESC
LIMIT 20;

-- ========================================
-- 10. ملخص تنفيذي Executive Summary
-- ========================================
SELECT 
    'إجمالي الحسابات النشطة' as المؤشر,
    COUNT(*)::text as القيمة
FROM chart_of_accounts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4' AND is_active = true
UNION ALL
SELECT 
    'إجمالي القيود المرحلة',
    COUNT(*)::text
FROM journal_entries
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4' AND status = 'posted'
UNION ALL
SELECT 
    'حسابات الإيرادات',
    COUNT(*)::text
FROM chart_of_accounts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4' 
    AND is_active = true 
    AND account_code LIKE '4%'
UNION ALL
SELECT 
    'حسابات المصروفات',
    COUNT(*)::text
FROM chart_of_accounts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4' 
    AND is_active = true 
    AND account_code LIKE '5%';

-- ========================================
-- تعليمات التشغيل
-- ========================================
-- 1. نفذ هذه الاستعلامات في Supabase SQL Editor
-- 2. راجع النتائج بعناية
-- 3. ابحث عن:
--    - حسابات إيرادات بأرصدة = 0
--    - قيود غير متوازنة
--    - حسابات بأرصدة دون حركة
--    - تناقضات في الميزانية العمومية

