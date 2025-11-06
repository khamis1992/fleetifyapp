-- 🔍 تحقيق تناقض الأرصدة في دفتر الأستاذ
-- المشكلة: المدين = 385,940 | الدائن = 0
-- التاريخ: 2025-11-06

-- 1. التحقق من إجمالي المدين والدائن لجميع القيود
SELECT 
  'إجمالي القيود' as القسم,
  COUNT(*) as عدد_القيود,
  SUM(total_debit) as إجمالي_المدين,
  SUM(total_credit) as إجمالي_الدائن,
  SUM(total_debit) - SUM(total_credit) as الفرق
FROM journal_entries
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4';

-- 2. التحقق من إجمالي المدين والدائن لسطور القيود
SELECT 
  'إجمالي سطور القيود' as القسم,
  COUNT(*) as عدد_السطور,
  SUM(debit_amount) as إجمالي_المدين,
  SUM(credit_amount) as إجمالي_الدائن,
  SUM(debit_amount) - SUM(credit_amount) as الفرق
FROM journal_entry_lines jel
INNER JOIN journal_entries je ON je.id = jel.journal_entry_id
WHERE je.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4';

-- 3. التحقق من القيود غير المتوازنة
SELECT 
  id,
  entry_number,
  entry_date,
  description,
  total_debit,
  total_credit,
  total_debit - total_credit as الفرق,
  status
FROM journal_entries
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND total_debit != total_credit
ORDER BY entry_date DESC;

-- 4. التحقق من السطور التي لها مدين فقط أو دائن فقط
SELECT 
  'سطور مدينة فقط' as النوع,
  COUNT(*) as العدد,
  SUM(debit_amount) as المجموع
FROM journal_entry_lines jel
INNER JOIN journal_entries je ON je.id = jel.journal_entry_id
WHERE je.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND debit_amount > 0 
  AND credit_amount = 0

UNION ALL

SELECT 
  'سطور دائنة فقط' as النوع,
  COUNT(*) as العدد,
  SUM(credit_amount) as المجموع
FROM journal_entry_lines jel
INNER JOIN journal_entries je ON je.id = jel.journal_entry_id
WHERE je.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND credit_amount > 0 
  AND debit_amount = 0;

-- 5. عينة من القيود (أول 10 قيود)
SELECT 
  je.id,
  je.entry_number,
  je.entry_date,
  je.description,
  je.total_debit,
  je.total_credit,
  je.status,
  (
    SELECT COUNT(*) 
    FROM journal_entry_lines 
    WHERE journal_entry_id = je.id
  ) as عدد_السطور
FROM journal_entries je
WHERE je.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
ORDER BY je.entry_date DESC
LIMIT 10;

-- 6. تحليل تفصيلي لقيد واحد (مثال)
SELECT 
  jel.line_number,
  coa.account_code,
  coa.account_name,
  jel.line_description,
  jel.debit_amount,
  jel.credit_amount
FROM journal_entry_lines jel
INNER JOIN journal_entries je ON je.id = jel.journal_entry_id
INNER JOIN chart_of_accounts coa ON coa.id = jel.account_id
WHERE je.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND je.id = (
    SELECT id 
    FROM journal_entries 
    WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
    ORDER BY entry_date DESC 
    LIMIT 1
  )
ORDER BY jel.line_number;

