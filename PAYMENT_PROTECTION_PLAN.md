# 🛡️ خطة الحماية الشاملة لمنع مشاكل الدفعات المكررة

## 📋 ملخص المشكلة التي تم حلها

### المشاكل المكتشفة:
1. **دفعات مكررة جماعية** في تواريخ محددة (13-26 يناير 2026)
2. **888 فاتورة ملغاة** بقيمة QAR 1,201,474
3. **دفعات على فواتير ملغاة** بقيمة QAR 153,004
4. **4 عقود بدفع زائد** (أحدها 142% من قيمة العقد)
5. **دفعات Auto-generated مكررة**
6. **غرامات مرورية وتأمينات** مسجلة كإيجار

### الإجراءات المتخذة:
- ✅ حذف 1,444+ دفعة مكررة بقيمة ~QAR 1,157,726
- ✅ حذف 888 فاتورة ملغاة
- ✅ تحديث total_paid لجميع العقود
- ✅ تصفير جميع حالات الدفع الزائد

---

## 🔒 الحماية الحالية (موجودة)

### 1️⃣ **Database Triggers** ✅
**الملف**: `supabase/migrations/20260110000002_enhance_server_payment_validation.sql`

**الحمايات المطبقة:**
- ✅ منع الدفع الزائد (110% من قيمة العقد)
- ✅ منع الدفعات الكبيرة المشبوهة (10× الإيجار الشهري)
- ✅ منع الدفع على فواتير ملغاة
- ✅ فحص Idempotency Key (منع التكرار خلال 30 يوم)
- ✅ فحص تاريخ الدفع (لا يتجاوز 30 يوم مستقبلاً)
- ✅ فحص تطابق العقد والفاتورة

**نقاط الضعف الحالية:**
- ❌ لا يمنع الدفعات المتعددة في نفس اليوم لنفس الفاتورة
- ❌ لا يفحص الملاحظات للكشف عن التكرار
- ❌ لا يمنع الدفعات الجماعية السريعة (bulk payments)

---

## 🚀 الحلول المقترحة

### **المرحلة 1: تحسينات فورية (أولوية قصوى)** 🔴

#### 1.1 إضافة فحص الدفعات المكررة في نفس اليوم
**المشكلة**: يمكن إضافة نفس الدفعة عدة مرات في نفس اليوم.

**الحل**: إضافة فحص في الـ Trigger:

```sql
-- إضافة إلى validate_payment_before_insert()
DECLARE
    v_duplicate_same_day INTEGER;
BEGIN
    -- فحص الدفعات المكررة في نفس اليوم
    IF NEW.contract_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_duplicate_same_day
        FROM payments
        WHERE contract_id = NEW.contract_id
          AND payment_date = NEW.payment_date
          AND amount = NEW.amount
          AND payment_status = 'completed'
          AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000');
        
        IF v_duplicate_same_day > 0 THEN
            RAISE EXCEPTION USING
                ERRCODE = '23505',
                MESSAGE = 'دفعة مكررة: يوجد دفعة بنفس المبلغ والتاريخ لهذا العقد',
                HINT = format(
                    'تم العثور على %s دفعة مشابهة في نفس اليوم. المبلغ: QAR %.2f، التاريخ: %s',
                    v_duplicate_same_day,
                    NEW.amount,
                    NEW.payment_date
                );
        END IF;
    END IF;
END;
```

#### 1.2 إضافة Rate Limiting للدفعات الجماعية
**المشكلة**: يمكن إضافة 20+ دفعة في دقيقة واحدة.

**الحل**: إضافة فحص السرعة:

```sql
DECLARE
    v_recent_payments_count INTEGER;
BEGIN
    -- فحص عدد الدفعات في آخر دقيقة
    SELECT COUNT(*) INTO v_recent_payments_count
    FROM payments
    WHERE company_id = NEW.company_id
      AND created_at > NOW() - INTERVAL '1 minute'
      AND payment_status = 'completed';
    
    IF v_recent_payments_count > 10 THEN
        RAISE EXCEPTION USING
            ERRCODE = '23514',
            MESSAGE = 'تم تجاوز الحد الأقصى للدفعات في الدقيقة',
            HINT = format(
                'تم إضافة %s دفعة في آخر دقيقة. الحد الأقصى: 10 دفعات/دقيقة. يرجى الانتظار قليلاً.',
                v_recent_payments_count
            );
    END IF;
END;
```

#### 1.3 منع الدفع على فواتير من نظام قديم
**المشكلة**: وجود فواتير من نظامين (INV-LTO... و INV-C-ALF...).

