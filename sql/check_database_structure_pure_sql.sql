-- ═══════════════════════════════════════════════════════════════
-- فحص البنية الحقيقية لجدول reminder_schedules (SQL نقي)
-- ═══════════════════════════════════════════════════════════════
-- يعمل على: Supabase Dashboard, pgAdmin, DBeaver, أي SQL client
-- التاريخ: 05 فبراير 2025
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- 1. فحص جميع الأعمدة
-- ═══════════════════════════════════════════════════════════════
WITH columns_data AS (
    SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        ordinal_position
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'reminder_schedules'
)
SELECT 
    '═══ 📋 الأعمدة الموجودة فعلياً ═══' as section,
    NULL::text as column_name,
    NULL::text as data_type,
    NULL::text as is_nullable,
    NULL::text as column_default,
    0 as sort_order

UNION ALL

SELECT 
    '─────────────────────────────────────',
    NULL, NULL, NULL, NULL,
    1

UNION ALL

SELECT 
    NULL as section,
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position + 1 as sort_order
FROM columns_data
ORDER BY sort_order;

-- ═══════════════════════════════════════════════════════════════
-- 2. فحص الأعمدة المتوقعة (النسخة A vs B)
-- ═══════════════════════════════════════════════════════════════
SELECT 
    '═══ 🔍 فحص أعمدة النسخة A (WhatsApp Reminders) ═══' as check_name,
    NULL::text as status
    
UNION ALL

SELECT '─────────────────────────────────────', NULL

UNION ALL

SELECT 
    'phone_number',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'reminder_schedules'
              AND column_name = 'phone_number'
        ) THEN '✅ موجود'
        ELSE '❌ غير موجود'
    END

UNION ALL

SELECT 
    'customer_name',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'reminder_schedules'
              AND column_name = 'customer_name'
        ) THEN '✅ موجود'
        ELSE '❌ غير موجود'
    END

UNION ALL

SELECT 
    'message_template',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'reminder_schedules'
              AND column_name = 'message_template'
        ) THEN '✅ موجود'
        ELSE '❌ غير موجود'
    END

UNION ALL

SELECT 
    'reminder_type',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'reminder_schedules'
              AND column_name = 'reminder_type'
        ) THEN '✅ موجود'
        ELSE '❌ غير موجود'
    END

UNION ALL

SELECT 
    'last_error',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'reminder_schedules'
              AND column_name = 'last_error'
        ) THEN '✅ موجود'
        ELSE '❌ غير موجود'
    END

UNION ALL

SELECT 
    'next_retry_at',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'reminder_schedules'
              AND column_name = 'next_retry_at'
        ) THEN '✅ موجود'
        ELSE '❌ غير موجود'
    END

UNION ALL

SELECT '', ''

UNION ALL

SELECT 
    '═══ 🔍 فحص أعمدة النسخة B (Template System) ═══',
    NULL

UNION ALL

SELECT '─────────────────────────────────────', NULL

UNION ALL

SELECT 
    'template_id',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'reminder_schedules'
              AND column_name = 'template_id'
        ) THEN '✅ موجود'
        ELSE '❌ غير موجود'
    END

UNION ALL

SELECT 
    'error_message',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'reminder_schedules'
              AND column_name = 'error_message'
        ) THEN '✅ موجود'
        ELSE '❌ غير موجود'
    END

UNION ALL

SELECT 
    'scheduled_time (text)',
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'reminder_schedules'
              AND column_name = 'scheduled_time'
              AND data_type = 'text'
        ) THEN '✅ موجود'
        ELSE '❌ غير موجود'
    END;


-- ═══════════════════════════════════════════════════════════════
-- 3. فحص Foreign Keys
-- ═══════════════════════════════════════════════════════════════
WITH fk_data AS (
    SELECT 
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name || '.' || ccu.column_name as ref_col
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name = 'reminder_schedules'
)
SELECT 
    '═══ 🔗 Foreign Keys ═══' as constraint_info,
    NULL::text as table_col,
    NULL::text as references,
    0 as sort_order

UNION ALL

SELECT '─────────────────────────────────────', NULL, NULL, 1

