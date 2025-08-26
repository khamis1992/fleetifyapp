-- ===================================================================
-- Simple Account Linking Migration - نسخة مبسطة للاختبار
-- ===================================================================

-- 1. إضافة أعمدة ربط الحسابات (إذا لم تكن موجودة)
-- Add account linking columns if they don't exist
DO $$
BEGIN
    -- التحقق من وجود العمود الأول وإضافته إذا لم يكن موجوداً
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'chart_of_accounts' 
                   AND column_name = 'can_link_customers') THEN
        ALTER TABLE chart_of_accounts ADD COLUMN can_link_customers BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- التحقق من وجود العمود الثاني وإضافته إذا لم يكن موجوداً
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'chart_of_accounts' 
                   AND column_name = 'can_link_vendors') THEN
        ALTER TABLE chart_of_accounts ADD COLUMN can_link_vendors BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- التحقق من وجود العمود الثالث وإضافته إذا لم يكن موجوداً
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'chart_of_accounts' 
                   AND column_name = 'can_link_employees') THEN
        ALTER TABLE chart_of_accounts ADD COLUMN can_link_employees BOOLEAN DEFAULT FALSE;
    END IF;
    
    RAISE NOTICE 'تم التحقق من أعمدة ربط الحسابات - Account linking columns checked';
END $$;

-- 2. تحديث القيم الافتراضية للحسابات الموجودة
-- Update default values for existing accounts

-- تحديث ربط العملاء (Customer accounts: 113xxx, 114xxx)
UPDATE chart_of_accounts 
SET can_link_customers = TRUE 
WHERE (is_header = FALSE OR is_header IS NULL)
  AND (account_code LIKE '113%' OR account_code LIKE '114%')
  AND can_link_customers = FALSE;

-- تحديث ربط الموردين (Vendor accounts: 213xxx, 214xxx)  
UPDATE chart_of_accounts 
SET can_link_vendors = TRUE 
WHERE (is_header = FALSE OR is_header IS NULL)
  AND (account_code LIKE '213%' OR account_code LIKE '214%')
  AND can_link_vendors = FALSE;

-- تحديث ربط الموظفين (Employee accounts: 215xxx, 216xxx)
UPDATE chart_of_accounts 
SET can_link_employees = TRUE 
WHERE (is_header = FALSE OR is_header IS NULL)
  AND (account_code LIKE '215%' OR account_code LIKE '216%')
  AND can_link_employees = FALSE;

-- 3. عرض النتائج
-- Show results
SELECT 
    'إجمالي الحسابات' as النوع,
    COUNT(*) as العدد
FROM chart_of_accounts
WHERE is_active = TRUE

UNION ALL

SELECT 
    'حسابات العملاء' as النوع,
    COUNT(*) as العدد
FROM chart_of_accounts 
WHERE can_link_customers = TRUE
  AND is_active = TRUE

UNION ALL

SELECT 
    'حسابات الموردين' as النوع,
    COUNT(*) as العدد
FROM chart_of_accounts 
WHERE can_link_vendors = TRUE
  AND is_active = TRUE

UNION ALL

SELECT 
    'حسابات الموظفين' as النوع,
    COUNT(*) as العدد
FROM chart_of_accounts 
WHERE can_link_employees = TRUE
  AND is_active = TRUE;

-- رسالة النجاح
DO $$
BEGIN
    RAISE NOTICE '✅ تم تطبيق تحديث ربط الحسابات بنجاح!';
    RAISE NOTICE '🎯 يمكنك الآن استخدام نظام ربط الحسابات في التطبيق';
END $$;
