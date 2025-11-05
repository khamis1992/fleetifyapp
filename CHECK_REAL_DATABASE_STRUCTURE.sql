-- ═══════════════════════════════════════════════════════════════
-- فحص البنية الحقيقية لجدول reminder_schedules
-- ═══════════════════════════════════════════════════════════════
-- الغرض: تحديد البنية الفعلية المطبقة في قاعدة البيانات
-- التاريخ: 05 فبراير 2025
-- ═══════════════════════════════════════════════════════════════

\echo '╔════════════════════════════════════════════════════╗'
\echo '║   فحص البنية الحقيقية لـ reminder_schedules       ║'
\echo '╚════════════════════════════════════════════════════╝'
\echo ''

-- ═══════════════════════════════════════════════════════════════
-- 1. فحص جميع الأعمدة
-- ═══════════════════════════════════════════════════════════════
\echo '📋 الأعمدة الموجودة فعلياً:'
\echo ''

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'reminder_schedules'
ORDER BY ordinal_position;

\echo ''
\echo '─────────────────────────────────────────────────────'
\echo ''

-- ═══════════════════════════════════════════════════════════════
-- 2. فحص الأعمدة المتوقعة (النسخة A)
-- ═══════════════════════════════════════════════════════════════
\echo '🔍 فحص أعمدة النسخة A (WhatsApp Reminders):'
\echo ''

SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'reminder_schedules'
              AND column_name = 'phone_number'
        ) THEN '✅ phone_number موجود'
        ELSE '❌ phone_number غير موجود'
    END as phone_number_status,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'reminder_schedules'
              AND column_name = 'customer_name'
        ) THEN '✅ customer_name موجود'
        ELSE '❌ customer_name غير موجود'
    END as customer_name_status,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'reminder_schedules'
              AND column_name = 'message_template'
        ) THEN '✅ message_template موجود'
        ELSE '❌ message_template غير موجود'
    END as message_template_status,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'reminder_schedules'
              AND column_name = 'reminder_type'
        ) THEN '✅ reminder_type موجود'
        ELSE '❌ reminder_type غير موجود'
    END as reminder_type_status,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'reminder_schedules'
              AND column_name = 'last_error'
        ) THEN '✅ last_error موجود'
        ELSE '❌ last_error غير موجود'
    END as last_error_status,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'reminder_schedules'
              AND column_name = 'next_retry_at'
        ) THEN '✅ next_retry_at موجود'
        ELSE '❌ next_retry_at غير موجود'
    END as next_retry_at_status;

\echo ''
\echo '─────────────────────────────────────────────────────'
\echo ''

-- ═══════════════════════════════════════════════════════════════
-- 3. فحص الأعمدة المتوقعة (النسخة B)
-- ═══════════════════════════════════════════════════════════════
\echo '🔍 فحص أعمدة النسخة B (Template System):'
\echo ''

SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'reminder_schedules'
              AND column_name = 'template_id'
        ) THEN '✅ template_id موجود'
        ELSE '❌ template_id غير موجود'
    END as template_id_status,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'reminder_schedules'
              AND column_name = 'error_message'
        ) THEN '✅ error_message موجود'
        ELSE '❌ error_message غير موجود'
    END as error_message_status,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'reminder_schedules'
              AND column_name = 'scheduled_time'
        ) AND EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'reminder_schedules'
              AND column_name = 'scheduled_time'
              AND data_type = 'text'
        ) THEN '✅ scheduled_time (text) موجود'
        ELSE '❌ scheduled_time (text) غير موجود'
    END as scheduled_time_status;

\echo ''
\echo '─────────────────────────────────────────────────────'
\echo ''

-- ═══════════════════════════════════════════════════════════════
-- 4. فحص Foreign Keys
-- ═══════════════════════════════════════════════════════════════
\echo '🔗 Foreign Keys:'
\echo ''

SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'reminder_schedules';

\echo ''
\echo '─────────────────────────────────────────────────────'
\echo ''

-- ═══════════════════════════════════════════════════════════════
-- 5. فحص Indexes
-- ═══════════════════════════════════════════════════════════════
\echo '📑 Indexes:'
\echo ''

SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'reminder_schedules'
ORDER BY indexname;

\echo ''
\echo '─────────────────────────────────────────────────────'
\echo ''

-- ═══════════════════════════════════════════════════════════════
-- 6. فحص Constraints
-- ═══════════════════════════════════════════════════════════════
\echo '🔒 Constraints:'
\echo ''

SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.reminder_schedules'::regclass
ORDER BY contype, conname;

\echo ''
\echo '─────────────────────────────────────────────────────'
\echo ''

-- ═══════════════════════════════════════════════════════════════
-- 7. فحص عدد السجلات
-- ═══════════════════════════════════════════════════════════════
\echo '📊 إحصائيات الجدول:'
\echo ''

SELECT 
    COUNT(*) as total_records,
    COUNT(DISTINCT status) as distinct_statuses,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count
FROM reminder_schedules;

\echo ''
\echo '─────────────────────────────────────────────────────'
\echo ''

-- ═══════════════════════════════════════════════════════════════
-- 8. فحص Migrations المطبقة
-- ═══════════════════════════════════════════════════════════════
\echo '📦 Migrations المتعلقة بـ reminder:'
\echo ''

-- ملاحظة: هذا يعتمد على كيفية تتبع migrations في Supabase
-- قد تحتاج تعديل اسم الجدول
SELECT 
    version,
    name,
    executed_at
FROM supabase_migrations.schema_migrations
WHERE name LIKE '%reminder%'
   OR version LIKE '%20250126%'
ORDER BY version;

\echo ''
\echo '═══════════════════════════════════════════════════════'
\echo '                   ملخص النتائج                        '
\echo '═══════════════════════════════════════════════════════'
\echo ''

DO $$
DECLARE
    has_phone_number BOOLEAN;
    has_template_id BOOLEAN;
    has_last_error BOOLEAN;
    has_error_message BOOLEAN;
    version_type TEXT;
BEGIN
    -- فحص الأعمدة
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'reminder_schedules'
          AND column_name = 'phone_number'
    ) INTO has_phone_number;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'reminder_schedules'
          AND column_name = 'template_id'
    ) INTO has_template_id;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'reminder_schedules'
          AND column_name = 'last_error'
    ) INTO has_last_error;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'reminder_schedules'
          AND column_name = 'error_message'
    ) INTO has_error_message;
    
    -- تحديد النسخة
    IF has_phone_number AND NOT has_template_id THEN
        version_type := 'النسخة A: WhatsApp Reminders (20250126130000)';
    ELSIF has_template_id AND NOT has_phone_number THEN
        version_type := 'النسخة B: Template System (20250126_reminder_templates)';
    ELSIF has_phone_number AND has_template_id THEN
        version_type := 'نسخة مدمجة (تحتوي على أعمدة النسختين)';
    ELSE
        version_type := 'نسخة غير معروفة!';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════';
    RAISE NOTICE 'النتيجة النهائية:';
    RAISE NOTICE '═══════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'البنية المطبقة: %', version_type;
    RAISE NOTICE '';
    
    IF has_phone_number THEN
        RAISE NOTICE '  ✅ phone_number: موجود';
    ELSE
        RAISE NOTICE '  ❌ phone_number: غير موجود';
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
    RAISE NOTICE 'التوصية:';
    IF has_phone_number AND NOT has_template_id THEN
        RAISE NOTICE '  → النسخة A مطبقة. استخدم الملفات الأصلية.';
    ELSIF has_template_id AND NOT has_phone_number THEN
        RAISE NOTICE '  → النسخة B مطبقة. تحتاج migration توحيد.';
        RAISE NOTICE '  → أو اعمل مع البنية الحالية (template-based).';
    ELSIF has_phone_number AND has_template_id THEN
        RAISE NOTICE '  → النسختان مدمجتان. يمكن العمل مباشرة.';
    ELSE
        RAISE NOTICE '  → ⚠️ بنية غير متوقعة! مراجعة يدوية مطلوبة.';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════';
END $$;

\echo ''
\echo 'اكتمل الفحص ✅'
\echo ''

