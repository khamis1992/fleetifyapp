# Payment System Migrations - Instructions

## ملخص

تم إنشاء 5 ملفات migration جديدة لنظام المدفوعات:

1. ✅ `add_payment_id_to_invoices_table.sql` - إضافة payment_id إلى جدول invoices
2. ✅ `enhance_server_payment_validation.sql` - تعزيز التحقق من الصحة من جانب الخادم
3. ✅ `data_quality_tables_fixed.sql` - جداول جودة البيانات
4. ✅ `add_missing_late_fee_columns.sql` - إضافة أعمدة رسوم التأخير
5. ✅ `create_payment_queue_table.sql` - جدول payment_queue

---

## المهاجرات المُنفّذة

### 1. إضافة payment_id إلى جدول invoices

**الملف**: `supabase/migrations/20260110000001_add_payment_id_to_invoices_table.sql`

**التغييرات**:
- إضافة عمود `payment_id` إلى جدول `invoices`
- إنشاء unique constraint لمنع الفواتير المتكررة
- إنشاء دالة `cleanup_duplicate_invoices()` لتنظيف التكرارات
- إنشاء دالة `create_invoice_from_payment()` لمنع التكرار عند الإنشاء

### 2. تعزيز التحقق من الصحة من جانب الخادم

**الملف**: `supabase/migrations/20260110000002_enhance_server_payment_validation.sql`

**التغييرات**:
- تحديث دالة `validate_payment_before_insert_or_update()`
- إضافة تحقق شامل:
  - الحقول المطلوبة
  - التحقق من المبالغ
  - فحص الـ Foreign Keys
  - فحص الـ Idempotency
  - منع التجاوز (Overpayment)
- إنشاء trigger `validate_payment_trigger` على جدول payments

### 3. جداول جودة البيانات

**الملف**: `supabase/migrations/20260110000003_data_quality_tables_fixed.sql`

**التغييرات**:
- إنشاء جدول `data_quality_issues` لتتبع مشاكل البيانات
- إنشاء جدول `data_quality_rules` لتعريف قواعد التحقق
- تطبيق RLS policies

### 4. إضافة أعمدة رسوم التأخير

**الملف**: `supabase/migrations/20260110000004_add_missing_late_fee_columns.sql`

**التغييرات**:
- إضافة أعمدة ناقصة إلى جدول `late_fee_rules`:
  - `percentage` - لرسوم التأخير المُعّل بنسبة
  - `min_fee_amount` - الحد الأدنى
  - `priority` - أولويات القواعد
- إضافة أعمدة رسوم التأخير إلى جدول `payments`:
  - `late_fine_amount` - مبلغ رسوم التأخير
  - `late_fine_days_overdue` - أيام التأخير
  - `late_fine_type` - نوع الرسوم
  - `late_fine_status` - حالة الرسوم
  - `late_fine_waiver_reason` - سبب الإعفاء

### 5. جدول payment_queue

**الملف**: `supabase/migrations/20260110000005_create_payment_queue_table.sql`

**التغييرات**:
- إنشاء جدول `payment_queue` لإدارة المدفوعات المعلقة
- دعم 3 أنواع من القوائم: `processing`, `retry`, `manual_review`
- تتبع محاولات إعادة المعالجة
- تطبيق RLS policies

---

## تشغيل المهاجرات

### باستخدام Supabase CLI (مُفضّل):

```bash
# تشغيل جميع المهاجرات المعلقة
supabase db push

# تشغيل ملف معين
supabase db push --include-add-files 20260110000001_add_payment_id_to_invoices_table.sql

# عرض حالة المهاجرات
supabase migration list
```

### باستخدام Supabase Dashboard:

1. افتح لوحة التحكم Supabase
2. اذهب إلى **Database → Migrations**
3. اضغط على **New Migration**
4. انسخ محتوى ملف migration والصقه
5. اضغط **Confirm** للتأكيد

### باستخدام SQL Editor:

1. افتح **Database → SQL Editor**
2. أنسخ محتوى ملف migration
3. الصقه في المحرر
4. اضغط **Run** للتشغيل

---

