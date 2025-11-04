-- ============================================
-- تقرير شامل لرسائل WhatsApp المرسلة
-- WhatsApp Messages Sent Report
-- ============================================
-- التاريخ: 2025-11-04
-- الغرض: عرض سجل كامل لجميع الرسائل مع التفاصيل
-- ============================================

-- ===========================================
-- القسم 1: ملخص إحصائي عام
-- ===========================================
WITH stats AS (
  SELECT 
    COUNT(*) as total_reminders,
    COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
    COUNT(DISTINCT customer_id) as unique_customers,
    COUNT(DISTINCT invoice_id) as unique_invoices
  FROM reminder_schedules
)
SELECT 
  '📊 OVERALL STATISTICS' as section,
  to_jsonb(stats.*) as data
FROM stats;

-- ===========================================
-- القسم 2: إحصائيات حسب نوع التذكير
-- ===========================================
SELECT 
  '📈 BY REMINDER TYPE' as section,
  jsonb_agg(
    jsonb_build_object(
      'reminder_type', reminder_type,
      'total', total,
      'sent', sent,
      'failed', failed,
      'pending', pending
    )
  ) as data
FROM (
  SELECT 
    reminder_type,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'sent') as sent,
    COUNT(*) FILTER (WHERE status = 'failed') as failed,
    COUNT(*) FILTER (WHERE status = 'pending') as pending
  FROM reminder_schedules
  GROUP BY reminder_type
  ORDER BY reminder_type
) type_stats;

-- ===========================================
-- القسم 3: جميع الرسائل المرسلة بنجاح
-- ===========================================
SELECT 
  '✅ SUCCESSFULLY SENT MESSAGES' as section,
  jsonb_agg(
    jsonb_build_object(
      'id', rs.id,
      'sent_at', rs.sent_at,
      'customer_name', rs.customer_name,
      'phone_number', rs.phone_number,
      'reminder_type', rs.reminder_type,
      'invoice_number', i.invoice_number,
      'amount', i.total_amount,
      'due_date', i.due_date,
      'scheduled_date', rs.scheduled_date,
      'delivery_status', rs.delivery_status,
      'message_preview', LEFT(rs.message_template, 100) || '...'
    ) ORDER BY rs.sent_at DESC
  ) as data
FROM reminder_schedules rs
LEFT JOIN invoices i ON rs.invoice_id = i.id
WHERE rs.status = 'sent'
ORDER BY rs.sent_at DESC;

-- ===========================================
-- القسم 4: الرسائل الفاشلة (إن وجدت)
-- ===========================================
SELECT 
  '❌ FAILED MESSAGES' as section,
  jsonb_agg(
    jsonb_build_object(
      'id', rs.id,
      'customer_name', rs.customer_name,
      'phone_number', rs.phone_number,
      'reminder_type', rs.reminder_type,
      'scheduled_date', rs.scheduled_date,
      'retry_count', rs.retry_count,
      'last_error', rs.last_error,
      'next_retry_at', rs.next_retry_at
    ) ORDER BY rs.updated_at DESC
  ) as data
FROM reminder_schedules rs
WHERE rs.status = 'failed';

-- ===========================================
-- القسم 5: الرسائل المعلقة (قادمة)
-- ===========================================
SELECT 
  '⏰ PENDING MESSAGES' as section,
  jsonb_agg(
    jsonb_build_object(
      'id', rs.id,
      'scheduled_date', rs.scheduled_date,
      'scheduled_time', rs.scheduled_time,
      'customer_name', rs.customer_name,
      'phone_number', rs.phone_number,
      'reminder_type', rs.reminder_type,
      'invoice_number', i.invoice_number,
      'amount', i.total_amount,
      'due_date', i.due_date,
      'days_until_send', (rs.scheduled_date - CURRENT_DATE)
    ) ORDER BY rs.scheduled_date
  ) as data
FROM reminder_schedules rs
LEFT JOIN invoices i ON rs.invoice_id = i.id
WHERE rs.status = 'pending'
ORDER BY rs.scheduled_date;

