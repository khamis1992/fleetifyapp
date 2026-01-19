-- ============================================
-- تطبيق جميع Migrations المعلقة
-- Apply All Pending Migrations
-- ============================================
-- التاريخ: 2025-11-04
-- الملفات المضمنة:
--   1. add_whatsapp_statistics_function
--   2. fix_whatsapp_reminders_currency_names
-- ============================================

-- ============================================
-- Migration 1: دالة إحصائيات WhatsApp
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

GRANT EXECUTE ON FUNCTION get_whatsapp_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_whatsapp_statistics() TO service_role;

COMMENT ON FUNCTION get_whatsapp_statistics() IS 'Returns comprehensive statistics about WhatsApp reminder messages';

-- ============================================
-- Migration 2: إصلاح العملة والأسماء
-- ============================================

-- دالة العملة
CREATE OR REPLACE FUNCTION get_company_currency_symbol(p_company_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_currency TEXT;
BEGIN
    SELECT currency INTO v_currency
    FROM companies
    WHERE id = p_company_id;
    
    RETURN CASE 
        WHEN v_currency = 'KWD' THEN 'د.ك'
        WHEN v_currency = 'QAR' THEN 'ر.ق'
        WHEN v_currency = 'SAR' THEN 'ر.س'
        WHEN v_currency = 'AED' THEN 'د.إ'
        WHEN v_currency = 'BHD' THEN 'د.ب'
        WHEN v_currency = 'OMR' THEN 'ر.ع'
        WHEN v_currency = 'USD' THEN '$'
        WHEN v_currency = 'EUR' THEN '€'
        ELSE 'د.ك'
    END;
END;
$$;

-- دالة الأسماء
CREATE OR REPLACE FUNCTION get_customer_best_name(p_customer_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_customer RECORD;
    v_name TEXT;
BEGIN
    SELECT * INTO v_customer
    FROM customers
    WHERE id = p_customer_id;
    
    -- البحث عن أفضل اسم متاح
    IF v_customer.first_name_ar IS NOT NULL AND TRIM(v_customer.first_name_ar) != '' THEN
        IF v_customer.last_name_ar IS NOT NULL AND TRIM(v_customer.last_name_ar) != '' THEN
            v_name := TRIM(v_customer.first_name_ar) || ' ' || TRIM(v_customer.last_name_ar);
        ELSE
            v_name := TRIM(v_customer.first_name_ar);
        END IF;
    ELSIF v_customer.company_name IS NOT NULL AND TRIM(v_customer.company_name) != '' THEN
        v_name := TRIM(v_customer.company_name);
    ELSIF v_customer.first_name IS NOT NULL AND TRIM(v_customer.first_name) != '' THEN
        IF v_customer.last_name IS NOT NULL AND TRIM(v_customer.last_name) != '' THEN
            v_name := TRIM(v_customer.first_name) || ' ' || TRIM(v_customer.last_name);
        ELSE
            v_name := TRIM(v_customer.first_name);
        END IF;
    ELSE
        v_name := 'عزيزي العميل';
    END IF;
    
    RETURN v_name;
END;
$$;

-- تحديث دالة إنشاء التذكيرات
CREATE OR REPLACE FUNCTION generate_reminder_schedules(p_invoice_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_invoice RECORD;
    v_customer RECORD;
    v_currency_symbol TEXT;
    v_customer_name TEXT;
BEGIN
    -- Get invoice details
    SELECT * INTO v_invoice
    FROM invoices
    WHERE id = p_invoice_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found';
    END IF;
    
    -- Get customer details
    SELECT * INTO v_customer
    FROM customers
    WHERE id = v_invoice.customer_id;
    
    IF v_customer.phone IS NULL THEN
        RAISE NOTICE 'Customer has no phone number, skipping reminders';
        RETURN;
    END IF;
    
    -- الحصول على رمز العملة الصحيح
    v_currency_symbol := get_company_currency_symbol(v_invoice.company_id);
    
    -- الحصول على أفضل اسم متاح
    v_customer_name := get_customer_best_name(v_invoice.customer_id);
    
    -- Create 4 reminder schedules
    
    -- 1. Pre-due reminder (-3 days)
    INSERT INTO reminder_schedules (
        company_id, invoice_id, customer_id,
        reminder_type, scheduled_date,
        phone_number, customer_name,
        message_template, message_variables
    )
    SELECT 
        v_invoice.company_id,
        v_invoice.id,
        v_invoice.customer_id,
        'pre_due',
        v_invoice.due_date - INTERVAL '3 days',
        v_customer.phone,
        v_customer_name,
        COALESCE(
            (SELECT template_text FROM reminder_templates 
             WHERE company_id = v_invoice.company_id 
             AND reminder_type = 'pre_due' 
             AND is_active = true 
             LIMIT 1),
            'مرحباً ' || v_customer_name || ' 👋' || E'\n\n' ||
            'تذكير ودي: فاتورتك رقم ' || v_invoice.invoice_number || ' بمبلغ ' || 
            v_invoice.total_amount::TEXT || ' ' || v_currency_symbol || 
            ' ستستحق خلال 3 أيام.' || E'\n\n' ||
            '📅 تاريخ الاستحقاق: ' || v_invoice.due_date::TEXT || E'\n\n' ||
            'شكراً لتعاونكم 🙏'
        ),
        jsonb_build_object(
            'customer_name', v_customer_name,
            'invoice_number', v_invoice.invoice_number,
            'amount', v_invoice.total_amount,
            'due_date', v_invoice.due_date,
            'currency', v_currency_symbol
        )
    ON CONFLICT (invoice_id, reminder_type) DO NOTHING;
    
    -- 2. Due date reminder
    INSERT INTO reminder_schedules (
        company_id, invoice_id, customer_id,
        reminder_type, scheduled_date,
        phone_number, customer_name,
        message_template, message_variables
    )
    SELECT 
        v_invoice.company_id,
        v_invoice.id,
        v_invoice.customer_id,
        'due_date',
        v_invoice.due_date,
        v_customer.phone,
        v_customer_name,
        COALESCE(
            (SELECT template_text FROM reminder_templates 
             WHERE company_id = v_invoice.company_id 
             AND reminder_type = 'due_date' 
             AND is_active = true 
             LIMIT 1),
            'مرحباً ' || v_customer_name || ' 👋' || E'\n\n' ||
            'فاتورتك رقم ' || v_invoice.invoice_number || ' مستحقة اليوم.' || E'\n\n' ||
            '💰 المبلغ: ' || v_invoice.total_amount::TEXT || ' ' || v_currency_symbol || E'\n\n' ||
            'الرجاء الدفع في أقرب وقت ممكن.' || E'\n\n' ||
            'شكراً 🙏'
        ),
        jsonb_build_object(
            'customer_name', v_customer_name,
            'invoice_number', v_invoice.invoice_number,
            'amount', v_invoice.total_amount,
            'due_date', v_invoice.due_date,
            'currency', v_currency_symbol
        )
    ON CONFLICT (invoice_id, reminder_type) DO NOTHING;
    
    -- 3. Overdue notice (+3 days)
    INSERT INTO reminder_schedules (
        company_id, invoice_id, customer_id,
        reminder_type, scheduled_date,
        phone_number, customer_name,
        message_template, message_variables
    )
    SELECT 
        v_invoice.company_id,
        v_invoice.id,
        v_invoice.customer_id,
        'overdue',
        v_invoice.due_date + INTERVAL '3 days',
        v_customer.phone,
        v_customer_name,
        COALESCE(
            (SELECT template_text FROM reminder_templates 
             WHERE company_id = v_invoice.company_id 
             AND reminder_type = 'overdue' 
             AND is_active = true 
             LIMIT 1),
            'عزيزي ' || v_customer_name || ' ⚠️' || E'\n\n' ||
            'فاتورتك رقم ' || v_invoice.invoice_number || ' متأخرة بـ 3 أيام.' || E'\n\n' ||
            '💰 المبلغ: ' || v_invoice.total_amount::TEXT || ' ' || v_currency_symbol || E'\n\n' ||
            'الرجاء سداد المبلغ فوراً لتجنب رسوم التأخير.' || E'\n\n' ||
            'شكراً'
        ),
        jsonb_build_object(
            'customer_name', v_customer_name,
            'invoice_number', v_invoice.invoice_number,
            'amount', v_invoice.total_amount,
            'days_overdue', 3,
            'currency', v_currency_symbol
        )
    ON CONFLICT (invoice_id, reminder_type) DO NOTHING;
    
    -- 4. Escalation warning (+10 days)
    INSERT INTO reminder_schedules (
        company_id, invoice_id, customer_id,
        reminder_type, scheduled_date,
        phone_number, customer_name,
        message_template, message_variables
    )
    SELECT 
        v_invoice.company_id,
        v_invoice.id,
        v_invoice.customer_id,
        'escalation',
        v_invoice.due_date + INTERVAL '10 days',
        v_customer.phone,
        v_customer_name,
        COALESCE(
            (SELECT template_text FROM reminder_templates 
             WHERE company_id = v_invoice.company_id 
             AND reminder_type = 'escalation' 
             AND is_active = true 
             LIMIT 1),
            'السيد/ة ' || v_customer_name || ' 🚨' || E'\n\n' ||
            'إشعار نهائي - فاتورة متأخرة 10 أيام' || E'\n\n' ||
            '📋 رقم الفاتورة: ' || v_invoice.invoice_number || E'\n' ||
            '💰 المبلغ: ' || v_invoice.total_amount::TEXT || ' ' || v_currency_symbol || E'\n\n' ||
            '⚠️ في حالة عدم السداد خلال 48 ساعة سيتم اتخاذ إجراءات قانونية.'
        ),
        jsonb_build_object(
            'customer_name', v_customer_name,
            'invoice_number', v_invoice.invoice_number,
            'amount', v_invoice.total_amount,
            'days_overdue', 10,
            'currency', v_currency_symbol
        )
    ON CONFLICT (invoice_id, reminder_type) DO NOTHING;
    
END;
$$;

-- تحديث الرسائل المعلقة الحالية
UPDATE reminder_schedules
SET customer_name = get_customer_best_name(customer_id)
WHERE status = 'pending'
AND customer_id IS NOT NULL;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION get_company_currency_symbol(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_company_currency_symbol(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_customer_best_name(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_best_name(UUID) TO service_role;

-- التعليقات
COMMENT ON FUNCTION get_company_currency_symbol(UUID) IS 'Returns the currency symbol for a company (e.g., د.ك, ر.ق)';
COMMENT ON FUNCTION get_customer_best_name(UUID) IS 'Returns the best available customer name';

-- ============================================
-- التحقق من النتائج
-- ============================================

-- اختبار الدوال
SELECT '✅ اختبار get_whatsapp_statistics' as test;
SELECT * FROM get_whatsapp_statistics();

-- اختبار دالة العملة
SELECT '✅ اختبار get_company_currency_symbol' as test;
SELECT 
  comp.name,
  comp.currency,
  get_company_currency_symbol(comp.id) as currency_symbol
FROM companies comp
LIMIT 5;

-- اختبار دالة الأسماء
SELECT '✅ اختبار get_customer_best_name' as test;
SELECT 
  c.id,
  get_customer_best_name(c.id) as best_name,
  c.first_name_ar,
  c.last_name_ar,
  c.company_name
FROM customers c
LIMIT 10;

-- عرض عينة من الرسائل المحدثة
SELECT 
  '✅ عينة من الرسائل المحدثة' as status,
  customer_name,
  LEFT(message_template, 100) as message_preview,
  reminder_type
FROM reminder_schedules
WHERE status = 'pending'
ORDER BY id
LIMIT 5;

-- النتيجة النهائية
SELECT '🎉 تم تطبيق جميع Migrations بنجاح!' as result;

