# 🤖 إعداد سير العمل الآلي (Automated Workflows)

هذا الدليل يشرح كيفية إعداد سير العمل الآلي لتوليد الفواتير الشهرية وإرسال تذكيرات الدفع.

---

## 📋 المتطلبات الأساسية

1. ✅ حساب GitHub مع صلاحيات الكتابة على المستودع
2. ✅ حساب Supabase (Pro plan للحصول على pg_cron)
3. ✅ Edge Functions منشورة على Supabase:
   - `generate-monthly-invoices`
   - `process-payment-reminders`
   - `backfill-historical-invoices`

---

## 🎯 الخيار 1: استخدام pg_cron (موصى به)

### المتطلبات
- خطة Supabase Pro أو أعلى
- الوصول إلى SQL Editor في لوحة تحكم Supabase

### الخطوات

1. **تفعيل pg_cron extension**

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

2. **إنشاء CRON Job لتوليد الفواتير الشهرية**

```sql
-- يعمل يوم 28 من كل شهر الساعة 9 صباحاً
SELECT cron.schedule(
  'monthly-invoice-generation',
  '0 9 28 * *',
  $$
  SELECT net.http_post(
    url := 'https://rtottdvuftbqktzborvv.supabase.co/functions/v1/generate-monthly-invoices',
    headers := jsonb_build_object('Authorization', 'Bearer YOUR_ANON_KEY'),
    body := '{}'::jsonb
  );
  $$
);
```

3. **إنشاء CRON Job لتذكيرات الدفع اليومية**

```sql
-- يعمل يومياً الساعة 9 صباحاً
SELECT cron.schedule(
  'daily-payment-reminders',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://rtottdvuftbqktzborvv.supabase.co/functions/v1/process-payment-reminders',
    headers := jsonb_build_object('Authorization', 'Bearer YOUR_ANON_KEY'),
    body := '{}'::jsonb
  );
  $$
);
```

4. **التحقق من CRON Jobs**

```sql
SELECT * FROM cron.job;
```

---

## 🎯 الخيار 2: استخدام GitHub Actions

### المتطلبات
- صلاحيات `workflows` في GitHub
- GitHub Secrets مُعدّة بشكل صحيح

### الخطوات

1. **إعداد GitHub Secrets**

انتقل إلى Settings → Secrets and variables → Actions وأضف:

```
SUPABASE_PROJECT_REF=rtottdvuftbqktzborvv
SUPABASE_ACCESS_TOKEN=<your_access_token>
SUPABASE_ANON_KEY=<your_anon_key>
```

2. **إنشاء Workflow لتوليد الفواتير الشهرية**

أنشئ ملف `.github/workflows/scheduled-invoice-generation.yml`:

```yaml
name: Scheduled Invoice Generation

on:
  schedule:
    - cron: '0 9 28 * *'  # يوم 28 من كل شهر الساعة 9 صباحاً UTC
  workflow_dispatch:

jobs:
  generate-monthly-invoices:
    runs-on: ubuntu-latest
    steps:
      - name: Generate Monthly Invoices
        run: |
          response=$(curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json" \
            https://rtottdvuftbqktzborvv.supabase.co/functions/v1/generate-monthly-invoices)
          
          echo "$response"
          
          if echo "$response" | grep -q "success"; then
            echo "✅ Monthly invoices generated successfully!"
          else
            echo "❌ Failed to generate monthly invoices"
            exit 1
          fi
```

3. **إنشاء Workflow لتذكيرات الدفع اليومية**

أنشئ ملف `.github/workflows/daily-payment-reminders.yml`:

```yaml
name: Daily Payment Reminders

on:
  schedule:
    - cron: '0 9 * * *'  # يومياً الساعة 9 صباحاً UTC
  workflow_dispatch:

jobs:
  process-payment-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Process Payment Reminders
        run: |
          response=$(curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json" \
            https://rtottdvuftbqktzborvv.supabase.co/functions/v1/process-payment-reminders)
          
          echo "$response"
```

4. **إنشاء Workflow لنشر Edge Functions**

أنشئ ملف `.github/workflows/deploy-supabase-functions.yml`:

