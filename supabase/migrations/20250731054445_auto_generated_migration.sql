-- إضافة بيانات نموذجية لتحسين التحليل المالي
-- أولاً: إضافة رصيد نقدي ابتدائي
UPDATE public.chart_of_accounts 
SET current_balance = 50000.00 
WHERE company_id = '44f2cd3a-5bf6-4b43-a7e5-aa3ff6422f1c' 
  AND account_code = '1102' -- النقد في البنك - د.ك
  AND is_active = true;

-- إضافة رصيد للنقدية في الصندوق
UPDATE public.chart_of_accounts 
SET current_balance = 5000.00 
WHERE company_id = '44f2cd3a-5bf6-4b43-a7e5-aa3ff6422f1c' 
  AND account_code = '1101' -- النقد في الصندوق
  AND is_active = true;

-- إضافة بعض أرصدة الذمم المدينة
UPDATE public.chart_of_accounts 
SET current_balance = 15000.00 
WHERE company_id = '44f2cd3a-5bf6-4b43-a7e5-aa3ff6422f1c' 
  AND account_code = '1110' -- الذمم المدينة - محلي
  AND is_active = true;

-- إضافة رصيد للبضاعة (المخزون)
UPDATE public.chart_of_accounts 
SET current_balance = 25000.00 
WHERE company_id = '44f2cd3a-5bf6-4b43-a7e5-aa3ff6422f1c' 
  AND account_name ILIKE '%inventory%' 
  AND is_active = true;

-- إذا لم يوجد حساب مخزون، ننشئ واحد
INSERT INTO public.chart_of_accounts (
    id,
    company_id,
    account_code,
    account_name,
    account_name_ar,
    account_type,
    account_subtype,
    parent_account_id,
    balance_type,
    current_balance,
    is_active,
    account_level,
    is_header
) 
SELECT 
    gen_random_uuid(),
    '44f2cd3a-5bf6-4b43-a7e5-aa3ff6422f1c',
    '1150',
    'Inventory',
    'المخزون',
    'assets',
    'current',
    (SELECT id FROM public.chart_of_accounts WHERE account_code = '1100' AND company_id = '44f2cd3a-5bf6-4b43-a7e5-aa3ff6422f1c'),
    'debit',
    25000.00,
    true,
    3,
    false
WHERE NOT EXISTS (
    SELECT 1 FROM public.chart_of_accounts 
    WHERE company_id = '44f2cd3a-5bf6-4b43-a7e5-aa3ff6422f1c' 
      AND account_code = '1150'
);

-- إضافة بعض الإيرادات للفترة الحالية
-- أولاً ننشئ قيد إيرادات عامة إذا لم يكن موجود
DO $$
DECLARE
    revenue_account_id UUID;
    journal_id UUID;
    cash_account_id UUID;
BEGIN
    -- الحصول على حساب الإيرادات
    SELECT id INTO revenue_account_id
    FROM public.chart_of_accounts
    WHERE company_id = '44f2cd3a-5bf6-4b43-a7e5-aa3ff6422f1c'
      AND account_type = 'revenue'
      AND is_active = true
      AND is_header = false
    LIMIT 1;
    
    -- الحصول على حساب النقدية
    SELECT id INTO cash_account_id
    FROM public.chart_of_accounts
    WHERE company_id = '44f2cd3a-5bf6-4b43-a7e5-aa3ff6422f1c'
      AND account_code = '1102'
    LIMIT 1;
    
    -- إنشاء قيد يومية للإيرادات إذا كانت الحسابات متوفرة
    IF revenue_account_id IS NOT NULL AND cash_account_id IS NOT NULL THEN
        -- إنشاء قيد اليومية
        INSERT INTO public.journal_entries (
            id,
            company_id,
            entry_number,
            entry_date,
            description,
            total_debit,
            total_credit,
            status,
            created_by
        ) VALUES (
            gen_random_uuid(),
            '44f2cd3a-5bf6-4b43-a7e5-aa3ff6422f1c',
            'JE-001-' || TO_CHAR(CURRENT_DATE, 'YYYY'),
            CURRENT_DATE - INTERVAL '30 days',
            'إيرادات الشهر السابق',
            30000.00,
            30000.00,
            'posted',
            '33104f93-57e7-4e5d-993f-a1e6be1cb121'
        ) RETURNING id INTO journal_id;
        
        -- إضافة بنود القيد - مدين النقدية
        INSERT INTO public.journal_entry_lines (
            id,
            journal_entry_id,
            account_id,
            line_number,
            line_description,
            debit_amount,
            credit_amount
        ) VALUES (
            gen_random_uuid(),
            journal_id,
            cash_account_id,
            1,
            'تحصيل إيرادات نقدية',
            30000.00,
            0.00
        );
        
        -- إضافة بنود القيد - دائن الإيرادات
        INSERT INTO public.journal_entry_lines (
            id,
            journal_entry_id,
            account_id,
            line_number,
            line_description,
            debit_amount,
            credit_amount
        ) VALUES (
            gen_random_uuid(),
            journal_id,
            revenue_account_id,
            2,
            'إيرادات الخدمات المقدمة',
            0.00,
            30000.00
        );
    END IF;
END $$;