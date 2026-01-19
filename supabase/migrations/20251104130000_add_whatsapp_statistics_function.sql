-- ============================================
-- دالة للحصول على إحصائيات رسائل WhatsApp
-- Get WhatsApp Statistics Function
-- ============================================
-- التاريخ: 2025-11-04
-- الغرض: توفير إحصائيات شاملة لنظام التذكيرات
-- ============================================

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

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION get_whatsapp_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_whatsapp_statistics() TO service_role;

-- تعليق على الدالة
COMMENT ON FUNCTION get_whatsapp_statistics() IS 'Returns comprehensive statistics about WhatsApp reminder messages';

