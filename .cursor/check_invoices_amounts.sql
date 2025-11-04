-- ============================================
-- فحص مبالغ الفواتير المختلفة
-- Check Different Invoice Amounts
-- ============================================

-- 1. عرض جميع الفواتير مع مبالغها
SELECT 
  'جميع الفواتير المرتبطة بالتذكيرات' as status,
  i.invoice_number,
  i.total_amount,
  i.due_date,
  c.first_name_ar || ' ' || c.last_name_ar as customer_name,
  comp.name as company_name,
  comp.currency,
  rs.status as reminder_status
FROM reminder_schedules rs
LEFT JOIN invoices i ON rs.invoice_id = i.id
LEFT JOIN customers c ON rs.customer_id = c.id
LEFT JOIN companies comp ON rs.company_id = comp.id
ORDER BY i.total_amount DESC
LIMIT 20;

-- 2. إحصائيات المبالغ
SELECT 
  'إحصائيات المبالغ' as status,
  COUNT(DISTINCT i.total_amount) as different_amounts,
  MIN(i.total_amount) as min_amount,
  MAX(i.total_amount) as max_amount,
  AVG(i.total_amount) as avg_amount,
  COUNT(*) as total_invoices
FROM reminder_schedules rs
LEFT JOIN invoices i ON rs.invoice_id = i.id
WHERE rs.status IN ('pending', 'queued');

-- 3. توزيع المبالغ
SELECT 
  'توزيع المبالغ المختلفة' as status,
  i.total_amount,
  COUNT(*) as count,
  comp.currency
FROM reminder_schedules rs
LEFT JOIN invoices i ON rs.invoice_id = i.id
LEFT JOIN companies comp ON rs.company_id = comp.id
WHERE rs.status IN ('pending', 'queued')
GROUP BY i.total_amount, comp.currency
ORDER BY count DESC
LIMIT 15;

-- 4. عينة من الرسائل مع المبالغ
SELECT 
  'عينة من الرسائل مع المبالغ' as status,
  rs.customer_name,
  i.invoice_number,
  i.total_amount,
  CASE 
    WHEN rs.message_template LIKE '%' || i.total_amount::TEXT || '%' THEN '✅ المبلغ موجود'
    ELSE '❌ المبلغ غير موجود'
  END as amount_in_message,
  LEFT(rs.message_template, 150) as message_preview
FROM reminder_schedules rs
LEFT JOIN invoices i ON rs.invoice_id = i.id
WHERE rs.status IN ('pending', 'queued')
ORDER BY i.total_amount DESC
LIMIT 10;

-- 5. التحقق من الرسالة المرسلة (1700)
SELECT 
  'الرسالة التي استلمتها (1700)' as status,
  rs.customer_name,
  i.invoice_number,
  i.total_amount,
  i.due_date,
  rs.sent_at,
  rs.message_template
FROM reminder_schedules rs
LEFT JOIN invoices i ON rs.invoice_id = i.id
WHERE rs.status = 'sent'
AND i.total_amount = 1700
LIMIT 5;

