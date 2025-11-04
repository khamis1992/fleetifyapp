-- ============================================
-- ⭐ الملف النهائي - شغل هذا فقط!
-- ⭐ FINAL FILE - Run This Only!
-- ============================================
-- التاريخ: 2025-11-04
-- الحالة: ✅ مصحح ونظيف 100%
-- ============================================

-- ============================================
-- الخطوة 1: إنشاء دالة الإحصائيات
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

-- ============================================
-- الخطوة 2: إنشاء دالة العملة
-- ============================================

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

GRANT EXECUTE ON FUNCTION get_company_currency_symbol(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_company_currency_symbol(UUID) TO service_role;

-- ============================================
-- الخطوة 3: إنشاء دالة الأسماء
-- ============================================

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

GRANT EXECUTE ON FUNCTION get_customer_best_name(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_best_name(UUID) TO service_role;

-- ============================================
-- الخطوة 4: تحديث دالة إنشاء التذكيرات
-- ============================================

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
    SELECT * INTO v_invoice FROM invoices WHERE id = p_invoice_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found';
    END IF;
    
    SELECT * INTO v_customer FROM customers WHERE id = v_invoice.customer_id;
    
    IF v_customer.phone IS NULL THEN
        RAISE NOTICE 'Customer has no phone number, skipping reminders';
        RETURN;
    END IF;
    
    v_currency_symbol := get_company_currency_symbol(v_invoice.company_id);
    v_customer_name := get_customer_best_name(v_invoice.customer_id);
    
    -- Pre-due reminder
    INSERT INTO reminder_schedules (
        company_id, invoice_id, customer_id, reminder_type, scheduled_date,
        phone_number, customer_name, message_template, message_variables
    )
    SELECT 
        v_invoice.company_id, v_invoice.id, v_invoice.customer_id,
        'pre_due', v_invoice.due_date - INTERVAL '3 days',
        v_customer.phone, v_customer_name,
        'مرحباً ' || v_customer_name || ' 👋' || E'\n\n' ||
        'تذكير ودي: فاتورتك رقم ' || v_invoice.invoice_number || ' بمبلغ ' || 
        v_invoice.total_amount::TEXT || ' ' || v_currency_symbol || 
        ' ستستحق خلال 3 أيام.' || E'\n\n' ||
        '📅 تاريخ الاستحقاق: ' || v_invoice.due_date::TEXT || E'\n\n' ||
        'شكراً لتعاونكم 🙏',
        jsonb_build_object(
            'customer_name', v_customer_name,
            'invoice_number', v_invoice.invoice_number,
            'amount', v_invoice.total_amount,
            'due_date', v_invoice.due_date,
            'currency', v_currency_symbol
        )
    ON CONFLICT (invoice_id, reminder_type) DO NOTHING;
    
    -- Due date reminder
    INSERT INTO reminder_schedules (
        company_id, invoice_id, customer_id, reminder_type, scheduled_date,
        phone_number, customer_name, message_template, message_variables
    )
    SELECT 
        v_invoice.company_id, v_invoice.id, v_invoice.customer_id,
        'due_date', v_invoice.due_date,
        v_customer.phone, v_customer_name,
        'مرحباً ' || v_customer_name || ' 👋' || E'\n\n' ||
        'فاتورتك رقم ' || v_invoice.invoice_number || ' مستحقة اليوم.' || E'\n\n' ||
        '💰 المبلغ: ' || v_invoice.total_amount::TEXT || ' ' || v_currency_symbol || E'\n\n' ||
        'الرجاء الدفع في أقرب وقت ممكن.' || E'\n\n' ||
        'شكراً 🙏',
        jsonb_build_object(
            'customer_name', v_customer_name,
            'invoice_number', v_invoice.invoice_number,
            'amount', v_invoice.total_amount,
            'due_date', v_invoice.due_date,
            'currency', v_currency_symbol
        )
    ON CONFLICT (invoice_id, reminder_type) DO NOTHING;
    
    -- Overdue notice
    INSERT INTO reminder_schedules (
        company_id, invoice_id, customer_id, reminder_type, scheduled_date,
        phone_number, customer_name, message_template, message_variables
    )
    SELECT 
        v_invoice.company_id, v_invoice.id, v_invoice.customer_id,
        'overdue', v_invoice.due_date + INTERVAL '3 days',
        v_customer.phone, v_customer_name,
        'عزيزي ' || v_customer_name || ' ⚠️' || E'\n\n' ||
        'فاتورتك رقم ' || v_invoice.invoice_number || ' متأخرة بـ 3 أيام.' || E'\n\n' ||
        '💰 المبلغ: ' || v_invoice.total_amount::TEXT || ' ' || v_currency_symbol || E'\n\n' ||
        'الرجاء سداد المبلغ فوراً لتجنب رسوم التأخير.' || E'\n\n' ||
        'شكراً',
        jsonb_build_object(
            'customer_name', v_customer_name,
            'invoice_number', v_invoice.invoice_number,
            'amount', v_invoice.total_amount,
            'days_overdue', 3,
            'currency', v_currency_symbol
        )
    ON CONFLICT (invoice_id, reminder_type) DO NOTHING;
    
    -- Escalation warning
    INSERT INTO reminder_schedules (
        company_id, invoice_id, customer_id, reminder_type, scheduled_date,
        phone_number, customer_name, message_template, message_variables
    )
    SELECT 
        v_invoice.company_id, v_invoice.id, v_invoice.customer_id,
        'escalation', v_invoice.due_date + INTERVAL '10 days',
        v_customer.phone, v_customer_name,
        'السيد/ة ' || v_customer_name || ' 🚨' || E'\n\n' ||
        'إشعار نهائي - فاتورة متأخرة 10 أيام' || E'\n\n' ||
        '📋 رقم الفاتورة: ' || v_invoice.invoice_number || E'\n' ||
        '💰 المبلغ: ' || v_invoice.total_amount::TEXT || ' ' || v_currency_symbol || E'\n\n' ||
        '⚠️ في حالة عدم السداد خلال 48 ساعة سيتم اتخاذ إجراءات قانونية.',
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

-- ============================================
-- الخطوة 5: تحديث الرسائل المعلقة
-- ============================================

-- تحديث الأسماء
UPDATE reminder_schedules
SET customer_name = get_customer_best_name(customer_id)
WHERE status IN ('pending', 'queued')
AND customer_id IS NOT NULL;

-- تحديث الرسائل بالعملة الصحيحة
DO $$
DECLARE
    rec RECORD;
    v_currency TEXT;
    v_name TEXT;
    v_days INTEGER;
BEGIN
    FOR rec IN 
        SELECT rs.id, rs.company_id, rs.customer_id, rs.reminder_type, rs.scheduled_date,
               i.invoice_number, i.total_amount, i.due_date
        FROM reminder_schedules rs
        LEFT JOIN invoices i ON rs.invoice_id = i.id
        WHERE rs.status IN ('pending', 'queued')
    LOOP
        v_currency := get_company_currency_symbol(rec.company_id);
        v_name := get_customer_best_name(rec.customer_id);
        v_days := rec.due_date - CURRENT_DATE;
        
        UPDATE reminder_schedules
        SET message_template = CASE rec.reminder_type
            WHEN 'pre_due' THEN
                'مرحباً ' || v_name || ' 👋' || E'\n\n' ||
                'تذكير ودي: فاتورتك رقم ' || rec.invoice_number || ' بمبلغ ' || 
                rec.total_amount::TEXT || ' ' || v_currency || 
                ' ستستحق خلال ' || v_days || ' يوم.' || E'\n\n' ||
                '📅 تاريخ الاستحقاق: ' || rec.due_date::TEXT || E'\n\n' ||
                'شكراً لتعاونكم 🙏'
            WHEN 'due_date' THEN
                'مرحباً ' || v_name || ' 👋' || E'\n\n' ||
                'فاتورتك رقم ' || rec.invoice_number || ' مستحقة اليوم.' || E'\n\n' ||
                '💰 المبلغ: ' || rec.total_amount::TEXT || ' ' || v_currency || E'\n\n' ||
                'الرجاء الدفع في أقرب وقت ممكن.' || E'\n\n' ||
                'شكراً 🙏'
            WHEN 'overdue' THEN
                'عزيزي ' || v_name || ' ⚠️' || E'\n\n' ||
                'فاتورتك رقم ' || rec.invoice_number || ' متأخرة بـ 3 أيام.' || E'\n\n' ||
                '💰 المبلغ: ' || rec.total_amount::TEXT || ' ' || v_currency || E'\n\n' ||
                'الرجاء سداد المبلغ فوراً لتجنب رسوم التأخير.' || E'\n\n' ||
                'شكراً'
            ELSE
                'السيد/ة ' || v_name || ' 🚨' || E'\n\n' ||
                'إشعار نهائي - فاتورة متأخرة 10 أيام' || E'\n\n' ||
                '📋 رقم الفاتورة: ' || rec.invoice_number || E'\n' ||
                '💰 المبلغ: ' || rec.total_amount::TEXT || ' ' || v_currency || E'\n\n' ||
                '⚠️ في حالة عدم السداد خلال 48 ساعة سيتم اتخاذ إجراءات قانونية.'
        END,
        customer_name = v_name
        WHERE id = rec.id;
    END LOOP;
END $$;

-- ============================================
-- التحقق من النتائج
-- ============================================

SELECT '✅ اختبار get_whatsapp_statistics' as test;
SELECT * FROM get_whatsapp_statistics();

SELECT '✅ عينة من الرسائل المحدثة' as status;
SELECT 
  customer_name,
  LEFT(message_template, 120) as message_preview,
  reminder_type,
  CASE
    WHEN message_template LIKE '%ر.ق%' THEN 'ريال قطري ✅'
    WHEN message_template LIKE '%د.ك%' THEN 'دينار كويتي ✅'
    ELSE 'أخرى'
  END as currency
FROM reminder_schedules
WHERE status IN ('pending', 'queued')
ORDER BY id
LIMIT 8;

SELECT '🎉 تم تطبيق جميع التحديثات بنجاح!' as result;