**الحل**: إضافة علامة للفواتير القديمة:

```sql
-- إضافة عمود is_legacy
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_legacy BOOLEAN DEFAULT FALSE;

-- تحديث الفواتير القديمة
UPDATE invoices SET is_legacy = TRUE 
WHERE invoice_number LIKE 'INV-LTO%' OR invoice_number LIKE 'Ret-%';

-- إضافة فحص في الـ Trigger
IF v_invoice.is_legacy = TRUE THEN
    RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'لا يمكن الدفع على فاتورة من النظام القديم',
        HINT = format(
            'الفاتورة %s من النظام القديم. يرجى استخدام الفواتير الجديدة فقط.',
            v_invoice.invoice_number
        );
END IF;
```

---

### **المرحلة 2: تحسينات متوسطة الأجل** 🟡

#### 2.1 نظام Idempotency Key إلزامي
**الحل**: جعل idempotency_key إلزامياً لجميع الدفعات:

```sql
-- تحديث الجدول
ALTER TABLE payments 
ALTER COLUMN idempotency_key SET NOT NULL;

-- إنشاء Unique Index
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_idempotency_key_active
ON payments(company_id, idempotency_key)
WHERE payment_status = 'completed' AND created_at > NOW() - INTERVAL '30 days';
```

**في الـ Frontend**:
```typescript
// في src/hooks/payments/useCreatePayment.ts
const idempotencyKey = useMemo(() => {
  return `${contractId}-${invoiceId}-${amount}-${Date.now()}-${Math.random()}`;
}, [contractId, invoiceId, amount]);
```

#### 2.2 سجل التدقيق (Audit Log)
**الحل**: تتبع جميع التغييرات على الدفعات:

```sql
CREATE TABLE payment_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID REFERENCES payments(id),
    action VARCHAR(50) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    old_values JSONB,
    new_values JSONB,
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Trigger للتسجيل التلقائي
CREATE OR REPLACE FUNCTION log_payment_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO payment_audit_log (payment_id, action, new_values, changed_by)
        VALUES (NEW.id, 'INSERT', to_jsonb(NEW), auth.uid());
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO payment_audit_log (payment_id, action, old_values, new_values, changed_by)
        VALUES (NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO payment_audit_log (payment_id, action, old_values, changed_by)
        VALUES (OLD.id, 'DELETE', to_jsonb(OLD), auth.uid());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW EXECUTE FUNCTION log_payment_changes();
```

#### 2.3 تنبيهات تلقائية للأنشطة المشبوهة
**الحل**: إنشاء جدول للتنبيهات:

```sql
CREATE TABLE payment_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
    contract_id UUID REFERENCES contracts(id),
    payment_id UUID REFERENCES payments(id),
    message TEXT NOT NULL,
    details JSONB,
    is_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id)
);

-- Function للكشف عن الأنشطة المشبوهة
CREATE OR REPLACE FUNCTION detect_suspicious_payment_activity()
RETURNS TRIGGER AS $$
DECLARE
    v_recent_count INTEGER;
    v_total_today NUMERIC;
BEGIN
    -- كشف الدفعات الجماعية
    SELECT COUNT(*) INTO v_recent_count
    FROM payments
    WHERE contract_id = NEW.contract_id
      AND created_at > NOW() - INTERVAL '5 minutes';
    
    IF v_recent_count > 5 THEN
        INSERT INTO payment_alerts (alert_type, severity, contract_id, payment_id, message, details)
        VALUES (
            'bulk_payments',
            'high',
            NEW.contract_id,
            NEW.id,
            'تم اكتشاف دفعات جماعية مشبوهة',
            jsonb_build_object('count', v_recent_count, 'timeframe', '5 minutes')
        );
    END IF;
    
    -- كشف الدفعات الكبيرة
    IF NEW.amount > 50000 THEN
        INSERT INTO payment_alerts (alert_type, severity, contract_id, payment_id, message, details)
        VALUES (
            'large_payment',
            'medium',
            NEW.contract_id,
            NEW.id,
            'دفعة كبيرة غير عادية',
            jsonb_build_object('amount', NEW.amount)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER detect_suspicious_activity_trigger
AFTER INSERT ON payments
FOR EACH ROW EXECUTE FUNCTION detect_suspicious_payment_activity();
```

---

### **المرحلة 3: تحسينات طويلة الأجل** 🟢

#### 3.1 نظام الموافقات (Approval Workflow)
**الحل**: إضافة نظام موافقات للدفعات الكبيرة:

