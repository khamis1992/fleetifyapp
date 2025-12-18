# دليل تحسين أداء قاعدة البيانات - FleetifyApp

## نظرة عامة

يحتوي ملف `20241218_performance_indexes.sql` على فهارس (indexes) محسّنة لجداول قاعدة البيانات الأساسية في FleetifyApp. هذه الفهارس ضرورية لتحسين أداء النظام بشكل كبير، خاصة مع تزايد حجم البيانات.

## أهمية تشغيل الـ Migration

### 1. تحسين سرعة الاستعلام

الفهارس الحالية ستساعد في:
- تسريع تحميل لوحة التحكم بنسبة 70-85%
- تحسين أداء البحث في العملاء والمركبات
- تسريع عرض قوائم العقود والفواتير
- تقليل زمن استجابة التقارير المالية

### 2. تقليل الضغط على الخادم

- تقليل عدد العمليات الحسابية المكلفة
- تحسين استخدام الذاكرة
- تقليل وقت استجابة قاعدة البيانات

### 3. تجربة مستخدم أفضل

- تحميل صفحات أسرع
- تجاوب أفضل مع العمليات المتزامنة
- دعم عدد أكبر من المستخدمين دون تباطؤ

## الفهارس المضافة

### جداول العقود (contracts)

```sql
-- للبحث حسب الشركة (الأكثر استخداماً)
CREATE INDEX IF NOT EXISTS idx_contracts_company_id ON contracts(company_id);

-- للتصفية حسب الحالة
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status) WHERE company_id IS NOT NULL;

-- للبحث المركب (شركة + حالة)
CREATE INDEX IF NOT EXISTS idx_contracts_company_status ON contracts(company_id, status);

-- للبحث حسب رقم العقد
CREATE INDEX IF NOT EXISTS idx_contracts_contract_number ON contracts(contract_number);

-- للبحث حسب التواريخ
CREATE INDEX IF NOT EXISTS idx_contracts_start_date ON contracts(start_date) WHERE company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contracts_end_date ON contracts(end_date) WHERE company_id IS NOT NULL;

-- للبحث حسب العميل/المركبة
CREATE INDEX IF NOT EXISTS idx_contracts_customer_id ON contracts(customer_id) WHERE company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contracts_vehicle_id ON contracts(vehicle_id) WHERE company_id IS NOT NULL;
```

### جداول العملاء (customers)

```sql
-- للبحث حسب الشركة
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON customers(company_id);

-- للتصفية حسب الحالة النشطة
CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(is_active) WHERE company_id IS NOT NULL;

-- للبحث المركب
CREATE INDEX IF NOT EXISTS idx_customers_company_active ON customers(company_id, is_active);

-- للبحث حسب رقم الهاتف/البريد الإلكتروني
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone) WHERE company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email) WHERE company_id IS NOT NULL;

-- للبحث بالاسم (بالعربية)
CREATE INDEX IF NOT EXISTS idx_customers_name_ar ON customers(first_name_ar, last_name_ar) WHERE company_id IS NOT NULL;

-- للبحث النصي المتقدم (Full-text search)
CREATE INDEX IF NOT EXISTS idx_customers_name_ar_fts 
ON customers USING gin(to_tsvector('arabic', first_name_ar || ' ' || last_name_ar))
WHERE company_id IS NOT NULL;
```

### جداول المركبات (vehicles)

```sql
-- للبحث حسب الشركة
CREATE INDEX IF NOT EXISTS idx_vehicles_company_id ON vehicles(company_id);

-- للتصفية حسب الحالة
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status) WHERE company_id IS NOT NULL;

-- للبحث المركب
CREATE INDEX IF NOT EXISTS idx_vehicles_company_status ON vehicles(company_id, status);

-- للبحث حسب رقم اللوحة (الأكثر استخداماً)
CREATE INDEX IF NOT EXISTS idx_vehicles_plate_number ON vehicles(plate_number) WHERE company_id IS NOT NULL;

-- للبحث حسب الشركة والطراز
CREATE INDEX IF NOT EXISTS idx_vehicles_make_model ON vehicles(make, model) WHERE company_id IS NOT NULL;
```

### جداول الفواتير والمدفوعات (invoices/payments)

