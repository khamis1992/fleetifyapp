-- فحص سريع لبنية reminder_schedules
-- =====================================

-- 1. جميع الأعمدة
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'reminder_schedules'
ORDER BY ordinal_position;

-- 2. فحص الأعمدة الحرجة
SELECT 
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reminder_schedules' AND column_name = 'phone_number') as has_phone_number,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reminder_schedules' AND column_name = 'customer_name') as has_customer_name,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reminder_schedules' AND column_name = 'message_template') as has_message_template,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reminder_schedules' AND column_name = 'reminder_type') as has_reminder_type,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reminder_schedules' AND column_name = 'template_id') as has_template_id,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reminder_schedules' AND column_name = 'last_error') as has_last_error,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reminder_schedules' AND column_name = 'error_message') as has_error_message,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reminder_schedules' AND column_name = 'next_retry_at') as has_next_retry_at;

-- 3. إحصائيات بسيطة
SELECT 
    COUNT(*) as total_reminders,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'sent') as sent,
    COUNT(*) FILTER (WHERE status = 'failed') as failed,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled
FROM reminder_schedules;

-- 4. Foreign Keys
SELECT 
    tc.constraint_name,
    kcu.column_name as column_name,
    ccu.table_name as references_table,
    ccu.column_name as references_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'reminder_schedules';

