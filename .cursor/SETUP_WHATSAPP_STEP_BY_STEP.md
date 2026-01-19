# 📱 دليل إعداد نظام واتساب خطوة بخطوة

## 🎯 الهدف
تفعيل نظام إرسال تنبيهات واتساب تلقائياً للعملاء عند الضغط على زر "إرسال تنبيهات".

---

## ⏱️ الوقت المتوقع: 30 دقيقة

---

## 📝 الخطوة 1: التسجيل في Ultramsg (5 دقائق)

### 1.1 إنشاء حساب
1. افتح: https://ultramsg.com/ar
2. اضغط "تسجيل" أو "Sign Up"
3. أدخل بريدك الإلكتروني وكلمة المرور
4. تأكيد البريد الإلكتروني

### 1.2 إنشاء Instance
1. بعد تسجيل الدخول، اضغط "Create Instance"
2. اختر اسم للـ Instance (مثال: "Alaraf-Reminders")
3. اختر الخطة:
   - **Basic:** $5/شهر (كافي للبداية)
   - **Pro:** $15/شهر (ميزات إضافية)

### 1.3 مسح QR Code
1. افتح WhatsApp على هاتفك
2. اذهب إلى: الإعدادات → الأجهزة المرتبطة
3. اضغط "ربط جهاز"
4. امسح QR Code من Ultramsg Dashboard
5. انتظر حتى يظهر "Connected ✅"

### 1.4 الحصول على بيانات الاتصال
بعد الاتصال، ستجد في Dashboard:
```
Instance ID: instance123456
Token: abc123xyz456...
```

احفظ هذه البيانات! ستحتاجها لاحقاً.

---

## 🔧 الخطوة 2: تحديث Supabase (10 دقائق)

### 2.1 إضافة Edge Function Secrets

1. افتح Supabase Dashboard
2. اذهب إلى: **Project Settings** → **Edge Functions**
3. اضغط **Add Secret**
4. أضف:

```
Name: ULTRAMSG_INSTANCE_ID
Value: instance123456  (قيمتك الفعلية)

Name: ULTRAMSG_TOKEN
Value: abc123xyz456... (قيمتك الفعلية)
```

### 2.2 تطبيق Migration

في terminal المشروع:

```bash
# تأكد أنك في مجلد المشروع
cd C:\Users\khamis\Desktop\fleetifyapp-3

# تطبيق migration
npx supabase db push
```

هذا سينشئ:
- ✅ Function `get_whatsapp_stats()` للإحصائيات
- ✅ View `whatsapp_reminders_status` للمراقبة
- ✅ Indexes للأداء

### 2.3 تفعيل pg_cron و pg_net

في Supabase SQL Editor:

```sql
-- تفعيل الإضافات المطلوبة
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- التحقق من التفعيل
SELECT * FROM pg_extension WHERE extname IN ('pg_cron', 'pg_net');
```

---

## 🚀 الخطوة 3: نشر Edge Function (5 دقائق)

### 3.1 تثبيت Supabase CLI (إذا لم يكن مثبتاً)

```bash
npm install -g supabase
```

### 3.2 تسجيل الدخول

```bash
npx supabase login
```

### 3.3 ربط المشروع

```bash
# في مجلد المشروع
npx supabase link --project-ref YOUR_PROJECT_REF
```

**ملاحظة:** استبدل `YOUR_PROJECT_REF` بمعرف مشروعك من Supabase Dashboard

### 3.4 Deploy Edge Function

```bash
npx supabase functions deploy send-whatsapp-reminders
```

انتظر حتى ترى:
```
✅ Deployed send-whatsapp-reminders
Function URL: https://YOUR_PROJECT.supabase.co/functions/v1/send-whatsapp-reminders
```

---

## ⏰ الخطوة 4: إعداد Automation (5 دقائق)

### 4.1 إعداد Cron Job

في Supabase SQL Editor:

```sql
-- جدولة Edge Function للعمل كل 5 دقائق
SELECT cron.schedule(
  'process-whatsapp-reminders',
  '*/5 * * * *', -- كل 5 دقائق
  $$
  SELECT
    net.http_post(
      url := 'https://qwhunliohlkkahbspfiu.supabase.co/functions/v1/send-whatsapp-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_ANON_KEY'
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);
```

**استبدل:**
- `YOUR_ANON_KEY` بمفتاح anon/public من: Project Settings → API

### 4.2 التحقق من Cron Job