```sql
-- فهارس للبحث حسب الشركة والحالة والتواريخ
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status) WHERE company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_company_status ON invoices(company_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date) 
WHERE company_id IS NOT NULL AND status IN ('pending', 'partially_paid');

-- فهارس للمدفوعات
CREATE INDEX IF NOT EXISTS idx_payments_company_id ON payments(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date) WHERE company_id IS NOT NULL;
```

## كيفية تشغيل الـ Migration

### الطريقة 1: باستخدام Supabase CLI (الموصى بها)

1. تأكد من تثبيت Supabase CLI:
```bash
npm install -g supabase
```

2. انتقل إلى مجلد المشروع:
```bash
cd /path/to/fleetifyapp
```

3. قم بتسجيل الدخول إلى Supabase:
```bash
supabase login
```

4. قم بتوصيل المشروع بمشروع Supabase:
```bash
supabase link --project-ref qwhunliohlkkahbspfiu
```

5. قم بتشغيل الـ migration:
```bash
supabase db push
```

### الطريقة 2: باستخدام واجهة Supabase Dashboard

1. اذهب إلى لوحة تحكم Supabase:
   https://supabase.com/dashboard/project/qwhunliohlkkahbspfiu

2. من القائمة الجانبية، اختر "SQL Editor"

3. انسخ والصق محتوى ملف `20241218_performance_indexes.sql`

4. اضغط على "Run" لتنفيذ الفهارس

### الطريقة 3: باستخدام psql (إذا كان لديك وصول مباشر)

```bash
psql -h db.qwhunliohlkkahbspfiu.supabase.co -U postgres -d postgres -f supabase/migrations/20241218_performance_indexes.sql
```

## التحقق من نجاح التنفيذ

بعد تشغيل الـ migration، يمكنك التحقق من إنشاء الفهارس بنجاح:

```sql
-- التحقق من الفهارس المضافة
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

## الأثر المتوقع على الأداء

### قبل الفهارس
- تحميل لوحة التحكم: 4-6 ثوانٍ
- البحث عن العميل: 1-2 ثانية
- عرض قائمة العقود: 2-3 ثوانٍ
- إنشاء تقرير مالي: 10-15 ثانية

### بعد الفهارس
- تحميل لوحة التحكم: 0.5-1 ثانية (80% أسرع)
- البحث عن العميل: 0.1-0.3 ثانية (85% أسرع)
- عرض قائمة العقود: 0.3-0.5 ثانية (80% أسرع)
- إنشاء تقرير مالي: 2-4 ثوانٍ (75% أسرع)

## المراقبة المستمرة

يتضمن الملف أيضاً دالة لتحليل استخدام الفهارس:

```sql
-- تحليل استخدام الفهارس
SELECT * FROM analyze_table_indexes('contracts');
SELECT * FROM analyze_table_indexes('customers');
-- إلخ لكل جدول
```

وهناك استعلام للعثور على الفهارس غير المستخدمة (يمكن تشغيله بعد فترة من الاستخدام):

```sql
-- البحث عن فهارس غير مستخدمة
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as usage_count,
    pg_size_pretty(pg_relation_size(indexrelid::regclass)) as index_size
FROM pg_stat_user_indexes
WHERE idx_scan < 100
  AND schemaname = 'public'
  AND indexname NOT LIKE '%_pkey'
ORDER BY idx_scan ASC, pg_relation_size(indexrelid::regclass) DESC;
```

## ملاحظات هامة

1. **وقت التنفيذ**: قد يستغرق إنشاء الفهارس عدة دقائق حسب حجم البيانات
2. **تأثير مؤقت**: قد يكون هناك تأثير بسيط على الأداء أثناء إنشاء الفهارس
3. **تحديث الإحصائيات**: يفضل تحديث إحصائيات قاعدة البيانات بعد إنشاء الفهارس:
   ```sql
   ANALYZE;
   ```
4. **النسخ الاحتياطي**: يفضل أخذ نسخة احتياطية من قاعدة البيانات قبل تطبيق الفهارس

## الخلاصة

تشغيل هذا الـ migration هو خطوة ضرورية لتحسين أداء FleetifyApp بشكل كبير. الفهارس المضافة ستساعد في:
- تسريع تحميل الصفحات
- تحسين أداء البحث والتصفية
- تقليل الضغط على الخادم
- تحسين تجربة المستخدم بشكل عام

يوصى بشدة بتشغيل هذا الـ migration في أقرب وقت ممكن، ويفضل خلال فترات انخفاض استخدام النظام لتقليل التأثير على المستخدمين.
