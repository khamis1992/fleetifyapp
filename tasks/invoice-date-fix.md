# إصلاح: منع إنشاء فواتير بتواريخ قبل تاريخ بداية العقد

## المشكلة
يتم إنشاء فواتير بتواريخ قبل تاريخ بداية العقد، مما يسبب:
- فواتير غير منطقية (تاريخ الفاتورة قبل بداية العقد)
- مشاكل في التقارير المالية
- بيانات غير دقيقة

## السبب الجذري

### في `generate_invoice_for_contract_month`:
```sql
-- السطر 32-36: يتحقق من أن العقد نشط في الشهر
IF v_contract.start_date > p_invoice_month THEN
  RAISE NOTICE 'Contract is not active in month';
  RETURN NULL;
END IF;

-- السطر 47-48: لكن يستخدم تاريخ الشهر مباشرة!
v_invoice_date := p_invoice_month;  -- ❌ قد يكون قبل start_date
v_due_date := p_invoice_month;      -- ❌ قد يكون قبل start_date
```

### مثال على المشكلة:
- تاريخ بداية العقد: `2024-01-15`
- شهر الفاتورة المطلوب: `2024-01-01`
- النتيجة: فاتورة بتاريخ `2024-01-01` (قبل بداية العقد ب 14 يوم!) ❌

## الحل المطلوب

### 1. تعديل `generate_invoice_for_contract_month`
يجب التأكد من أن تاريخ الفاتورة لا يكون قبل تاريخ بداية العقد:

```sql
-- الحل الصحيح:
v_invoice_date := GREATEST(p_invoice_month, v_contract.start_date);
v_due_date := GREATEST(p_invoice_month, v_contract.start_date);
```

### 2. تحديث الفواتير الموجودة
البحث عن الفواتير التي تاريخها قبل تاريخ بداية العقد وتصحيحها.

## خطة التنفيذ

### ✅ المهام

- [x] 1. إنشاء migration جديد لإصلاح الـ function
  - ✅ تعديل `generate_invoice_for_contract_month`
  - ✅ استخدام `GREATEST()` لضمان عدم إنشاء فواتير قبل start_date
  - ✅ إضافة validation trigger

- [x] 2. إنشاء script لتصحيح الفواتير الموجودة
  - ✅ البحث عن فواتير تاريخها قبل تاريخ بداية العقد
  - ✅ تحديث التواريخ لتكون صحيحة
  - ✅ تسجيل التغييرات في system_logs

- [x] 3. إضافة حماية للمستقبل
  - ✅ إنشاء trigger للتحقق من التواريخ قبل الإدراج/التحديث
  - ✅ رسائل خطأ واضحة عند محاولة إنشاء فاتورة بتاريخ خاطئ

- [ ] 4. اختبار الإصلاح
  - تطبيق الـ migration
  - اختبار إنشاء فاتورة لعقد جديد
  - التأكد من أن التاريخ صحيح
  - اختبار backfill للعقود القديمة

## الملفات المتأثرة
- `supabase/migrations/[new]_fix_invoice_date_before_contract_start.sql`
- `generate_invoice_for_contract_month` function
- `smart_backfill_contract_invoices` function (قد يحتاج تحديث)

## ملاحظات مهمة
- ⚠️ يجب عمل backup للبيانات قبل التعديل
- ⚠️ يجب اختبار الـ migration على staging أولاً
- ⚠️ قد تحتاج بعض الفواتير لمراجعة يدوية بعد التصحيح

---

## ملخص الإصلاح المنفذ

### 1. تعديل Function: `generate_invoice_for_contract_month`
**التغيير الرئيسي:**
```sql
-- قبل ❌
v_invoice_date := p_invoice_month;
v_due_date := p_invoice_month;

-- بعد ✅
v_invoice_date := GREATEST(p_invoice_month, v_contract.start_date);
v_due_date := GREATEST(p_invoice_month, v_contract.start_date);
```

**النتيجة:**
- إذا كان `p_invoice_month` = `2024-01-01` و `start_date` = `2024-01-15`
- التاريخ الناتج = `2024-01-15` (الأحدث) ✅

### 2. تصحيح البيانات الموجودة
تم إنشاء script تلقائي يقوم بـ:
- البحث عن جميع الفواتير التي `invoice_date < contract.start_date`
- تحديث التواريخ باستخدام `GREATEST()`
- تسجيل التغييرات في `system_logs`
- عرض تقرير بعدد الفواتير المصححة

### 3. حماية المستقبل - Trigger
تم إنشاء trigger يمنع:
- إدراج فواتير جديدة بتواريخ قبل تاريخ بداية العقد
- تحديث فواتير موجودة لتواريخ غير صحيحة
- رسالة خطأ واضحة: `"Invoice date cannot be before contract start date"`

### 4. التحقق التلقائي
الـ migration يتحقق تلقائياً بعد التطبيق:
- يعد الفواتير المتبقية بتواريخ خاطئة
- يعرض تحذير إذا وجد مشاكل
- يعرض ✅ إذا كانت جميع الفواتير صحيحة

### مثال على السلوك الجديد:

#### سيناريو 1: عقد يبدأ في منتصف الشهر
- تاريخ بداية العقد: `2024-01-15`
- طلب إنشاء فاتورة لشهر: `2024-01-01`
- **النتيجة**: فاتورة بتاريخ `2024-01-15` ✅

#### سيناريو 2: عقد يبدأ في بداية الشهر
- تاريخ بداية العقد: `2024-01-01`
- طلب إنشاء فاتورة لشهر: `2024-02-01`
- **النتيجة**: فاتورة بتاريخ `2024-02-01` ✅

#### سيناريو 3: محاولة إنشاء فاتورة يدوياً بتاريخ خاطئ
- محاولة INSERT فاتورة بتاريخ `2024-01-01` لعقد يبدأ `2024-01-15`
- **النتيجة**: ❌ ERROR - "Invoice date cannot be before contract start date"

### كيفية التطبيق:
```bash
# تطبيق الـ migration
supabase db push

# أو باستخدام psql
psql -h [host] -U [user] -d [database] -f supabase/migrations/20260208000001_fix_invoice_date_before_contract_start.sql
```

### التحقق من النجاح:
```sql
-- التحقق من عدم وجود فواتير بتواريخ خاطئة
SELECT 
  i.invoice_number,
  i.invoice_date,
  c.contract_number,
  c.start_date,
  (i.invoice_date - c.start_date) as days_difference
FROM invoices i
INNER JOIN contracts c ON i.contract_id = c.id
WHERE i.invoice_date < c.start_date
  AND i.status != 'cancelled';
-- يجب أن يرجع 0 rows ✅
```
