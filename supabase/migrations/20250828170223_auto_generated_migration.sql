-- إنشاء حساب محاسبي لمحمد العنزي باستخدام الدالة المصححة
DO $$
DECLARE
    result JSON;
BEGIN
    -- تشغيل دالة إنشاء الحساب
    SELECT public.auto_create_customer_accounts(
        '24bf1b63-2568-4ae5-ae0a-49b21584fbfd',  -- معرف محمد العنزي
        '1ddee958-dd87-4aeb-a7ae-7a46b72aa46f'   -- معرف شركة البشائر الخليجية
    ) INTO result;
    
    RAISE NOTICE 'نتيجة إنشاء حساب محمد العنزي: %', result;
END $$;