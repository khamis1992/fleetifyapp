-- الخطة الشاملة لحل مشكلة إضافة العملاء
-- المرحلة 1: تنظيف قاعدة البيانات - إزالة المؤشرات والدوال المتضاربة

-- إزالة جميع المؤشرات المتضاربة على جدول العملاء
DROP TRIGGER IF EXISTS create_customer_account_trigger ON public.customers;
DROP TRIGGER IF EXISTS on_customer_created ON public.customers;
DROP TRIGGER IF EXISTS trigger_create_customer_account ON public.customers;

-- إزالة جميع إصدارات الدالة المتضاربة
DROP FUNCTION IF EXISTS public.create_customer_financial_account(uuid);
DROP FUNCTION IF EXISTS public.create_customer_financial_account(uuid, uuid);
DROP FUNCTION IF EXISTS public.create_customer_financial_account(customer_id_param uuid, company_id_param uuid);
DROP FUNCTION IF EXISTS public.create_customer_financial_account();

-- المرحلة 2: إنشاء النظام الموحد
-- إنشاء دالة موحدة ومحسنة لإنشاء الحسابات المالية للعملاء

CREATE OR REPLACE FUNCTION public.create_customer_financial_account(
    customer_id_param uuid,
    company_id_param uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    customer_record RECORD;
    receivable_account_id uuid;
    customer_account_id uuid;
    final_company_id uuid;
    customer_account_code text;
    customer_display_name text;
BEGIN
    -- تسجيل بداية العملية
    RAISE LOG 'Starting create_customer_financial_account for customer: %, company: %', customer_id_param, company_id_param;
    
    -- الحصول على معلومات العميل مع التحقق من وجوده
    SELECT c.* INTO customer_record
    FROM public.customers c
    WHERE c.id = customer_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Customer with ID % not found', customer_id_param;
    END IF;
    
    -- تحديد معرف الشركة
    final_company_id := COALESCE(company_id_param, customer_record.company_id);
    
    IF final_company_id IS NULL THEN
        RAISE EXCEPTION 'Company ID cannot be determined for customer %', customer_id_param;
    END IF;
    
    -- التحقق من عدم وجود حساب مالي للعميل مسبقاً
    SELECT ca.account_id INTO customer_account_id
    FROM public.customer_accounts ca
    WHERE ca.customer_id = customer_id_param 
    AND ca.company_id = final_company_id;
    
    IF customer_account_id IS NOT NULL THEN
        RAISE LOG 'Customer % already has financial account: %', customer_id_param, customer_account_id;
        RETURN customer_account_id;
    END IF;
    
    -- البحث عن حساب الذمم المدينة باستخدام aliases واضحة لتجنب الغموض
    SELECT coa.id INTO receivable_account_id
    FROM public.chart_of_accounts coa
    WHERE coa.company_id = final_company_id
    AND coa.account_type = 'assets'
    AND (
        coa.account_name ILIKE '%receivable%' OR 
        coa.account_name ILIKE '%مدين%' OR
        coa.account_name ILIKE '%عميل%' OR
        coa.account_name_ar ILIKE '%مدين%' OR
        coa.account_name_ar ILIKE '%عميل%'
    )
    AND coa.is_active = true
    ORDER BY coa.account_level DESC, coa.account_code
    LIMIT 1;
    
    -- إنشاء حساب الذمم المدينة إذا لم يوجد
    IF receivable_account_id IS NULL THEN
        RAISE LOG 'Creating new receivable account for company %', final_company_id;
        
        INSERT INTO public.chart_of_accounts (
            id,
            company_id,
            account_code,
            account_name,
            account_name_ar,
            account_type,
            account_subtype,
            balance_type,
            account_level,
            is_header,
            is_active,
            current_balance,
            description
        ) VALUES (
            gen_random_uuid(),
            final_company_id,
            '1120',
            'Accounts Receivable - Customers',
            'ذمم مدينة - عملاء',
            'assets',
            'current_assets',
            'debit',
            2,
            false,
            true,
            0,
            'Auto-created receivable account for customers'
        ) RETURNING id INTO receivable_account_id;
        
        RAISE LOG 'Created receivable account: %', receivable_account_id;
    END IF;
    
    -- تحديد اسم العميل للعرض
    IF customer_record.customer_type = 'corporate' THEN
        customer_display_name := COALESCE(customer_record.company_name, customer_record.company_name_ar, 'Unknown Company');
    ELSE
        customer_display_name := TRIM(COALESCE(customer_record.first_name, '') || ' ' || COALESCE(customer_record.last_name, ''));
        IF customer_display_name = '' OR customer_display_name IS NULL THEN
            customer_display_name := TRIM(COALESCE(customer_record.first_name_ar, '') || ' ' || COALESCE(customer_record.last_name_ar, ''));
        END IF;
        IF customer_display_name = '' OR customer_display_name IS NULL THEN
            customer_display_name := 'Unknown Customer';
        END IF;
    END IF;
    
    -- توليد رمز حساب فريد للعميل
    customer_account_code := '1121-' || LPAD(
        (COALESCE(
            (SELECT MAX(CAST(SUBSTRING(coa2.account_code FROM '1121-(.*)') AS INTEGER))
             FROM public.chart_of_accounts coa2
             WHERE coa2.company_id = final_company_id 
             AND coa2.account_code ~ '^1121-[0-9]+$'), 
            0
        ) + 1)::TEXT, 
        4, '0'
    );
    
    -- إنشاء حساب فرعي للعميل
    INSERT INTO public.chart_of_accounts (
        id,
        company_id,
        account_code,
        account_name,
        account_name_ar,
        account_type,
        account_subtype,
        balance_type,
        parent_account_id,
        account_level,
        is_header,
        is_active,
        current_balance,
        description
    ) VALUES (
        gen_random_uuid(),
        final_company_id,
        customer_account_code,
        'Customer: ' || customer_display_name,
        'عميل: ' || customer_display_name,
        'assets',
        'current_assets',
        'debit',
        receivable_account_id,
        3,
        false,
        true,
        0,
        'Customer account for: ' || customer_display_name || ' (ID: ' || customer_id_param || ')'
    ) RETURNING id INTO customer_account_id;
    
    -- ربط العميل بالحساب المالي
    INSERT INTO public.customer_accounts (
        id,
        customer_id,
        account_id,
        company_id
    ) VALUES (
        gen_random_uuid(),
        customer_id_param,
        customer_account_id,
        final_company_id
    );
    
    RAISE LOG 'Successfully created customer financial account: % for customer: %', customer_account_id, customer_id_param;
    
    RETURN customer_account_id;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in create_customer_financial_account: %', SQLERRM;
        RAISE EXCEPTION 'Failed to create customer financial account: %', SQLERRM;
END;
$$;

-- المرحلة 3: إنشاء مؤشر موحد وصحيح
CREATE OR REPLACE FUNCTION public.handle_customer_account_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    account_id uuid;
BEGIN
    -- تنفيذ فقط عند إنشاء عميل جديد
    IF TG_OP = 'INSERT' THEN
        BEGIN
            -- إنشاء الحساب المالي للعميل
            account_id := public.create_customer_financial_account(NEW.id, NEW.company_id);
            RAISE LOG 'Created financial account % for new customer %', account_id, NEW.id;
        EXCEPTION
            WHEN OTHERS THEN
                -- تسجيل الخطأ ولكن عدم فشل العملية
                RAISE LOG 'Failed to create financial account for customer %: %', NEW.id, SQLERRM;
                -- يمكن للعميل أن يُنشأ حتى لو فشل إنشاء الحساب المالي
        END;
    END IF;
    
    RETURN NEW;
END;
$$;

-- إنشاء المؤشر الموحد
CREATE TRIGGER create_customer_account_trigger
    AFTER INSERT ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_customer_account_creation();

-- المرحلة 4: تحسين الأداء - إنشاء فهارس مفيدة
CREATE INDEX IF NOT EXISTS idx_customer_accounts_customer_company 
ON public.customer_accounts(customer_id, company_id);

CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_company_type_active 
ON public.chart_of_accounts(company_id, account_type, is_active) 
WHERE is_active = true;

-- إضافة تعليقات للتوثيق
COMMENT ON FUNCTION public.create_customer_financial_account(uuid, uuid) IS 
'Creates financial account for customer with proper error handling and logging';

COMMENT ON FUNCTION public.handle_customer_account_creation() IS 
'Trigger function to automatically create financial accounts for new customers';

COMMENT ON TRIGGER create_customer_account_trigger ON public.customers IS 
'Automatically creates financial account when new customer is inserted';