```sql
CREATE TABLE payment_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID REFERENCES payments(id),
    requested_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    approval_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    approval_notes TEXT
);

-- الدفعات الكبيرة تحتاج موافقة
CREATE OR REPLACE FUNCTION require_approval_for_large_payments()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.amount > 10000 AND NEW.payment_status = 'completed' THEN
        -- تحقق من وجود موافقة
        IF NOT EXISTS (
            SELECT 1 FROM payment_approvals
            WHERE payment_id = NEW.id
              AND approval_status = 'approved'
        ) THEN
            RAISE EXCEPTION USING
                ERRCODE = '23514',
                MESSAGE = 'الدفعات الكبيرة تحتاج موافقة المدير',
                HINT = format(
                    'المبلغ QAR %.2f يتجاوز الحد المسموح (QAR 10,000). يرجى طلب موافقة المدير أولاً.',
                    NEW.amount
                );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### 3.2 فصل الغرامات والتأمينات
**الحل**: إنشاء جداول منفصلة:

```sql
-- جدول الغرامات المرورية
CREATE TABLE traffic_fines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES contracts(id),
    vehicle_id UUID REFERENCES vehicles(id),
    fine_date DATE NOT NULL,
    fine_amount NUMERIC(10,2) NOT NULL,
    fine_type VARCHAR(100),
    fine_number VARCHAR(100),
    paid_by VARCHAR(20), -- 'company', 'customer'
    payment_id UUID REFERENCES payments(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول التأمينات والاستمارات
CREATE TABLE vehicle_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID REFERENCES vehicles(id),
    expense_type VARCHAR(50) NOT NULL, -- 'insurance', 'registration', 'maintenance'
    expense_date DATE NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    payment_id UUID REFERENCES payments(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3.3 Dashboard للمراقبة
**الحل**: إنشاء views للمراقبة:

```sql
-- View للدفعات المشبوهة
CREATE OR REPLACE VIEW suspicious_payments AS
SELECT 
    c.contract_number,
    p.payment_date,
    p.amount,
    p.created_at,
    COUNT(*) OVER (
        PARTITION BY p.contract_id, p.payment_date 
        ORDER BY p.created_at
    ) as same_day_count,
    COUNT(*) OVER (
        PARTITION BY p.contract_id 
        ORDER BY p.created_at 
        RANGE BETWEEN INTERVAL '5 minutes' PRECEDING AND CURRENT ROW
    ) as five_min_count
FROM payments p
JOIN contracts c ON p.contract_id = c.id
WHERE p.payment_status = 'completed'
  AND p.created_at > NOW() - INTERVAL '30 days';

-- View للعقود المعرضة للخطر
CREATE OR REPLACE VIEW contracts_at_risk AS
SELECT 
    c.contract_number,
    c.contract_amount,
    c.total_paid,
    c.balance_due,
    ROUND((c.total_paid / NULLIF(c.contract_amount, 0) * 100), 2) as payment_percentage,
    CASE 
        WHEN c.total_paid > c.contract_amount * 1.05 THEN 'overpaid'
        WHEN c.total_paid > c.contract_amount * 0.95 THEN 'near_complete'
        ELSE 'normal'
    END as risk_level
FROM contracts c
WHERE c.contract_amount > 0
  AND c.status NOT IN ('completed', 'cancelled');
```

---

## 📝 إجراءات التشغيل القياسية (SOPs)

### SOP-001: إضافة دفعة جديدة
1. ✅ التحقق من رقم العقد والفاتورة
2. ✅ التحقق من المبلغ المتبقي
3. ✅ إدخال المبلغ والتاريخ
4. ✅ إضافة ملاحظات واضحة (رقم الفاتورة، الشهر، إلخ)
5. ✅ مراجعة التنبيهات (إن وجدت)
6. ✅ حفظ الدفعة
7. ✅ التحقق من تحديث الرصيد

### SOP-002: التعامل مع الدفعات الجماعية
1. ⚠️ **تجنب** إضافة أكثر من 5 دفعات في وقت واحد
2. ⚠️ إذا كان لابد، استخدم فترة 2-3 دقائق بين كل دفعة
3. ⚠️ تحقق من كل دفعة قبل الانتقال للتالية
4. ⚠️ راجع الإجمالي بعد الانتهاء

### SOP-003: مراجعة دورية
1. 📅 **يومياً**: فحص التنبيهات في payment_alerts
2. 📅 **أسبوعياً**: مراجعة suspicious_payments view
3. 📅 **شهرياً**: تدقيق contracts_at_risk
4. 📅 **ربع سنوي**: مراجعة شاملة لجميع العقود

---

## 🔧 الصيانة والمراقبة

### Cron Jobs المطلوبة

```sql
-- 1. تنظيف الدفعات القديمة من الـ idempotency check (يومياً)
CREATE OR REPLACE FUNCTION cleanup_old_idempotency_keys()
RETURNS void AS $$
BEGIN
    -- لا حاجة لحذف، الـ Index يستخدم WHERE clause
    -- لكن يمكن أرشفة الدفعات القديمة
    NULL;
END;
$$ LANGUAGE plpgsql;

-- 2. إعادة حساب total_paid لجميع العقود (أسبوعياً)
CREATE OR REPLACE FUNCTION recalculate_all_contract_totals()
RETURNS void AS $$
BEGIN
    UPDATE contracts c
    SET total_paid = COALESCE((
        SELECT SUM(p.amount)
        FROM payments p
        WHERE p.contract_id = c.id
          AND p.payment_status = 'completed'
    ), 0);
END;
$$ LANGUAGE plpgsql;

-- 3. كشف الشذوذ (يومياً)
CREATE OR REPLACE FUNCTION detect_payment_anomalies()
RETURNS TABLE(contract_number VARCHAR, issue TEXT, severity VARCHAR) AS $$
BEGIN
    RETURN QUERY
    -- العقود المدفوعة بزيادة
    SELECT 
        c.contract_number,
        'عقد مدفوع بزيادة: ' || (c.total_paid - c.contract_amount)::TEXT || ' QAR',
        'high'
    FROM contracts c
    WHERE c.contract_amount > 0 
      AND c.total_paid > c.contract_amount * 1.05
    
    UNION ALL
    
    -- دفعات مكررة محتملة
    SELECT 
        c.contract_number,
        'دفعات مكررة محتملة في ' || p.payment_date::TEXT,
        'medium'
    FROM (
        SELECT contract_id, payment_date, amount, COUNT(*) as cnt
        FROM payments
        WHERE payment_status = 'completed'
        GROUP BY contract_id, payment_date, amount
        HAVING COUNT(*) > 1
    ) p
    JOIN contracts c ON p.contract_id = c.id;
END;
$$ LANGUAGE plpgsql;
```

---

## 📊 مؤشرات الأداء (KPIs)

### مؤشرات يجب مراقبتها:

1. **عدد التنبيهات اليومية** (الهدف: < 5)
2. **نسبة الدفعات المرفوضة** (الهدف: < 1%)
3. **متوسط وقت معالجة الدفعة** (الهدف: < 2 ثانية)
4. **عدد العقود المعرضة للخطر** (الهدف: 0)
5. **نسبة الدفعات المكررة** (الهدف: 0%)

---

## 🎯 خطة التنفيذ

### الأسبوع 1: الحمايات الفورية
- [ ] تطبيق فحص الدفعات المكررة في نفس اليوم
- [ ] تطبيق Rate Limiting
- [ ] وضع علامة is_legacy على الفواتير القديمة
- [ ] اختبار شامل

### الأسبوع 2-3: التحسينات المتوسطة
- [ ] جعل idempotency_key إلزامياً
- [ ] إنشاء جدول payment_audit_log
- [ ] إنشاء نظام التنبيهات
- [ ] اختبار وتوثيق

### الشهر 2: التحسينات طويلة الأجل
- [ ] نظام الموافقات
- [ ] فصل الغرامات والتأمينات
- [ ] Dashboard المراقبة
- [ ] تدريب الفريق

---

## ✅ Checklist النشر

قبل نشر أي تحديث:

- [ ] اختبار جميع السيناريوهات على بيئة التطوير
- [ ] مراجعة الكود من قبل مطور آخر
- [ ] عمل backup كامل لقاعدة البيانات
- [ ] اختبار الـ rollback
- [ ] توثيق التغييرات
- [ ] إعلام الفريق
- [ ] مراقبة لمدة 24 ساعة بعد النشر

---

## 📞 جهات الاتصال

- **المطور الرئيسي**: [الاسم]
- **مدير قاعدة البيانات**: [الاسم]
- **الدعم الفني**: [الاسم]

---

## 📚 مراجع

- [Supabase Triggers Documentation](https://supabase.com/docs/guides/database/postgres/triggers)
- [PostgreSQL Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)
- [Idempotency Best Practices](https://stripe.com/docs/api/idempotent_requests)

---

**آخر تحديث**: 1 فبراير 2026  
**الإصدار**: 1.0  
**الحالة**: ✅ جاهز للتطبيق
