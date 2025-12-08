# Task: إصلاح التقارير التلقائية وبيانات أفضل المركبات

## Objective
إصلاح مشكلتين رئيسيتين في نظام التقارير:
1. التقارير اليومية والأسبوعية لا تُرسل تلقائياً
2. قسم "أفضل المركبات أداءً" يظهر بيانات غير صحيحة (0 ر.ق)

## Acceptance Criteria
- [x] قسم "أفضل المركبات أداءً" يعرض الإيرادات الفعلية من المدفوعات
- [x] تنسيق أفضل للبيانات (رقم اللوحة • المبلغ)
- [x] رسالة واضحة عند عدم وجود إيرادات
- [ ] التقارير تُرسل تلقائياً حسب الجدول المحدد

## Scope & Impact Radius
| الملف | التعديل |
|-------|---------|
| `ReportScheduler.ts` | ✅ إصلاح استعلام أفضل المركبات |
| `MessageTemplates.ts` | ✅ تحسين تنسيق العرض |
| `supabase/functions/` | ⏳ إنشاء Edge Function للجدولة |

## المشاكل التقنية

### 🔴 مشكلة الإرسال التلقائي

**السبب الجذري:**
```
المجدول الحالي (ReportScheduler) يعمل على:
├ المتصفح (Client-side) ❌
├ يتوقف عند إغلاق المتصفح ❌
├ يتوقف عند تحديث الصفحة ❌
└ لا يوجد Backend Cron Job ❌
```

**الحل المقترح:**
```
الخيارات المتاحة:
├ 1. Supabase Edge Functions + pg_cron (مفضل) ✅
├ 2. Vercel Cron Jobs
├ 3. خدمة خارجية (GitHub Actions, AWS Lambda)
└ 4. Self-hosted Cron على الخادم
```

### ✅ مشكلة "أفضل المركبات" (تم الحل)

**المشكلة:**
- كان يجلب `monthly_rate` من جدول `vehicles`
- وهو حقل قد يكون فارغاً أو 0

**الحل:**
- الآن يجلب المدفوعات الفعلية من جدول `payments`
- يجمعها حسب المركبة
- يرتبها تنازلياً حسب الإيرادات

## التغييرات المُنجزة

### 1. ReportScheduler.ts - استعلام جديد
```typescript
// قبل (خاطئ)
const { data: topVehicles } = await supabase
  .from('vehicles')
  .select('plate_number, monthly_rate')  // ← المشكلة هنا
  .eq('status', 'rented')

// بعد (صحيح)
const { data: paymentsData } = await supabase
  .from('payments')
  .select(`
    amount,
    contracts!inner(
      vehicle_id,
      vehicles!inner(id, plate_number)
    )
  `)
  .gte('payment_date', weekStart)
  .lte('payment_date', weekEnd)

// تجميع الإيرادات حسب المركبة
const vehicleRevenueMap = new Map()
paymentsData?.forEach(payment => {
  // ... تجميع الإيرادات
})

// ترتيب حسب الأعلى إيرادات
const topVehicles = Array.from(vehicleRevenueMap.values())
  .sort((a, b) => b.revenue - a.revenue)
  .slice(0, 5)
```

### 2. MessageTemplates.ts - تنسيق أفضل
```typescript
// قبل
├ 185 513: 0 ر.ق

// بعد
├ 185 513 • 25,000 ر.ق
// أو إذا لا توجد بيانات:
└ لا توجد إيرادات مسجلة هذا الأسبوع
```

## الخطوات القادمة (للإرسال التلقائي)

### الخيار 1: Supabase Edge Function + pg_cron (مُفضل)

```sql
-- تفعيل pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- إنشاء جدول للتتبع
CREATE TABLE report_schedule_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_type TEXT NOT NULL,
  scheduled_time TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدولة التقرير اليومي (8 صباحاً يومياً)
SELECT cron.schedule(
  'daily-fleet-report',
  '0 8 * * *',
  $$SELECT net.http_post(
    'https://YOUR_PROJECT.supabase.co/functions/v1/send-daily-report',
    '{}',
    'application/json',
    array[array['Authorization', 'Bearer SERVICE_ROLE_KEY']]
  )$$
);

-- جدولة التقرير الأسبوعي (9 صباحاً كل أحد)
SELECT cron.schedule(
  'weekly-fleet-report',
  '0 9 * * 0',
  $$SELECT net.http_post(
    'https://YOUR_PROJECT.supabase.co/functions/v1/send-weekly-report',
    '{}',
    'application/json',
    array[array['Authorization', 'Bearer SERVICE_ROLE_KEY']]
  )$$
);
```

### الخيار 2: Vercel Cron (إذا كان التطبيق على Vercel)

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/daily-report",
      "schedule": "0 8 * * *"
    },
    {
      "path": "/api/cron/weekly-report", 
      "schedule": "0 9 * * 0"
    }
  ]
}
```

## التحقق

- [x] لا توجد أخطاء Linter
- [x] الكود يجمع الإيرادات الفعلية
- [x] التنسيق واضح ومفهوم
- [ ] اختبار الإرسال اليدوي
- [ ] تفعيل Cron Job للإرسال التلقائي

## ملاحظات مهمة

⚠️ **الإرسال التلقائي يتطلب:**
1. إعداد Supabase Edge Function أو Vercel Cron
2. ربط API الواتساب مع الخادم
3. تخزين credentials بشكل آمن

📌 **للاختبار الآن:**
- استخدم زر "إرسال التقرير الأسبوعي" من إعدادات الواتساب
- راجع البيانات في التقرير

---

**تاريخ التحديث**: ${new Date().toLocaleDateString('ar-QA')}
