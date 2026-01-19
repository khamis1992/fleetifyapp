-- تحديث إعدادات شركة البشائر الخليجية وإنشاء حساب لمحمد العنزي

-- تحديث إعدادات الشركة
UPDATE companies 
SET customer_account_settings = jsonb_set(
  COALESCE(customer_account_settings, '{}'),
  '{default_receivables_account_id}',
  '"4b5ceb83-9466-4c8c-bb2a-7cd5df7239fc"'::jsonb
)
WHERE name = 'البشائر الخليجية';

-- إنشاء حساب محاسبي لمحمد العنزي
DO $$
DECLARE
    result JSON;
BEGIN
    SELECT public.auto_create_customer_accounts(
        '24bf1b63-2568-4ae5-ae0a-49b21584fbfd',
        '1ddee958-dd87-4aeb-a7ae-7a46b72aa46f'
    ) INTO result;
    
    RAISE NOTICE 'نتيجة إنشاء حساب محمد العنزي: %', result;
END $$;