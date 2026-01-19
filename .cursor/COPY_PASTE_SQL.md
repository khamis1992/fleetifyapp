# 📋 SQL للنسخ واللصق المباشر

## ⚠️ تنبيه مهم
**استبدل `YOUR_ACTUAL_ANON_KEY_HERE` بالمفتاح الفعلي من:**
```
Supabase Dashboard → Project Settings → API → anon public
```

---

## 1️⃣ تفعيل الإضافات

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
```

**اضغط Run ✅**

---

## 2️⃣ جدولة Edge Function (كل 5 دقائق)

**⚠️ عدّل الـ Bearer token أولاً!**

```sql
SELECT cron.schedule(
  'process-whatsapp-reminders',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/send-whatsapp-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_ACTUAL_ANON_KEY_HERE'
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);
```

**اضغط Run ✅**

---

## 3️⃣ التحقق من النجاح

```sql
SELECT 
  jobid,
  jobname,
  schedule,
  active
FROM cron.job 
WHERE jobname = 'process-whatsapp-reminders';
```

**يجب أن ترى:**
```
jobname: process-whatsapp-reminders
schedule: */5 * * * *
active: true
```

**اضغط Run ✅**

---

## 4️⃣ اختبار يدوي (اختياري)

**عدّل الـ Bearer token أولاً!**

```sql
SELECT
  net.http_post(
    url := 'https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/send-whatsapp-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_ACTUAL_ANON_KEY_HERE'
    ),
    body := '{}'::jsonb
  ) as request_id;
```

**اضغط Run ✅**

---

## 5️⃣ مراقبة النتائج

```sql
SELECT get_whatsapp_stats();
```

**اضغط Run ✅**

---

## 🔍 استكشاف الأخطاء

### إذا لم يعمل Cron:

```sql
-- حذف الـ job القديم
SELECT cron.unschedule('process-whatsapp-reminders');

-- إعادة الجدولة (نفذ الكود من الخطوة 2 مرة أخرى)
```

### التحقق من آخر تشغيل:

```sql
SELECT * 
FROM cron.job_run_details 
WHERE jobid = (
  SELECT jobid FROM cron.job 
  WHERE jobname = 'process-whatsapp-reminders'
)
ORDER BY start_time DESC 
LIMIT 5;
```

---

## 📌 ملاحظات

1. **Cron Expression `*/5 * * * *` تعني:**
   - كل 5 دقائق
   - من كل ساعة
   - من كل يوم

2. **Edge Function URL:**
   - ثابت للمشروع: `qwhunliohlkkahbspfiu`
   - لا تغيره

3. **Bearer Token:**
   - **مهم جداً:** احصل عليه من Dashboard
   - لا تستخدم service_role_key (خطر!)
   - استخدم anon/public key فقط

---

## ✅ Checklist

- [ ] نفذت الخطوة 1 (تفعيل الإضافات)
- [ ] عدّلت Bearer token في الخطوة 2
- [ ] نفذت الخطوة 2 (الجدولة)
- [ ] نفذت الخطوة 3 (التحقق)
- [ ] رأيت `active: true` ✅
- [ ] النظام يعمل! 🎉

---

**الخطأ الشائع:**
```
❌ نسيت تعديل YOUR_ACTUAL_ANON_KEY_HERE
✅ عدّله أولاً ثم نفذ الكود
```