```sql
-- عرض جميع Cron Jobs
SELECT * FROM cron.job WHERE jobname LIKE '%whatsapp%';

-- عرض آخر تشغيل
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-whatsapp-reminders')
ORDER BY start_time DESC 
LIMIT 5;
```

---

## 🧪 الخطوة 5: الاختبار (5 دقائق)

### 5.1 اختبار رسالة واحدة

في Supabase Functions → send-whatsapp-reminders → Invoke:

```json
{
  "test": true,
  "phone": "97412345678",
  "message": "رسالة تجريبية من نظام التنبيهات ✅"
}
```

اضغط **Invoke Function**. يجب أن ترى:
```json
{
  "success": true,
  "message": "Test message sent!",
  "messageId": "..."
}
```

### 5.2 اختبار من صفحة العقود

1. افتح: https://www.alaraf.online/contracts
2. اضغط زر "إرسال تنبيهات"
3. اختر عقد أو أكثر
4. اختر نوع التذكير
5. اضغط "إرسال"
6. انتظر 1-5 دقائق
7. تحقق من الرسائل على هاتف العميل

### 5.3 التحقق من قاعدة البيانات

```sql
-- عرض آخر 10 تنبيهات
SELECT * FROM whatsapp_reminders_status LIMIT 10;

-- عرض الإحصائيات
SELECT get_whatsapp_stats();
```

يجب أن ترى:
```json
{
  "total_queued": 0,
  "total_sent": 1,
  "total_failed": 0,
  "success_rate": 100,
  "avg_send_time": 1.5
}
```

---

## 📊 المراقبة والصيانة

### مراقبة يومية

```sql
-- التحقق من حالة النظام
SELECT 
  status,
  COUNT(*) as count,
  ROUND(AVG(EXTRACT(EPOCH FROM (sent_at - created_at))), 2) as avg_seconds
FROM reminder_schedules
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY status;
```

### مراقبة أسبوعية

```sql
-- معدل النجاح الأسبوعي
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'sent') as sent,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  ROUND(
    (COUNT(*) FILTER (WHERE status = 'sent')::DECIMAL / COUNT(*)) * 100,
    2
  ) as success_rate
FROM reminder_schedules
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## ⚠️ استكشاف الأخطاء

### المشكلة: "No reminders sent"

**الحلول:**
1. تحقق من Cron Job:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'process-whatsapp-reminders';
   ```

2. تحقق من Edge Function logs في Dashboard

3. اختبر Edge Function يدوياً:
   ```bash
   curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/send-whatsapp-reminders" \
     -H "Authorization: Bearer YOUR_ANON_KEY"
   ```

### المشكلة: "Instance not connected"

**الحل:**
1. افتح Ultramsg Dashboard
2. تحقق من حالة الاتصال
3. إذا كان منقطعاً، امسح QR code مرة أخرى

### المشكلة: "Invalid phone number"

**الحل:**
تأكد من أن أرقام الهواتف بالتنسيق الصحيح:
```
✅ 97412345678 (صحيح)
❌ +974 1234 5678 (خطأ)
❌ 00974 12345678 (خطأ)
```

### المشكلة: معدل نجاح منخفض (< 90%)

**الحلول:**
1. تحقق من أرقام الهواتف في قاعدة البيانات
2. تحقق من رصيد Ultramsg
3. تحقق من حالة Instance في Dashboard

---

## 🎉 انتهى الإعداد!

بعد إكمال جميع الخطوات، النظام سيعمل كالتالي:

```
1. المستخدم يضغط "إرسال تنبيهات" في صفحة العقود
   ↓
2. النظام يُسجل التنبيهات في reminder_schedules (status='queued')
   ↓
3. Cron Job يعمل كل 5 دقائق
   ↓
4. Edge Function يقرأ التنبيهات المنتظرة
   ↓
5. Edge Function يرسل عبر Ultramsg API
   ↓
6. العميل يستلم الرسالة على واتساب ✅
   ↓
7. النظام يحدث status='sent' في قاعدة البيانات
```

---

## 📞 الدعم

إذا واجهت أي مشاكل:
1. راجع Logs في Supabase Dashboard
2. تحقق من Ultramsg Dashboard
3. راجع ملف `WHATSAPP_IMPLEMENTATION_PLAN.md`
4. استخدم SQL للتشخيص:
   ```sql
   SELECT * FROM whatsapp_reminders_status 
   WHERE status = 'failed' 
   ORDER BY created_at DESC;
   ```

---

**تم الإعداد في:** ___/___/2025  
**تم بواسطة:** ___________  
**الحالة:** ⏳ في انتظار التنفيذ

