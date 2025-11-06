-- ============================================================================
-- إصلاح دالة get_user_company المفقودة
-- ============================================================================
-- المشكلة: RLS policies تستخدم get_user_company() لكن الدالة غير معرّفة
-- الحل: إنشاء الدالة
-- كيفية التنفيذ: نسخ هذا الكود وتنفيذه في Supabase SQL Editor
-- ============================================================================

-- حذف الدالة إذا كانت موجودة
DROP FUNCTION IF EXISTS get_user_company(UUID);

-- إنشاء الدالة
CREATE OR REPLACE FUNCTION get_user_company(user_uuid UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE  -- يمكن تخزينها مؤقتاً ضمن الاستعلام الواحد (تحسين الأداء)
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
    
    -- إرجاع company_id (قد يكون NULL إذا لم يتم العثور على المستخدم)
    RETURN v_company_id;
    
EXCEPTION
    WHEN OTHERS THEN
        -- في حالة حدوث خطأ، نرجع NULL بدلاً من إيقاف الاستعلام
        RAISE WARNING 'Error in get_user_company for user %: %', user_uuid, SQLERRM;
        RETURN NULL;
END;
$$;

-- إضافة تعليق توضيحي للدالة
COMMENT ON FUNCTION get_user_company(UUID) IS 
'Returns the company_id for a given user_id from profiles table. 
Used extensively in RLS policies across the database.
Returns NULL if user not found or on error.';

-- منح الصلاحيات للأدوار المختلفة
GRANT EXECUTE ON FUNCTION get_user_company(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_company(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_user_company(UUID) TO anon;

-- إنشاء index على profiles.user_id لتحسين أداء الدالة
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- ============================================================================
-- اختبار الدالة
-- ============================================================================

-- اختبار 1: الحصول على company_id للمستخدم الحالي
SELECT get_user_company(auth.uid()) as my_company_id;

-- اختبار 2: عرض جميع المستخدمين مع company_id
SELECT 
    p.user_id,
    p.full_name,
    get_user_company(p.user_id) as company_id,
    p.company_id as original_company_id,
    CASE 
        WHEN get_user_company(p.user_id) = p.company_id THEN '✅ متطابق'
        ELSE '❌ غير متطابق'
    END as status
FROM profiles p
LIMIT 5;

-- اختبار 3: اختبار الأداء
EXPLAIN ANALYZE
SELECT 
    c.*,
    get_user_company(auth.uid()) as user_company
FROM customers c
WHERE c.company_id = get_user_company(auth.uid())
LIMIT 10;

-- ============================================================================
-- نتيجة متوقعة
-- ============================================================================
-- يجب أن تعمل الدالة بدون أخطاء
-- يجب أن ترجع company_id للمستخدم الحالي
-- RLS policies يجب أن تعمل الآن بشكل صحيح
-- ============================================================================

-- ملاحظة مهمة:
-- بعد تنفيذ هذا الكود، يجب إعادة تحميل الصفحة لرؤية النتائج