-- ===========================================
-- القسم 6: سجل التاريخ التفصيلي
-- ===========================================
SELECT 
  '📜 DETAILED HISTORY LOG' as section,
  jsonb_agg(
    jsonb_build_object(
      'id', rh.id,
      'action', rh.action,
      'success', rh.success,
      'created_at', rh.created_at,
      'customer_name', rs.customer_name,
      'phone_number', rh.phone_number,
      'message_sent', LEFT(rh.message_sent, 150) || '...',
      'error_message', rh.error_message
    ) ORDER BY rh.created_at DESC
  ) as data
FROM reminder_history rh
LEFT JOIN reminder_schedules rs ON rh.reminder_schedule_id = rs.id
ORDER BY rh.created_at DESC;

-- ===========================================
-- القسم 7: أداء النظام اليومي
-- ===========================================
SELECT 
  '📅 DAILY PERFORMANCE' as section,
  jsonb_agg(
    jsonb_build_object(
      'date', send_date,
      'total_sent', total_sent,
      'success_rate', success_rate || '%',
      'average_retry', avg_retry
    ) ORDER BY send_date DESC
  ) as data
FROM (
  SELECT 
    DATE(sent_at) as send_date,
    COUNT(*) as total_sent,
    ROUND(
      COUNT(*) FILTER (WHERE delivery_status = 'sent')::numeric / 
      NULLIF(COUNT(*), 0) * 100, 
      2
    ) as success_rate,
    ROUND(AVG(retry_count), 2) as avg_retry
  FROM reminder_schedules
  WHERE sent_at IS NOT NULL
  GROUP BY DATE(sent_at)
  ORDER BY send_date DESC
  LIMIT 30
) daily_stats;

-- ===========================================
-- القسم 8: أفضل 10 عملاء (الأكثر تلقياً للرسائل)
-- ===========================================
SELECT 
  '👥 TOP 10 CUSTOMERS' as section,
  jsonb_agg(
    jsonb_build_object(
      'customer_name', customer_name,
      'phone_number', phone_number,
      'total_reminders', total_reminders,
      'sent', sent_count,
      'pending', pending_count
    ) ORDER BY total_reminders DESC
  ) as data
FROM (
  SELECT 
    customer_name,
    phone_number,
    COUNT(*) as total_reminders,
    COUNT(*) FILTER (WHERE status = 'sent') as sent_count,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count
  FROM reminder_schedules
  GROUP BY customer_name, phone_number
  ORDER BY total_reminders DESC
  LIMIT 10
) top_customers;

-- ===========================================
-- القسم 9: حالة اتصال WhatsApp
-- ===========================================
SELECT 
  '🔌 WHATSAPP CONNECTION STATUS' as section,
  jsonb_agg(
    jsonb_build_object(
      'company_id', company_id,
      'is_connected', is_connected,
      'whatsapp_number', whatsapp_number,
      'whatsapp_name', whatsapp_name,
      'total_sent_today', total_sent_today,
      'total_sent_this_week', total_sent_this_week,
      'total_sent_this_month', total_sent_this_month,
      'last_message_sent_at', last_message_sent_at,
      'service_running', service_running,
      'last_heartbeat', last_heartbeat,
      'max_messages_per_hour', max_messages_per_hour
    )
  ) as data
FROM whatsapp_connection_status;

-- ===========================================
-- القسم 10: ملخص نهائي مفصل للرسالة التي استلمتها
-- ===========================================
SELECT 
  '🎯 YOUR SPECIFIC MESSAGE DETAILS' as section,
  jsonb_build_object(
    'message_info', jsonb_agg(
      jsonb_build_object(
        'sent_at', rs.sent_at,
        'customer_name', rs.customer_name,
        'phone_number', rs.phone_number,
        'reminder_type', rs.reminder_type,
        'invoice_number', i.invoice_number,
        'amount_kwd', i.total_amount,
        'due_date', i.due_date,
        'days_before_due', (i.due_date - CURRENT_DATE),
        'full_message', rs.message_template,
        'delivery_status', rs.delivery_status,
        'scheduled_date', rs.scheduled_date
      )
    )
  ) as data
FROM reminder_schedules rs
LEFT JOIN invoices i ON rs.invoice_id = i.id
WHERE rs.status = 'sent'
  AND rs.customer_name LIKE '%محمد%'
  AND i.invoice_number = 'INV-CNT-21860-2025-010';

