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
    url := 'https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/generate-monthly-invoices',
    headers := jsonb_build_object(
      'x-agent-secret', 'YOUR_INVOICE_GENERATOR_SECRET',
      'Content-Type', 'application/json'
    ),
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
    url := 'https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/process-payment-reminders',
    headers := jsonb_build_object(
      'x-agent-secret', 'YOUR_PAYMENT_REMINDERS_SECRET',
      'Content-Type', 'application/json'
    ),
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
SUPABASE_PROJECT_REF=qwhunliohlkkahbspfiu
SUPABASE_ACCESS_TOKEN=<your_access_token>
INVOICE_GENERATOR_SECRET=<a-long-random-secret>
PAYMENT_REMINDERS_SECRET=<a-separate-long-random-secret>
```

اضبط كذلك أسرار مزود واتساب داخل Supabase Functions (وليست GitHub Actions):

```bash
npx supabase secrets set ULTRAMSG_INSTANCE_ID=<instance-id>
npx supabase secrets set ULTRAMSG_TOKEN=<rotated-provider-token>
npx supabase secrets set WHATSAPP_REMINDERS_SECRET=<internal-adapter-secret>
```

يجب تدوير رمز Ultramsg القديم لدى المزود قبل النشر؛ حذف الرمز من المصدر لا
يلغيه من تاريخ Git أو النسخ السابقة. وظائف الإرسال تفشل بشكل آمن إذا لم تضبط
هذه الأسرار، ولا تسمح بإرسال رقم/نص عشوائي مباشرة من المتصفح.

استخدم `PAYMENT_REMINDERS_SECRET` للتذكيرات. تدعم الوظيفة مؤقتاً
`INVOICE_GENERATOR_SECRET` كقيمة احتياطية إذا لم يُضبط السر المخصص.

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
          set -euo pipefail
          response=$(curl --fail-with-body --silent --show-error -X POST \
            -H "x-agent-secret: ${{ secrets.INVOICE_GENERATOR_SECRET }}" \
            -H "Content-Type: application/json" \
            --data '{}' \
            https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/generate-monthly-invoices)
          
          echo "$response"
          
          if echo "$response" | jq -e '.success == true' >/dev/null; then
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
          set -euo pipefail
          response=$(curl --fail-with-body --silent --show-error -X POST \
            -H "x-agent-secret: ${{ secrets.PAYMENT_REMINDERS_SECRET }}" \
            -H "Content-Type: application/json" \
            --data '{}' \
            https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/process-payment-reminders)
          
          echo "$response"

          if ! echo "$response" | jq -e '(.success == true) and (((.results.errors // []) | length) == 0)' >/dev/null; then
            echo "Failed to process payment reminders"
            exit 1
          fi
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
          supabase functions deploy generate-monthly-invoices --no-verify-jwt --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
          supabase functions deploy process-payment-reminders --no-verify-jwt --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
          supabase functions deploy backfill-historical-invoices --no-verify-jwt --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
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
   - URL: `https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/generate-monthly-invoices`
   - Schedule: `0 9 28 * *` (يوم 28 من كل شهر)
   - Request Method: `POST`
   - Headers:
     ```
     x-agent-secret: YOUR_INVOICE_GENERATOR_SECRET
     Content-Type: application/json
     ```

3. **إنشاء Cron Job لتذكيرات الدفع**
   - Title: `Daily Payment Reminders`
   - URL: `https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/process-payment-reminders`
   - Schedule: `0 9 * * *` (يومياً)
   - Request Method: `POST`
   - Headers:
     ```
     x-agent-secret: YOUR_PAYMENT_REMINDERS_SECRET
     Content-Type: application/json
     ```

---

## 🧪 الاختبار

### اختبار يدوي للـ Edge Functions

1. **توليد الفواتير الشهرية:**

```bash
curl --fail-with-body --silent --show-error -X POST \
  -H "x-agent-secret: YOUR_INVOICE_GENERATOR_SECRET" \
  -H "Content-Type: application/json" \
  --data '{}' \
  https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/generate-monthly-invoices
```

عند التشغيل المجدول يوم 28، يولّد الطلب الفارغ فواتير شهر المحاسبة التالي. لإصلاح شهر محدد يدويًا، أرسل مثلاً
`{"targetMonth":"2026-08","sendNotifications":false}` ثم راجع النتيجة قبل تفعيل الإشعارات.

2. **معالجة تذكيرات الدفع:**

```bash
curl --fail-with-body --silent --show-error -X POST \
  -H "x-agent-secret: YOUR_PAYMENT_REMINDERS_SECRET" \
  -H "Content-Type: application/json" \
  --data '{}' \
  https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/process-payment-reminders
```

3. **توليد الفواتير التاريخية:**

```bash
curl --fail-with-body --silent --show-error -X POST \
  -H "x-agent-secret: YOUR_INVOICE_GENERATOR_SECRET" \
  -H "Content-Type: application/json" \
  --data '{"companyId":"YOUR_COMPANY_ID","throughMonth":"2026-08","dryRun":true}' \
  https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/backfill-historical-invoices
```

الاستدعاء التاريخي يبدأ دائمًا بوضع المعاينة. بعد مراجعة `results` والتأكد من الشركة والشهر، أعد الطلب نفسه مع
`"dryRun":false`. لا تستخدم مفتاح `anon` ولا تشغّل الاستدعاء دون `companyId` صريح.

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
2. **الصلاحيات:** استخدم `x-agent-secret` ولا تستخدم مفتاح `anon` لتشغيل وظائف الأتمتة.
   تُنشر `process-payment-reminders` مع `--no-verify-jwt` لأن الوظيفة تتحقق داخلياً من السر أو service-role bearer.
3. **المراقبة:** راقب السجلات بانتظام للتأكد من عمل النظام
4. **النسخ الاحتياطي:** احتفظ بنسخة احتياطية من CRON Jobs

---

## 🎉 الخلاصة

بعد إعداد أحد الخيارات أعلاه، سيعمل النظام تلقائياً:
- ✅ توليد الفواتير الشهرية يوم 28 من كل شهر
- ✅ إرسال تذكيرات الدفع يومياً
- ✅ إرسال تنبيهات الفواتير المتأخرة والإبلاغ عن `late_fee_candidates` دون تعديل المستندات المالية

**الخيار الموصى به:** استخدم pg_cron إذا كان لديك Supabase Pro، وإلا استخدم GitHub Actions أو cron-job.org.