UNION ALL

SELECT 
    constraint_name,
    column_name,
    ref_col,
    2
FROM fk_data
ORDER BY sort_order;


-- ═══════════════════════════════════════════════════════════════
-- 4. فحص Constraints
-- ═══════════════════════════════════════════════════════════════
WITH constraint_data AS (
    SELECT 
        conname,
        CASE contype
            WHEN 'c' THEN 'CHECK'
            WHEN 'f' THEN 'FOREIGN KEY'
            WHEN 'p' THEN 'PRIMARY KEY'
            WHEN 'u' THEN 'UNIQUE'
            WHEN 't' THEN 'TRIGGER'
            WHEN 'x' THEN 'EXCLUSION'
            ELSE contype::text
        END as con_type,
        pg_get_constraintdef(oid) as con_def,
        contype
    FROM pg_constraint
    WHERE conrelid = 'public.reminder_schedules'::regclass
)
SELECT 
    '═══ 🔒 Constraints ═══' as constraint_name,
    NULL::text as type,
    NULL::text as definition,
    0 as sort_order

UNION ALL

SELECT '─────────────────────────────────────', NULL, NULL, 1

UNION ALL

SELECT 
    conname,
    con_type,
    con_def,
    2
FROM constraint_data
ORDER BY sort_order, type;


-- ═══════════════════════════════════════════════════════════════
-- 5. فحص Indexes
-- ═══════════════════════════════════════════════════════════════
WITH index_data AS (
    SELECT 
        indexname,
        indexdef
    FROM pg_indexes
    WHERE tablename = 'reminder_schedules'
)
SELECT 
    '═══ 📑 Indexes ═══' as index_name,
    NULL::text as definition,
    0 as sort_order

UNION ALL

SELECT '─────────────────────────────────────', NULL, 1

UNION ALL

SELECT 
    indexname,
    indexdef,
    2
FROM index_data
ORDER BY sort_order, index_name;


-- ═══════════════════════════════════════════════════════════════
-- 6. إحصائيات الجدول
-- ═══════════════════════════════════════════════════════════════
WITH stats AS (
    SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT status) as distinct_statuses,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count
    FROM reminder_schedules
)
SELECT 
    '═══ 📊 إحصائيات الجدول ═══' as metric,
    NULL::bigint as count,
    0 as sort_order

UNION ALL

SELECT '─────────────────────────────────────', NULL, 1

UNION ALL

SELECT 'إجمالي السجلات', total, 2 FROM stats

UNION ALL

SELECT 'حالات مختلفة', distinct_statuses, 3 FROM stats

UNION ALL

SELECT 'معلق (pending)', pending_count, 4 FROM stats

UNION ALL

SELECT 'مُرسل (sent)', sent_count, 5 FROM stats

UNION ALL

SELECT 'فاشل (failed)', failed_count, 6 FROM stats

UNION ALL

SELECT 'ملغي (cancelled)', cancelled_count, 7 FROM stats

ORDER BY sort_order;


-- ═══════════════════════════════════════════════════════════════
-- 7. النتيجة النهائية والتوصيات
-- ═══════════════════════════════════════════════════════════════
DO $$
DECLARE
    has_phone_number BOOLEAN;
    has_template_id BOOLEAN;
    has_last_error BOOLEAN;
    has_error_message BOOLEAN;
    has_customer_name BOOLEAN;
    has_message_template BOOLEAN;
    version_type TEXT;
    recommendations TEXT[];
