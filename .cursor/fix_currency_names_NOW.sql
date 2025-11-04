-- ============================================
-- إصلاح فوري للعملة والأسماء
-- INSTANT FIX for Currency and Names
-- ============================================
-- نسخ والصق هذا الكود في Supabase SQL Editor
-- ============================================

-- الخطوة 1: فحص البيانات الحالية
SELECT 
  'قبل الإصلاح - فحص الأسماء' as status,
  c.id,
  c.first_name_ar,
  c.full_name_ar,
  c.name,
  COUNT(rs.id) as reminder_count
FROM customers c
LEFT JOIN reminder_schedules rs ON c.id = rs.customer_id
WHERE rs.id IS NOT NULL
GROUP BY c.id, c.first_name_ar, c.full_name_ar, c.name
LIMIT 20;

-- الخطوة 2: فحص العملات
SELECT 
  'قبل الإصلاح - فحص العملات' as status,
  comp.id,
  comp.name,
  comp.currency,
  COUNT(rs.id) as reminder_count
FROM companies comp
LEFT JOIN reminder_schedules rs ON comp.id = rs.company_id
GROUP BY comp.id, comp.name, comp.currency;

-- ============================================
-- الإصلاح الفوري
-- ============================================

-- الخطوة 3: إنشاء دالة العملة
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

-- الخطوة 4: إنشاء دالة الأسماء
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
    
    IF v_customer.full_name_ar IS NOT NULL AND TRIM(v_customer.full_name_ar) != '' THEN
        v_name := TRIM(v_customer.full_name_ar);
    ELSIF v_customer.first_name_ar IS NOT NULL AND TRIM(v_customer.first_name_ar) != '' THEN
        IF v_customer.last_name_ar IS NOT NULL AND TRIM(v_customer.last_name_ar) != '' THEN
            v_name := TRIM(v_customer.first_name_ar) || ' ' || TRIM(v_customer.last_name_ar);
        ELSE
            v_name := TRIM(v_customer.first_name_ar);
        END IF;
    ELSIF v_customer.name IS NOT NULL AND TRIM(v_customer.name) != '' THEN
        v_name := TRIM(v_customer.name);
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

-- الخطوة 5: تحديث الرسائل المعلقة بالأسماء الصحيحة
UPDATE reminder_schedules
SET customer_name = get_customer_best_name(customer_id)
WHERE status IN ('pending', 'queued')
AND customer_id IS NOT NULL;

-- الخطوة 6: تحديث قوالب الرسائل المعلقة بالعملة الصحيحة
DO $$
DECLARE
    rec RECORD;
    v_currency_symbol TEXT;
    v_customer_name TEXT;
    v_new_message TEXT;
BEGIN
    FOR rec IN 
        SELECT 
            rs.id,
            rs.company_id,
            rs.customer_id,
            rs.reminder_type,
            i.invoice_number,
            i.total_amount,
            i.due_date
        FROM reminder_schedules rs
        LEFT JOIN invoices i ON rs.invoice_id = i.id
        WHERE rs.status IN ('pending', 'queued')
    LOOP
        v_currency_symbol := get_company_currency_symbol(rec.company_id);
        v_customer_name := get_customer_best_name(rec.customer_id);
        
        -- إنشاء الرسالة الصحيحة حسب النوع
        CASE rec.reminder_type
            WHEN 'pre_due' THEN
                v_new_message := 'مرحباً ' || v_customer_name || ' 👋' || E'\n\n' ||
                    'تذكير ودي: فاتورتك رقم ' || rec.invoice_number || ' بمبلغ ' || 
                    rec.total_amount::TEXT || ' ' || v_currency_symbol || 
                    ' ستستحق خلال 3 أيام.' || E'\n\n' ||
                    '📅 تاريخ الاستحقاق: ' || rec.due_date::TEXT || E'\n\n' ||
                    'شكراً لتعاونكم 🙏';
            
            WHEN 'due_date' THEN
                v_new_message := 'مرحباً ' || v_customer_name || ' 👋' || E'\n\n' ||
                    'فاتورتك رقم ' || rec.invoice_number || ' مستحقة اليوم.' || E'\n\n' ||
                    '💰 المبلغ: ' || rec.total_amount::TEXT || ' ' || v_currency_symbol || E'\n\n' ||
                    'الرجاء الدفع في أقرب وقت ممكن.' || E'\n\n' ||
                    'شكراً 🙏';
            
            WHEN 'overdue' THEN
                v_new_message := 'عزيزي ' || v_customer_name || ' ⚠️' || E'\n\n' ||
                    'فاتورتك رقم ' || rec.invoice_number || ' متأخرة بـ 3 أيام.' || E'\n\n' ||
                    '💰 المبلغ: ' || rec.total_amount::TEXT || ' ' || v_currency_symbol || E'\n\n' ||
                    'الرجاء سداد المبلغ فوراً لتجنب رسوم التأخير.' || E'\n\n' ||
                    'شكراً';
            
            WHEN 'escalation' THEN
                v_new_message := 'السيد/ة ' || v_customer_name || ' 🚨' || E'\n\n' ||
                    'إشعار نهائي - فاتورة متأخرة 10 أيام' || E'\n\n' ||
                    '📋 رقم الفاتورة: ' || rec.invoice_number || E'\n' ||
                    '💰 المبلغ: ' || rec.total_amount::TEXT || ' ' || v_currency_symbol || E'\n\n' ||
                    '⚠️ في حالة عدم السداد خلال 48 ساعة سيتم اتخاذ إجراءات قانونية.';
        END CASE;
        
        -- تحديث الرسالة
        UPDATE reminder_schedules
        SET message_template = v_new_message,
            customer_name = v_customer_name
        WHERE id = rec.id;
    END LOOP;
    
    RAISE NOTICE 'تم تحديث % رسالة معلقة', (SELECT COUNT(*) FROM reminder_schedules WHERE status IN ('pending', 'queued'));
END $$;

-- الخطوة 7: منح الصلاحيات
GRANT EXECUTE ON FUNCTION get_company_currency_symbol(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_company_currency_symbol(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_customer_best_name(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_best_name(UUID) TO service_role;

-- ============================================
-- التحقق من النتائج
-- ============================================

-- فحص الأسماء بعد الإصلاح
SELECT 
  'بعد الإصلاح - فحص الأسماء' as status,
  customer_name,
  COUNT(*) as count
FROM reminder_schedules
WHERE status IN ('pending', 'queued')
GROUP BY customer_name
ORDER BY count DESC;

-- فحص العملات في الرسائل
SELECT 
  'بعد الإصلاح - فحص العملات في الرسائل' as status,
  CASE
    WHEN message_template LIKE '%د.ك%' THEN 'دينار كويتي'
    WHEN message_template LIKE '%ر.ق%' THEN 'ريال قطري'
    WHEN message_template LIKE '%ر.س%' THEN 'ريال سعودي'
    WHEN message_template LIKE '%د.إ%' THEN 'درهم إماراتي'
    ELSE 'أخرى'
  END as currency_found,
  COUNT(*) as count
FROM reminder_schedules
WHERE status IN ('pending', 'queued')
GROUP BY currency_found;

-- عرض عينة من الرسائل المحدثة
SELECT 
  'عينة من الرسائل المحدثة' as status,
  customer_name,
  LEFT(message_template, 100) as message_preview,
  reminder_type
FROM reminder_schedules
WHERE status IN ('pending', 'queued')
LIMIT 5;

-- ============================================
-- ✅ تم الإصلاح بنجاح!
-- ============================================
SELECT '✅ تم إصلاح العملة والأسماء في جميع الرسائل المعلقة!' as result;

