-- ============================================
-- إصلاح مشكلة العملة والأسماء في رسائل WhatsApp
-- Fix Currency and Names in WhatsApp Reminders
-- ============================================
-- التاريخ: 2025-11-04
-- المشاكل:
--   1. العملة مكتوبة "د.ك" بدلاً من أخذها من جدول الشركات
--   2. جميع الأسماء "محمد" بسبب استخدام first_name_ar فقط
-- ============================================

-- ============================================
-- الخطوة 1: إنشاء دالة للحصول على العملة الصحيحة
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
    
    -- عودة الرمز المناسب
    RETURN CASE 
        WHEN v_currency = 'KWD' THEN 'د.ك'
        WHEN v_currency = 'QAR' THEN 'ر.ق'
        WHEN v_currency = 'SAR' THEN 'ر.س'
        WHEN v_currency = 'AED' THEN 'د.إ'
        WHEN v_currency = 'BHD' THEN 'د.ب'
        WHEN v_currency = 'OMR' THEN 'ر.ع'
        WHEN v_currency = 'USD' THEN '$'
        WHEN v_currency = 'EUR' THEN '€'
        ELSE 'د.ك' -- افتراضي
    END;
END;
$$;
-- ============================================
-- الخطوة 2: دالة للحصول على أفضل اسم عميل متاح
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
    
    -- البحث عن أفضل اسم متاح بالترتيب:
    -- 1. first_name_ar + last_name_ar (الاسم العربي)
    -- 2. company_name (للعملاء من نوع شركات)
    -- 3. first_name + last_name (الاسم الإنجليزي)
    -- 4. first_name_ar فقط
    -- 5. first_name فقط
    -- 6. افتراضي
    
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
-- ============================================
-- الخطوة 3: تحديث دالة إنشاء التذكيرات مع العملة والأسماء الصحيحة
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
-- ============================================
-- الخطوة 4: تحديث الرسائل المعلقة الحالية بالأسماء الصحيحة
-- ============================================
UPDATE reminder_schedules
SET customer_name = get_customer_best_name(customer_id)
WHERE status = 'pending'
AND customer_id IS NOT NULL;
-- ============================================
-- الخطوة 5: تحديث رسائل الاختبار بالعملة والأسماء الصحيحة
-- ============================================
-- إعادة إنشاء الرسائل المعلقة مع العملة الصحيحة
DO $$
DECLARE
    rec RECORD;
    v_currency_symbol TEXT;
    v_customer_name TEXT;
BEGIN
    FOR rec IN 
        SELECT DISTINCT rs.invoice_id, rs.company_id, rs.customer_id
        FROM reminder_schedules rs
        WHERE rs.status = 'pending'
    LOOP
        -- حذف القديمة
        DELETE FROM reminder_schedules 
        WHERE invoice_id = rec.invoice_id;
        
        -- إعادة إنشائها بالعملة والأسماء الصحيحة
        PERFORM generate_reminder_schedules(rec.invoice_id);
    END LOOP;
END $$;
-- ============================================
-- الخطوة 6: منح الصلاحيات
-- ============================================
GRANT EXECUTE ON FUNCTION get_company_currency_symbol(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_company_currency_symbol(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_customer_best_name(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_best_name(UUID) TO service_role;
-- ============================================
-- الخطوة 7: تعليقات
-- ============================================
COMMENT ON FUNCTION get_company_currency_symbol(UUID) IS 'Returns the currency symbol for a company (e.g., د.ك, ر.ق)';
COMMENT ON FUNCTION get_customer_best_name(UUID) IS 'Returns the best available customer name (full_name_ar, name, or fallback)';
COMMENT ON FUNCTION generate_reminder_schedules(UUID) IS 'Generates reminder schedules with correct currency and customer names';
