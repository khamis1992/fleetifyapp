-- تنظيف البيانات المكررة في جدول chart_of_accounts قبل إضافة القيد الفريد
WITH duplicates AS (
  SELECT 
    company_id, 
    account_code, 
    MIN(id) as keep_id
  FROM public.chart_of_accounts
  GROUP BY company_id, account_code
  HAVING COUNT(*) > 1
)
DELETE FROM public.chart_of_accounts coa
WHERE EXISTS (
  SELECT 1 FROM duplicates d
  WHERE d.company_id = coa.company_id 
  AND d.account_code = coa.account_code 
  AND d.keep_id != coa.id
);

-- تنظيف البيانات المكررة في جدول banks
WITH bank_duplicates AS (
  SELECT 
    company_id, 
    account_number, 
    MIN(id) as keep_id
  FROM public.banks
  GROUP BY company_id, account_number
  HAVING COUNT(*) > 1
)
DELETE FROM public.banks b
WHERE EXISTS (
  SELECT 1 FROM bank_duplicates bd
  WHERE bd.company_id = b.company_id 
  AND bd.account_number = b.account_number 
  AND bd.keep_id != b.id
);

-- الآن إضافة القيود الفريدة
ALTER TABLE public.chart_of_accounts 
ADD CONSTRAINT unique_company_account_code 
UNIQUE (company_id, account_code);

ALTER TABLE public.banks 
ADD CONSTRAINT unique_company_bank_account 
UNIQUE (company_id, account_number);