## التحقق من التطبيق

### التحقق من الجداول الجديدة:

```sql
-- التحقق من جدول data_quality_issues
SELECT * FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('data_quality_issues', 'data_quality_rules', 'payment_queue');

-- التحقق من الأعمدة الجديدة
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'invoices' 
  AND column_name = 'payment_id';

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'payments' 
  AND column_name IN ('late_fine_amount', 'late_fine_status');
```

### التحقق من الـ Triggers:

```sql
-- عرض الـ triggers على جدول payments
SELECT 
    trigger_name,
    action_statement,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table = 'payments';
```

---

## استكشاف الأخطاء

### الخطأ: `column "payment_id" named in key does not exist`

**السبب**: قد يكون الـ constraint موجود مسبقاً أو العمود غير موجود

**الحل**:
- تأكد من تشغيل migration `add_payment_id_to_invoices_table.sql` أولاً
- تحقق من وجود العمود قبل إنشاء الـ constraint

### الخطأ: `foreign key constraint cannot be implemented`

**السبب**: نوع البيانات غير متوافق

**الحل**:
- تأكد من أن جميع الأعمدة المذكورة في foreign keys موجودة
- تحقق من نوع البيانات (UUID)

### الخطأ: `duplicate key value violates unique constraint`

**السبب**: محاولة إنشاء record موجود مسبقاً

**الحل**:
- استخدم دالة `cleanup_duplicate_invoices()` أولاً
- تحقق من البيانات المتكررة

---

## التراجع (Rollback)

### إلغاء جميع المهاجرات الجديدة:

```sql
-- إلغاء الـ triggers
DROP TRIGGER IF EXISTS validate_payment_trigger ON public.payments;
DROP TRIGGER IF EXISTS set_data_quality_issues_updated_at ON public.data_quality_issues;
DROP TRIGGER IF EXISTS set_data_quality_rules_updated_at ON public.data_quality_rules;
DROP TRIGGER IF EXISTS set_late_fee_rules_updated_at ON public.late_fee_rules;
DROP TRIGGER IF EXISTS set_payment_queue_updated_at ON public.payment_queue;

-- إلغاء الجداول
DROP TABLE IF EXISTS public.payment_queue CASCADE;
DROP TABLE IF EXISTS public.data_quality_rules CASCADE;
DROP TABLE IF EXISTS public.data_quality_issues CASCADE;

-- إلغاء الأعمدة
ALTER TABLE public.payments DROP COLUMN IF EXISTS late_fine_amount;
ALTER TABLE public.payments DROP COLUMN IF EXISTS late_fine_days_overdue;
ALTER TABLE public.payments DROP COLUMN IF EXISTS late_fine_type;
ALTER TABLE public.payments DROP COLUMN IF EXISTS late_fine_status;
ALTER TABLE public.payments DROP COLUMN IF EXISTS late_fine_waiver_reason;

ALTER TABLE public.late_fee_rules DROP COLUMN IF EXISTS percentage;
ALTER TABLE public.late_fee_rules DROP COLUMN IF EXISTS min_fee_amount;
ALTER TABLE public.late_fee_rules DROP COLUMN IF EXISTS priority;

ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_company_id_payment_id_unique;
ALTER TABLE public.invoices DROP COLUMN IF EXISTS payment_id;

-- إلغاء الدوال
DROP FUNCTION IF EXISTS cleanup_duplicate_invoices() CASCADE;
DROP FUNCTION IF EXISTS create_invoice_from_payment() CASCADE;
DROP FUNCTION IF EXISTS validate_payment_before_insert_or_update() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
```

---

## المزيد من المعلومات

### توثيق قاعدة البيانات:
- **الملف**: `.claude/DATABASE_SCHEMA_REFERENCE.md`

### توثيق النظام:
- **Architecture**: `docs/architecture/payment-system.md`
- **API**: `docs/api/payment-service.md`
- **Developer Guide**: `docs/developer-guide/payment-system.md`

---

## الدعم

للمساعدة أو استفسارات، تواصل مع:
- **Tech Lead**: [اسم]
- **Email**: [email]
- **Slack**: [#payments]