```yaml
name: Deploy Supabase Edge Functions

on:
  push:
    branches: [main]
    paths:
      - 'supabase/functions/**'
  workflow_dispatch:

jobs:
  deploy-functions:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Deploy Edge Functions
        run: |
          supabase functions deploy generate-monthly-invoices --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
          supabase functions deploy process-payment-reminders --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
          supabase functions deploy backfill-historical-invoices --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

---

## 🎯 الخيار 3: استخدام خدمة خارجية (Cron-job.org)

### الخطوات

1. **التسجيل في cron-job.org**
   - انتقل إلى https://cron-job.org
   - أنشئ حساب مجاني

2. **إنشاء Cron Job لتوليد الفواتير**
   - Title: `Monthly Invoice Generation`
   - URL: `https://rtottdvuftbqktzborvv.supabase.co/functions/v1/generate-monthly-invoices`
   - Schedule: `0 9 28 * *` (يوم 28 من كل شهر)
   - Request Method: `POST`
   - Headers:
     ```
     Authorization: Bearer YOUR_ANON_KEY
     Content-Type: application/json
     ```

3. **إنشاء Cron Job لتذكيرات الدفع**
   - Title: `Daily Payment Reminders`
   - URL: `https://rtottdvuftbqktzborvv.supabase.co/functions/v1/process-payment-reminders`
   - Schedule: `0 9 * * *` (يومياً)
   - Request Method: `POST`
   - Headers:
     ```
     Authorization: Bearer YOUR_ANON_KEY
     Content-Type: application/json
     ```

---

## 🧪 الاختبار

### اختبار يدوي للـ Edge Functions

1. **توليد الفواتير الشهرية:**

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  https://rtottdvuftbqktzborvv.supabase.co/functions/v1/generate-monthly-invoices
```

2. **معالجة تذكيرات الدفع:**

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  https://rtottdvuftbqktzborvv.supabase.co/functions/v1/process-payment-reminders
```

3. **توليد الفواتير التاريخية:**

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  https://rtottdvuftbqktzborvv.supabase.co/functions/v1/backfill-historical-invoices
```

---

## 📊 المراقبة والتتبع

### عرض سجلات Edge Functions

1. انتقل إلى لوحة تحكم Supabase
2. اذهب إلى **Edge Functions**
3. اختر الـ function المطلوب
4. انقر على **Logs**

### عرض سجلات CRON Jobs (pg_cron)

```sql
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;
```

### عرض سجلات GitHub Actions

1. انتقل إلى GitHub Repository
2. اذهب إلى **Actions**
3. اختر الـ workflow المطلوب
4. انقر على أحدث run

---

## 🔧 استكشاف الأخطاء

### المشكلة: CRON Job لا يعمل

**الحل:**
1. تحقق من أن pg_cron extension مفعّل
2. تحقق من صلاحيات المستخدم
3. راجع سجلات الأخطاء:
   ```sql
   SELECT * FROM cron.job_run_details 
   WHERE status = 'failed' 
   ORDER BY start_time DESC;
   ```

### المشكلة: GitHub Action فشل

**الحل:**
1. تحقق من GitHub Secrets
2. راجع سجلات الـ workflow
3. تحقق من صلاحيات GitHub App

### المشكلة: Edge Function يرجع خطأ

**الحل:**
1. راجع سجلات الـ function في Supabase
2. تحقق من صلاحيات قاعدة البيانات
3. تحقق من متغيرات البيئة

---

## 📝 ملاحظات مهمة

1. **التوقيت:** جميع الأوقات في CRON expressions هي UTC
2. **الصلاحيات:** تأكد من أن ANON_KEY له الصلاحيات المطلوبة
3. **المراقبة:** راقب السجلات بانتظام للتأكد من عمل النظام
4. **النسخ الاحتياطي:** احتفظ بنسخة احتياطية من CRON Jobs

---

## 🎉 الخلاصة

بعد إعداد أحد الخيارات أعلاه، سيعمل النظام تلقائياً:
- ✅ توليد الفواتير الشهرية يوم 28 من كل شهر
- ✅ إرسال تذكيرات الدفع يومياً
- ✅ معالجة الفواتير المتأخرة تلقائياً

**الخيار الموصى به:** استخدم pg_cron إذا كان لديك Supabase Pro، وإلا استخدم GitHub Actions أو cron-job.org.
