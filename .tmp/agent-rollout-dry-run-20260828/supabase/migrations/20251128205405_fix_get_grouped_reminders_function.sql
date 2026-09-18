-- إصلاح دالة get_grouped_reminders_for_today
-- المشاكل:
-- 1. تبحث عن status = 'queued' بينما التذكيرات في حالة 'pending'
-- 2. استخدام MIN(uuid) غير مدعوم

CREATE OR REPLACE FUNCTION public.get_grouped_reminders_for_today()
RETURNS TABLE(
    customer_id uuid, 
    customer_name text, 
    phone_number text, 
    company_id uuid, 
    invoices_data jsonb, 
    total_amount numeric, 
    invoice_count integer, 
    reminder_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        rs.customer_id,
        (array_agg(rs.customer_name))[1] as customer_name,
        (array_agg(rs.phone_number))[1] as phone_number,
        (array_agg(rs.company_id))[1] as company_id,
        jsonb_agg(
            jsonb_build_object(
                'invoice_number', i.invoice_number,
                'amount', i.total_amount,
                'due_date', i.due_date,
                'invoice_id', i.id,
                'reminder_id', rs.id
            ) ORDER BY i.due_date
        ) as invoices_data,
        SUM(i.total_amount) as total_amount,
        COUNT(DISTINCT i.id)::INTEGER as invoice_count,
        rs.reminder_type
    FROM reminder_schedules rs
    INNER JOIN invoices i ON i.id = rs.invoice_id
    WHERE rs.status IN ('pending', 'queued')  -- البحث عن pending أو queued
      AND rs.scheduled_date <= CURRENT_DATE
      AND i.payment_status = 'unpaid'
    GROUP BY rs.customer_id, rs.reminder_type
    ORDER BY rs.customer_id, rs.reminder_type;
END;
$function$;;
