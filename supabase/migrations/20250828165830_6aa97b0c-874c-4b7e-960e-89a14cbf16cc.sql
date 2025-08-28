-- إصلاح خطة إنشاء الحسابات المحاسبية للعملاء

-- الخطوة 1: تحديث إعدادات شركة البشائر الخليجية بحساب المدينين الافتراضي الصحيح
UPDATE companies 
SET customer_account_settings = jsonb_set(
  COALESCE(customer_account_settings, '{}'),
  '{default_receivables_account_id}',
  '"4b5ceb83-9466-4c8c-bb2a-7cd5df7239fc"'::jsonb
)
WHERE name = 'البشائر الخليجية للإستثمار';

-- الخطوة 2: إصلاح دالة auto_create_customer_accounts لحل مشكلة العمود الغامض
CREATE OR REPLACE FUNCTION public.auto_create_customer_accounts(p_customer_id uuid, p_company_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    customer_record RECORD;
    company_settings JSONB;
    default_receivables_account_id UUID;
    customer_account_id UUID;
    account_code TEXT;
    account_name TEXT;
    existing_account_id UUID;
    result JSON;
BEGIN
    -- التحقق من صحة المعاملات
    IF p_customer_id IS NULL OR p_company_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'معرف العميل أو الشركة مفقود'
        );
    END IF;

    -- الحصول على بيانات العميل
    SELECT c.*, c.customer_type, c.first_name, c.last_name, c.company_name, c.customer_code
    INTO customer_record
    FROM customers c
    WHERE c.id = p_customer_id AND c.company_id = p_company_id;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'العميل غير موجود'
        );
    END IF;

    -- الحصول على إعدادات الشركة
    SELECT co.customer_account_settings
    INTO company_settings
    FROM companies co
    WHERE co.id = p_company_id;

    -- التحقق من تفعيل الإنشاء التلقائي
    IF NOT COALESCE((company_settings->>'auto_create_account')::boolean, false) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'الإنشاء التلقائي للحسابات معطل'
        );
    END IF;

    -- الحصول على حساب المدينين الافتراضي
    default_receivables_account_id := (company_settings->>'default_receivables_account_id')::UUID;
    
    IF default_receivables_account_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'حساب المدينين الافتراضي غير محدد في إعدادات الشركة'
        );
    END IF;

    -- التحقق من وجود حساب محاسبي للعميل مسبقاً
    SELECT ca.account_id
    INTO existing_account_id
    FROM customer_accounts ca
    WHERE ca.customer_id = p_customer_id AND ca.is_active = true
    LIMIT 1;

    IF existing_account_id IS NOT NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'يوجد حساب محاسبي للعميل مسبقاً',
            'existing_account_id', existing_account_id
        );
    END IF;

    -- إنشاء كود الحساب واسمه
    account_code := COALESCE(company_settings->>'account_prefix', 'CUST-') || 
                   COALESCE(customer_record.customer_code, 'C' || EXTRACT(EPOCH FROM NOW())::TEXT);
    
    account_name := CASE 
        WHEN customer_record.customer_type = 'individual' THEN 
            COALESCE(customer_record.first_name || ' ' || customer_record.last_name, 'عميل فردي')
        ELSE 
            COALESCE(customer_record.company_name, 'عميل مؤسسي')
    END;

    -- إنشاء الحساب المحاسبي
    INSERT INTO chart_of_accounts (
        id,
        company_id,
        account_code,
        account_name,
        account_type,
        balance_type,
        account_level,
        parent_account_id,
        is_active,
        can_link_customers,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        p_company_id,
        account_code,
        account_name,
        'assets',
        'debit',
        6,
        default_receivables_account_id,
        true,
        true,
        now(),
        now()
    ) RETURNING id INTO customer_account_id;

    -- ربط الحساب بالعميل
    INSERT INTO customer_accounts (
        id,
        customer_id,
        account_id,
        is_default,
        currency,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        p_customer_id,
        customer_account_id,
        true,
        'KWD',
        true,
        now(),
        now()
    );

    -- إرجاع النتيجة الناجحة
    RETURN json_build_object(
        'success', true,
        'message', 'تم إنشاء الحساب المحاسبي بنجاح',
        'customer_account_id', customer_account_id,
        'account_code', account_code,
        'account_name', account_name
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'خطأ في إنشاء الحساب: ' || SQLERRM
        );
END;
$function$;

-- الخطوة 3: إنشاء حساب محاسبي للعميل "محمد العنزي"
DO $$
DECLARE
    customer_id UUID;
    company_id UUID;
    result JSON;
BEGIN
    -- البحث عن العميل "محمد العنزي" في شركة "البشائر الخليجية"
    SELECT c.id, c.company_id
    INTO customer_id, company_id
    FROM customers c
    JOIN companies co ON c.company_id = co.id
    WHERE (c.first_name || ' ' || c.last_name) LIKE '%محمد%' 
    AND (c.first_name || ' ' || c.last_name) LIKE '%العنزي%'
    AND co.name = 'البشائر الخليجية للإستثمار'
    LIMIT 1;

    IF customer_id IS NOT NULL THEN
        -- تطبيق دالة إنشاء الحساب
        SELECT public.auto_create_customer_accounts(customer_id, company_id) INTO result;
        
        -- طباعة النتيجة للمراجعة
        RAISE NOTICE 'نتيجة إنشاء حساب محمد العنزي: %', result;
    ELSE
        RAISE NOTICE 'لم يتم العثور على العميل محمد العنزي في شركة البشائر الخليجية';
    END IF;
END $$;