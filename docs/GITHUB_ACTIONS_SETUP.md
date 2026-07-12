# إعداد GitHub Actions للتشغيل الآلي

## 📋 نظرة عامة

هذا الدليل يشرح كيفية إعداد GitHub Actions لتشغيل المهام الدورية تلقائياً:
- توليد الفواتير الشهرية (يوم 28 من كل شهر)
- إرسال تذكيرات الدفع اليومية (كل يوم الساعة 9 صباحاً)

---

## 🔧 الخطوة 1: إعداد GitHub Secrets

1. اذهب إلى repository settings في GitHub:
   ```
   https://github.com/khamis1992/fleetifyapp/settings/secrets/actions
   ```

2. أضف الـ secrets التالية:

   **SUPABASE_URL**
   ```
   https://qwhunliohlkkahbspfiu.supabase.co
   ```

   **SUPABASE_ANON_KEY**
   ```
   <your-supabase-anon-key>
   ```

---

## 📝 الخطوة 2: إنشاء Workflow Files

### 1. توليد الفواتير الشهرية

أنشئ ملف: `.github/workflows/monthly-invoices.yml`

```yaml
name: Generate Monthly Invoices

on:
  schedule:
    # يوم 28 من كل شهر الساعة 9 صباحاً (UTC)
    - cron: '0 9 28 * *'
  workflow_dispatch: # للتشغيل اليدوي

jobs:
  generate-invoices:
    runs-on: ubuntu-latest
    steps:
      - name: Call Supabase Edge Function
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json" \
            ${{ secrets.SUPABASE_URL }}/functions/v1/generate-monthly-invoices

      - name: Notify on failure
        if: failure()
        run: echo "Failed to generate monthly invoices"
```

### 2. تذكيرات الدفع اليومية

أنشئ ملف: `.github/workflows/daily-reminders.yml`

```yaml
name: Send Payment Reminders

on:
  schedule:
    # كل يوم الساعة 9 صباحاً (UTC)
    - cron: '0 9 * * *'
  workflow_dispatch: # للتشغيل اليدوي

jobs:
  send-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Call Supabase Edge Function
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json" \
            ${{ secrets.SUPABASE_URL }}/functions/v1/process-payment-reminders

      - name: Notify on failure
        if: failure()
        run: echo "Failed to send payment reminders"
```

---

## ✅ الخطوة 3: التفعيل

1. **Commit الملفات:**
   ```bash
   git add .github/workflows/
   git commit -m "feat: Add GitHub Actions for automated tasks"
   git push origin main
   ```

2. **تحقق من التفعيل:**
   - اذهب إلى: `https://github.com/khamis1992/fleetifyapp/actions`
   - يجب أن ترى الـ workflows الجديدة

3. **اختبار يدوي:**
   - اضغط على workflow
   - اضغط "Run workflow"
   - اختر "Run workflow" مرة أخرى

---

## 🕐 الجداول الزمنية

### توليد الفواتير الشهرية
- **الوقت:** يوم 28 من كل شهر الساعة 9 صباحاً UTC
- **التوقيت المحلي (الكويت - UTC+3):** 12 ظهراً

### تذكيرات الدفع اليومية
- **الوقت:** كل يوم الساعة 9 صباحاً UTC
- **التوقيت المحلي (الكويت - UTC+3):** 12 ظهراً

---

## 🔍 المراقبة

### عرض السجلات:
1. اذهب إلى: `https://github.com/khamis1992/fleetifyapp/actions`
2. اختر الـ workflow
3. اختر التشغيل المطلوب
4. اضغط على الـ job لعرض التفاصيل

### إشعارات الفشل:
- GitHub سيرسل إشعار بريد إلكتروني عند فشل الـ workflow
- يمكنك إضافة إشعارات Slack أو Discord إذا أردت

---

## 🛠️ استكشاف الأخطاء

### إذا فشل الـ workflow:

1. **تحقق من الـ secrets:**
   ```bash
   # تأكد من أن الـ secrets موجودة ومحدّثة
   ```

2. **تحقق من Edge Functions:**
   ```bash
   # تأكد من أن الـ functions منشورة على Supabase
   curl -X POST \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/generate-monthly-invoices
   ```

3. **راجع السجلات:**
   - افحص سجلات GitHub Actions
   - افحص سجلات Supabase Edge Functions

---

## 📌 ملاحظات مهمة

1. **التوقيت:**
   - جميع الأوقات في GitHub Actions هي UTC
   - الكويت = UTC+3
   - لذا 9 صباحاً UTC = 12 ظهراً بتوقيت الكويت

2. **الحدود:**
   - GitHub Actions مجاني للـ public repositories
   - 2000 دقيقة/شهر للـ private repositories

3. **البدائل:**
   - إذا كنت تستخدم Supabase Pro، يمكنك استخدام pg_cron
   - يمكنك استخدام خدمات مثل cron-job.org

---

## 🎯 الخطوات التالية

1. ✅ أضف الـ secrets في GitHub
2. ✅ أنشئ الـ workflow files
3. ✅ اختبر الـ workflows يدوياً
4. ✅ راقب التشغيل الأول التلقائي
5. ✅ راجع السجلات بانتظام

---

**تم إعداد هذا الدليل بواسطة:** AI Assistant  
**التاريخ:** 18 نوفمبر 2025
