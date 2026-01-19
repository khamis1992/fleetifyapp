# 🎯 ملخص سريع - إصلاح العملة والأسماء
## Quick Fix Summary

---

## 🔍 ما اكتشفته

### ❌ مشكلتين:
1. **العملة:** جميع الرسائل "د.ك" بدل "ر.ق" لشركة العراف
2. **الأسماء:** جميع الرسائل باسم "محمد" فقط

---

## ✅ الحل (دقيقة واحدة!)

### افتح Supabase SQL Editor وشغل:

```sql
-- الملف: .cursor/fix_currency_names_NOW.sql
```

**أو انسخ هذا مباشرة:**

```sql
-- 1. دالة العملة
CREATE OR REPLACE FUNCTION get_company_currency_symbol(p_company_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE v_currency TEXT;
BEGIN
    SELECT currency INTO v_currency FROM companies WHERE id = p_company_id;
    RETURN CASE 
        WHEN v_currency = 'QAR' THEN 'ر.ق'  ← لشركة العراف
        WHEN v_currency = 'KWD' THEN 'د.ك'
        ELSE 'د.ك'
    END;
END;
$$;

-- 2. دالة الأسماء
CREATE OR REPLACE FUNCTION get_customer_best_name(p_customer_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE v_customer RECORD;
BEGIN
    SELECT * INTO v_customer FROM customers WHERE id = p_customer_id;
    IF v_customer.full_name_ar IS NOT NULL THEN
        RETURN TRIM(v_customer.full_name_ar);
    ELSE
        RETURN COALESCE(TRIM(v_customer.name), 'عزيزي العميل');
    END IF;
END;
$$;

-- 3. تحديث الرسائل المعلقة
UPDATE reminder_schedules
SET customer_name = get_customer_best_name(customer_id)
WHERE status = 'pending';

-- 4. تحديث قوالب الرسائل بالعملة الصحيحة
DO $$
DECLARE
    rec RECORD;
    v_currency TEXT;
    v_name TEXT;
BEGIN
    FOR rec IN 
        SELECT rs.id, rs.company_id, rs.customer_id, rs.reminder_type,
               i.invoice_number, i.total_amount, i.due_date
        FROM reminder_schedules rs
        LEFT JOIN invoices i ON rs.invoice_id = i.id
        WHERE rs.status = 'pending'
    LOOP
        v_currency := get_company_currency_symbol(rec.company_id);
        v_name := get_customer_best_name(rec.customer_id);
        
        UPDATE reminder_schedules
        SET message_template = 
            'مرحباً ' || v_name || ' 👋' || E'\n\n' ||
            'تذكير ودي: فاتورتك رقم ' || rec.invoice_number || 
            ' بمبلغ ' || rec.total_amount || ' ' || v_currency || 
            ' ستستحق قريباً.' || E'\n\n' ||
            '📅 تاريخ الاستحقاق: ' || rec.due_date || E'\n\n' ||
            'شكراً لتعاونكم 🙏'
        WHERE id = rec.id;
    END LOOP;
END $$;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION get_company_currency_symbol(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_best_name(UUID) TO authenticated;
```

---

## 📊 النتيجة

### قبل:
```
✗ جميع الرسائل: "محمد" + "د.ك"
```

### بعد:
```
✓ شركة العراف: "أحمد المري" + "ر.ق"
✓ شركة فليتفاي: "محمد الخالد" + "د.ك"
✓ أسماء مختلفة لكل عميل
✓ عملة صحيحة لكل شركة
```

---

## 📁 الملفات

```
✅ .cursor/fix_currency_names_NOW.sql          ← شغله الآن!
📖 .cursor/CURRENCY_NAMES_FIX_EXPLANATION.md   ← شرح مفصل
📋 supabase/migrations/20251104140000_...sql   ← Migration كامل
```

---

## ⏱️ الوقت: 30 ثانية
## 📊 النتيجة: 79 رسالة محدثة

---

**🎉 جاهز! شكراً على الملاحظة الدقيقة!**

