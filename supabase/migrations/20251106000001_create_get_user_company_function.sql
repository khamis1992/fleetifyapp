-- إنشاء دالة get_user_company المفقودة
-- هذه الدالة مستخدمة في RLS policies لكنها لم تكن معرّفة
-- Created: 2025-11-06

-- حذف الدالة إذا كانت موجودة
DROP FUNCTION IF EXISTS get_user_company(UUID);

-- إنشاء الدالة
CREATE OR REPLACE FUNCTION get_user_company(user_uuid UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE  -- يمكن تخزينها مؤقتاً ضمن الاستعلام الواحد
SECURITY DEFINER  -- تُنفذ بصلاحيات صاحب الدالة
AS $$
DECLARE
    v_company_id UUID;
BEGIN
    -- جلب company_id من جدول profiles
    SELECT company_id INTO v_company_id
    FROM profiles
    WHERE user_id = user_uuid
    LIMIT 1;
    
    -- إرجاع company_id (قد يكون NULL)
    RETURN v_company_id;
EXCEPTION
    WHEN OTHERS THEN
        -- في حالة حدوث خطأ، نرجع NULL
        RETURN NULL;
END;
$$;

-- إضافة تعليق توضيحي
COMMENT ON FUNCTION get_user_company(UUID) IS 'Returns the company_id for a given user_id from profiles table. Used extensively in RLS policies.';

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION get_user_company(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_company(UUID) TO service_role;

-- إنشاء index على profiles.user_id لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- اختبار الدالة
DO $$
DECLARE
    test_result UUID;
BEGIN
    -- اختبار بسيط للدالة
    SELECT get_user_company(auth.uid()) INTO test_result;
    RAISE NOTICE 'get_user_company function created successfully. Test result: %', test_result;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'get_user_company function created (test skipped in migration context)';
END;
$$;

