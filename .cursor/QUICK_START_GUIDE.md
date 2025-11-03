# 🚀 دليل البدء السريع - نظام واتساب

## ⚡ الخطوات السريعة (15 دقيقة)

### 1️⃣ التسجيل في Ultramsg (3 دقائق)

```
📱 افتح: https://ultramsg.com/ar
📝 سجل حساب جديد
➕ أنشئ Instance جديد
📷 امسح QR Code من هاتفك
✅ احفظ Instance ID و Token
```

### 2️⃣ إضافة Secrets في Supabase (2 دقيقة)

```
📂 Supabase Dashboard → Settings → Edge Functions
🔐 Add Secret:
   - Name: ULTRAMSG_INSTANCE_ID
   - Value: [قيمتك من Ultramsg]

🔐 Add Secret:
   - Name: ULTRAMSG_TOKEN  
   - Value: [قيمتك من Ultramsg]
```

### 3️⃣ تطبيق Migration (2 دقيقة)

```bash
cd C:\Users\khamis\Desktop\fleetifyapp-3
npx supabase db push
```

### 4️⃣ Deploy Edge Function (3 دقائق)

```bash
# تسجيل الدخول (أول مرة فقط)
npx supabase login

# ربط المشروع (أول مرة فقط)
npx supabase link --project-ref qwhunliohlkkahbspfiu

# Deploy
npx supabase functions deploy send-whatsapp-reminders
```

### 5️⃣ إعداد Cron Job (2 دقيقة)

في Supabase SQL Editor:

```sql
-- تفعيل الإضافات
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- جدولة المعالجة التلقائية (كل 5 دقائق)
SELECT cron.schedule(
  'process-whatsapp-reminders',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/send-whatsapp-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3aHVubGlvaGxra2FoYnNwZml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA1NDg2MzQsImV4cCI6MjA0NjEyNDYzNH0.YOUR_ACTUAL_ANON_KEY'
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
```

**ملاحظة:** استبدل `YOUR_ACTUAL_ANON_KEY` بالمفتاح من: Project Settings → API → anon public

### 6️⃣ الاختبار (3 دقيقة)

في Supabase Dashboard → Edge Functions → send-whatsapp-reminders → Invoke:

```json
{
  "test": true,
  "phone": "97412345678",
  "message": "رسالة تجريبية ✅"
}
```

اضغط **Invoke** وتحقق من استلام الرسالة على الهاتف.

---

## ✅ انتهى!

الآن عند الضغط على "إرسال تنبيهات" في صفحة العقود:
1. ✅ يُسجل في قاعدة البيانات
2. ✅ Cron يعالج كل 5 دقائق
3. ✅ يُرسل عبر واتساب
4. ✅ العميل يستلم الرسالة

---

## 🔍 التحقق من عمل النظام

```sql
-- في Supabase SQL Editor
SELECT get_whatsapp_stats();
```

يجب أن ترى:
```json
{
  "total_queued": 0,
  "total_sent": [عدد الرسائل المرسلة],
  "success_rate": [نسبة النجاح]
}
```

---

## 📞 مشاكل؟

### لا يرسل:
```sql
-- تحقق من Cron
SELECT * FROM cron.job WHERE jobname = 'process-whatsapp-reminders';

-- معالجة يدوية
SELECT net.http_post(
  url := 'https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/send-whatsapp-reminders',
  headers := '{"Authorization": "Bearer YOUR_KEY"}'::jsonb
);
```

### أرقام غير صحيحة:
تأكد من التنسيق: `97412345678` (بدون مسافات أو +)

---

**التكلفة:** $5/شهر فقط  
**الوقت:** 15 دقيقة إعداد  
**النتيجة:** ✅ نظام كامل يعمل تلقائياً

