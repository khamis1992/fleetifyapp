-- ============================================
-- تطبيق دالة الإحصائيات - تنفيذ مباشر
-- Apply Statistics Function - Direct Execution
-- ============================================
-- انسخ والصق هذا الكود في Supabase SQL Editor
-- ============================================

-- الخطوة 1: إنشاء دالة الإحصائيات
CREATE OR REPLACE FUNCTION get_whatsapp_statistics()
RETURNS TABLE (
  total_reminders BIGINT,
  sent_count BIGINT,
  failed_count BIGINT,
  pending_count BIGINT,
  cancelled_count BIGINT,
  unique_customers BIGINT,
  unique_invoices BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_reminders,
    COUNT(*) FILTER (WHERE status = 'sent')::BIGINT as sent_count,
    COUNT(*) FILTER (WHERE status = 'failed')::BIGINT as failed_count,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT as pending_count,
    COUNT(*) FILTER (WHERE status = 'cancelled')::BIGINT as cancelled_count,
    COUNT(DISTINCT customer_id)::BIGINT as unique_customers,
    COUNT(DISTINCT invoice_id)::BIGINT as unique_invoices
  FROM reminder_schedules;
END;
$$;

-- الخطوة 2: منح الصلاحيات
GRANT EXECUTE ON FUNCTION get_whatsapp_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_whatsapp_statistics() TO service_role;

-- الخطوة 3: اختبار الدالة
SELECT * FROM get_whatsapp_statistics();

-- النتيجة المتوقعة:
-- total_reminders | sent_count | failed_count | pending_count | cancelled_count | unique_customers | unique_invoices
-- ✅ إذا ظهرت البيانات بنجاح، فإن الدالة تعمل بشكل صحيح!