BEGIN
    -- فحص الأعمدة الرئيسية
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'reminder_schedules' AND column_name = 'phone_number'
    ) INTO has_phone_number;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'reminder_schedules' AND column_name = 'template_id'
    ) INTO has_template_id;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'reminder_schedules' AND column_name = 'last_error'
    ) INTO has_last_error;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'reminder_schedules' AND column_name = 'error_message'
    ) INTO has_error_message;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'reminder_schedules' AND column_name = 'customer_name'
    ) INTO has_customer_name;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'reminder_schedules' AND column_name = 'message_template'
    ) INTO has_message_template;
    
    -- تحديد النسخة المطبقة
    IF has_phone_number AND has_customer_name AND has_message_template AND NOT has_template_id THEN
        version_type := '🟢 النسخة A: WhatsApp Reminders (20250126130000)';
        recommendations := ARRAY[
            '✅ النظام المبني على رسائل مباشرة مطبق',
            '→ يمكن استخدام phone_number و message_template مباشرة',
            '→ استخدم last_error لتخزين الأخطاء',
            '→ الملفات الأصلية للـ WhatsApp system جاهزة للعمل'
        ];
        
    ELSIF has_template_id AND NOT has_phone_number AND NOT has_customer_name THEN
        version_type := '🟡 النسخة B: Template System (20250126_reminder_templates)';
        recommendations := ARRAY[
            '⚠️ النظام المبني على القوالب مطبق',
            '→ لا يوجد phone_number مخزن في الجدول!',
            '→ يجب جلب phone_number من جدول customers',
            '→ يجب جلب message من جدول reminder_templates',
            '→ استخدم error_message (وليس last_error) للأخطاء',
            '→ تحتاج إما:',
            '   أ) Migration لإضافة الأعمدة الناقصة (phone_number, customer_name, message_template)',
            '   ب) تعديل الكود للعمل مع النظام الحالي (template-based)'
        ];
        
    ELSIF has_phone_number AND has_template_id THEN
        version_type := '🟢 نسخة مدمجة (تحتوي على أعمدة النسختين)';
        recommendations := ARRAY[
            '✅ النسختان مدمجتان - الأفضل!',
            '→ يمكن العمل بنظام القوالب أو الرسائل المباشرة',
            '→ مرونة كاملة في الاستخدام'
        ];
        
    ELSE
        version_type := '🔴 نسخة غير معروفة أو غير مكتملة!';
        recommendations := ARRAY[
            '⚠️ البنية غير متوقعة',
            '→ مراجعة يدوية مطلوبة',
            '→ تحقق من Migrations المطبقة',
            '→ قد تحتاج إعادة بناء الجدول'
        ];
    END IF;
    
    -- طباعة النتائج
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '           📊 النتيجة النهائية والتوصيات';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'البنية المطبقة: %', version_type;
    RAISE NOTICE '';
    RAISE NOTICE '─────────────────────────────────────────────────────────';
    RAISE NOTICE 'الأعمدة الموجودة:';
    RAISE NOTICE '─────────────────────────────────────────────────────────';
    RAISE NOTICE '';
    
    IF has_phone_number THEN
        RAISE NOTICE '  ✅ phone_number: موجود';
    ELSE
        RAISE NOTICE '  ❌ phone_number: غير موجود';
    END IF;
    
    IF has_customer_name THEN
        RAISE NOTICE '  ✅ customer_name: موجود';
    ELSE
        RAISE NOTICE '  ❌ customer_name: غير موجود';
    END IF;
    
    IF has_message_template THEN
        RAISE NOTICE '  ✅ message_template: موجود';
    ELSE
        RAISE NOTICE '  ❌ message_template: غير موجود';
    END IF;
    
    IF has_template_id THEN
        RAISE NOTICE '  ✅ template_id: موجود';
    ELSE
        RAISE NOTICE '  ❌ template_id: غير موجود';
    END IF;
    
    IF has_last_error THEN
        RAISE NOTICE '  ✅ last_error: موجود';
    ELSIF has_error_message THEN
        RAISE NOTICE '  ⚠️  error_message: موجود (بدلاً من last_error)';
    ELSE
        RAISE NOTICE '  ❌ لا يوجد عمود للأخطاء!';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '─────────────────────────────────────────────────────────';
    RAISE NOTICE 'التوصيات:';
    RAISE NOTICE '─────────────────────────────────────────────────────────';
    RAISE NOTICE '';
    
    FOREACH version_type IN ARRAY recommendations
    LOOP
        RAISE NOTICE '%', version_type;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    
END $$;

-- نهاية الفحص
SELECT '✅ اكتمل الفحص - راجع النتائج أعلاه في messages/notices' as status;

