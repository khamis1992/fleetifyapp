-- تنظيف البيانات المكررة في جدول chart_of_accounts باستخدام row_number
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY company_id, account_code ORDER BY created_at) as rn
  FROM public.chart_of_accounts
)
DELETE FROM public.chart_of_accounts
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- تنظيف البيانات المكررة في جدول banks
WITH bank_duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY company_id, account_number ORDER BY created_at) as rn
  FROM public.banks
)
DELETE FROM public.banks
WHERE id IN (
  SELECT id FROM bank_duplicates WHERE rn > 1
);

-- الآن إضافة القيود الفريدة
ALTER TABLE public.chart_of_accounts 
ADD CONSTRAINT unique_company_account_code 
UNIQUE (company_id, account_code);

ALTER TABLE public.banks 
ADD CONSTRAINT unique_company_bank_account 
UNIQUE (company_id, account_number);

-- إنشاء دالة للتحقق من وجود الحسابات قبل الإعداد
CREATE OR REPLACE FUNCTION public.check_existing_accounts_summary(company_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    accounts_count integer;
    banks_count integer;
    existing_codes text[];
    existing_bank_accounts text[];
    result jsonb;
BEGIN
    -- عد الحسابات الموجودة
    SELECT COUNT(*) INTO accounts_count
    FROM chart_of_accounts
    WHERE company_id = company_id_param AND is_active = true;
    
    -- عد البنوك الموجودة
    SELECT COUNT(*) INTO banks_count
    FROM banks
    WHERE company_id = company_id_param AND is_active = true;
    
    -- الحصول على أكواد الحسابات الموجودة
    SELECT array_agg(account_code ORDER BY account_code) INTO existing_codes
    FROM chart_of_accounts
    WHERE company_id = company_id_param AND is_active = true
    LIMIT 20;
    
    -- الحصول على أرقام الحسابات البنكية الموجودة
    SELECT array_agg(account_number ORDER BY account_number) INTO existing_bank_accounts
    FROM banks
    WHERE company_id = company_id_param AND is_active = true
    LIMIT 10;
    
    result := jsonb_build_object(
        'has_existing_accounts', accounts_count > 0,
        'accounts_count', accounts_count,
        'has_existing_banks', banks_count > 0,
        'banks_count', banks_count,
        'existing_codes', COALESCE(existing_codes, ARRAY[]::text[]),
        'existing_bank_accounts', COALESCE(existing_bank_accounts, ARRAY[]::text[])
    );
    
    RETURN result;
END;
$$;