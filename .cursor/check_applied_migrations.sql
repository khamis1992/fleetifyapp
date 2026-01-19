-- ============================================
-- فحص الـ Migrations المطبقة حالياً
-- Check Applied Migrations
-- ============================================

-- 1. عرض جميع الـ migrations المطبقة
SELECT 
  version,
  name,
  executed_at
FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 50;

-- 2. فحص إذا كانت migrations اليوم مطبقة
SELECT 
  'هل تم تطبيق migrations اليوم؟' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM supabase_migrations.schema_migrations 
      WHERE version = '20251104140000'
    ) THEN '✅ تم تطبيق fix_whatsapp_reminders_currency_names'
    ELSE '❌ لم يتم تطبيق fix_whatsapp_reminders_currency_names'
  END as status_1,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM supabase_migrations.schema_migrations 
      WHERE version = '20251104130000'
    ) THEN '✅ تم تطبيق add_whatsapp_statistics_function'
    ELSE '❌ لم يتم تطبيق add_whatsapp_statistics_function'
  END as status_2;

-- 3. فحص الدوال الجديدة
SELECT 
  'فحص الدوال الجديدة' as check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p 
      JOIN pg_namespace n ON p.pronamespace = n.oid 
      WHERE n.nspname = 'public' 
      AND p.proname = 'get_company_currency_symbol'
    ) THEN '✅ دالة get_company_currency_symbol موجودة'
    ELSE '❌ دالة get_company_currency_symbol غير موجودة'
  END as currency_function,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p 
      JOIN pg_namespace n ON p.pronamespace = n.oid 
      WHERE n.nspname = 'public' 
      AND p.proname = 'get_customer_best_name'
    ) THEN '✅ دالة get_customer_best_name موجودة'
    ELSE '❌ دالة get_customer_best_name غير موجودة'
  END as name_function,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p 
      JOIN pg_namespace n ON p.pronamespace = n.oid 
      WHERE n.nspname = 'public' 
      AND p.proname = 'get_whatsapp_statistics'
    ) THEN '✅ دالة get_whatsapp_statistics موجودة'
    ELSE '❌ دالة get_whatsapp_statistics غير موجودة'
  END as statistics_function;

-- 4. آخر 10 migrations
SELECT 
  'آخر 10 migrations مطبقة' as info,
  version,
  name,
  TO_CHAR(executed_at, 'YYYY-MM-DD HH24:MI:SS') as executed_at
FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 10;

