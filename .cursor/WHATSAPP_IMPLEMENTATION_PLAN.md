# 🚀 خطة تنفيذ نظام إرسال تنبيهات واتساب

## 📋 تقييم الحلول المتاحة

### الحل 1: Puppeteer + WhatsApp Web ⚠️
**المزايا:**
- ✅ مجاني تماماً
- ✅ لا يحتاج API keys
- ✅ سهل البداية

**العيوب:**
- ❌ غير مستقر (WhatsApp قد يحظر الحساب)
- ❌ يحتاج QR scanning كل فترة
- ❌ يستهلك موارد كثيرة (Chrome browser)
- ❌ قد ينقطع الاتصال فجأة
- ❌ محدود في عدد الرسائل

**التقييم:** ❌ غير مستحسن للإنتاج

---

### الحل 2: WhatsApp Business API الرسمي 💼
**المزايا:**
- ✅ رسمي ومستقر 100%
- ✅ يدعم webhook للردود
- ✅ تقارير تفصيلية
- ✅ لا قيود على عدد الرسائل

**العيوب:**
- ❌ معقد في الإعداد
- ❌ يحتاج حساب Facebook Business
- ❌ يحتاج موافقة WhatsApp
- ❌ مكلف (حسب الاستخدام)

**التقييم:** ⭐⭐⭐ جيد للمؤسسات الكبيرة

---

### الحل 3: خدمة خارجية (Twilio/Ultramsg) ⭐ **مستحسن**
**المزايا:**
- ✅ سهل التطبيق (5 دقائق)
- ✅ مستقر وموثوق
- ✅ API بسيط
- ✅ دعم فني
- ✅ تسعير معقول

**العيوب:**
- ⚠️ يحتاج اشتراك شهري
- ⚠️ تكلفة لكل رسالة

**التقييم:** ⭐⭐⭐⭐⭐ **الحل المثالي**

---

## 🎯 الحل المقترح: Ultramsg API

### لماذا Ultramsg؟
1. **سهل الاستخدام:** API بسيط جداً
2. **رخيص:** $5/شهر للرسائل غير المحدودة
3. **لا يحتاج موافقات:** يعمل فوراً
4. **مستقر:** uptime 99.9%
5. **عربي:** دعم باللغة العربية

### البدائل المشابهة:
- **Maytapi:** $30/شهر
- **Chat-API:** $39/شهر
- **WATI:** $49/شهر

---

## 📝 خطة التنفيذ (3 مراحل)

### المرحلة 1: إعداد Ultramsg (10 دقائق) ⚡

#### الخطوة 1.1: التسجيل في Ultramsg
```
1. زيارة: https://ultramsg.com
2. إنشاء حساب جديد
3. إنشاء Instance جديد
4. مسح QR code من هاتفك
5. الحصول على:
   - Instance ID
   - API Token
```

#### الخطوة 1.2: اختبار API
```bash
curl -X POST "https://api.ultramsg.com/{instance_id}/messages/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "{your_token}",
    "to": "97412345678",
    "body": "مرحباً! هذه رسالة تجريبية"
  }'
```

---

### المرحلة 2: إنشاء Supabase Edge Function (15 دقيقة) ⚡

#### الخطوة 2.1: إنشاء Edge Function

```bash
# في terminal المشروع
cd supabase
npx supabase functions new send-whatsapp-reminders
```

#### الخطوة 2.2: كتابة الكود

**ملف:** `supabase/functions/send-whatsapp-reminders/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ULTRAMSG_INSTANCE_ID = Deno.env.get('ULTRAMSG_INSTANCE_ID')!;
const ULTRAMSG_TOKEN = Deno.env.get('ULTRAMSG_TOKEN')!;

interface Reminder {
  id: string;
  phone_number: string;
  message_template: string;
  customer_name: string;
}

async function sendWhatsAppMessage(phone: string, message: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.ultramsg.com/${ULTRAMSG_INSTANCE_ID}/messages/chat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: ULTRAMSG_TOKEN,
          to: phone.replace(/\D/g, ''), // إزالة جميع الأحرف غير الأرقام
          body: message,
        }),
      }
    );

    const data = await response.json();
    return data.sent === 'true' || data.sent === true;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return false;
  }
}

serve(async (req) => {
  try {
    // التحقق من طريقة الطلب
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    // إنشاء Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // قراءة التنبيهات في قائمة الانتظار
    const { data: reminders, error: fetchError } = await supabase
      .from('reminder_schedules')
      .select('id, phone_number, message_template, customer_name')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(50); // معالجة 50 رسالة كحد أقصى

    if (fetchError) {
      throw fetchError;
    }

    if (!reminders || reminders.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No reminders to process',
          sent: 0
        }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          } 
        }
      );
    }

    console.log(`📤 Processing ${reminders.length} reminders...`);

    let successCount = 0;
    let failedCount = 0;

    // إرسال كل رسالة
    for (const reminder of reminders as Reminder[]) {
      const sent = await sendWhatsAppMessage(
        reminder.phone_number,
        reminder.message_template
      );

      if (sent) {
        // تحديث الحالة إلى sent
        await supabase
          .from('reminder_schedules')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', reminder.id);

        // تسجيل في reminder_history
        await supabase
          .from('reminder_history')
          .insert({
            reminder_schedule_id: reminder.id,
            action: 'sent',
            success: true,
            phone_number: reminder.phone_number,
            message_sent: reminder.message_template,
          });

        successCount++;
        console.log(`✅ Sent to ${reminder.customer_name}: ${reminder.phone_number}`);
      } else {
        // تحديث الحالة إلى failed
        await supabase
          .from('reminder_schedules')
          .update({
            status: 'failed',
            last_error: 'Failed to send via Ultramsg',
            retry_count: supabase.raw('retry_count + 1'),
            updated_at: new Date().toISOString(),
          })
          .eq('id', reminder.id);

        // تسجيل في reminder_history
        await supabase
          .from('reminder_history')
          .insert({
            reminder_schedule_id: reminder.id,
            action: 'failed',
            success: false,
            phone_number: reminder.phone_number,
            error_message: 'Failed to send via Ultramsg',
          });

        failedCount++;
        console.log(`❌ Failed to send to ${reminder.customer_name}`);
      }

      // تأخير بسيط بين الرسائل (تجنب rate limiting)
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 ثانية
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${reminders.length} reminders`,
        sent: successCount,
        failed: failedCount,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );

  } catch (error) {
    console.error('Error in send-whatsapp-reminders:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
```

#### الخطوة 2.3: إضافة المتغيرات البيئية

```bash
# في Supabase Dashboard → Project Settings → Edge Functions → Secrets

# أضف:
ULTRAMSG_INSTANCE_ID=instance123456
ULTRAMSG_TOKEN=your_token_here
```

#### الخطوة 2.4: Deploy Edge Function

```bash
npx supabase functions deploy send-whatsapp-reminders
```

---

### المرحلة 3: إعداد Automation (5 دقائق) ⚡

#### الخيار 1: Cron Job في Supabase

```sql
-- في Supabase SQL Editor
SELECT cron.schedule(
  'process-whatsapp-reminders',
  '*/5 * * * *', -- كل 5 دقائق
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-whatsapp-reminders',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
    ) as request_id;
  $$
);
```

#### الخيار 2: Database Trigger (فوري)

```sql
-- إنشاء function لاستدعاء Edge Function تلقائياً
CREATE OR REPLACE FUNCTION trigger_whatsapp_send()
RETURNS TRIGGER AS $$
BEGIN
  -- استدعاء Edge Function عند إدراج reminder جديد بحالة queued
  IF NEW.status = 'queued' THEN
    PERFORM net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-whatsapp-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_ANON_KEY'
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger
CREATE TRIGGER on_reminder_queued
AFTER INSERT ON reminder_schedules
FOR EACH ROW
WHEN (NEW.status = 'queued')
EXECUTE FUNCTION trigger_whatsapp_send();
```

---

## 🧪 اختبار النظام

### الاختبار 1: إرسال يدوي من Dashboard

```typescript
// في src/hooks/useTestWhatsApp.ts (جديد)
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useTestWhatsApp = () => {
  const sendTest = async (phoneNumber: string) => {
    try {
      const { data, error } = await supabase.functions.invoke(
        'send-whatsapp-reminders',
        {
          body: {
            test: true,
            phone: phoneNumber,
            message: 'رسالة تجريبية من نظام التنبيهات ✅'
          }
        }
      );

      if (error) throw error;

      toast.success('تم إرسال الرسالة التجريبية بنجاح!');
      return data;
    } catch (error: any) {
      toast.error('فشل إرسال الرسالة: ' + error.message);
      throw error;
    }
  };

  return { sendTest };
};
```

### الاختبار 2: التحقق من قاعدة البيانات

```sql
-- التحقق من التنبيهات المرسلة
SELECT 
  rs.id,
  rs.customer_name,
  rs.phone_number,
  rs.status,
  rs.sent_at,
  rs.created_at,
  DATE_PART('second', rs.sent_at - rs.created_at) as send_duration_seconds
FROM reminder_schedules rs
WHERE rs.created_at >= NOW() - INTERVAL '1 hour'
ORDER BY rs.created_at DESC;

-- التحقق من السجل
SELECT 
  rh.*,
  rs.customer_name,
  rs.phone_number
FROM reminder_history rh
JOIN reminder_schedules rs ON rh.reminder_schedule_id = rs.id
WHERE rh.created_at >= NOW() - INTERVAL '1 hour'
ORDER BY rh.created_at DESC;
```

---

## 📊 مراقبة الأداء

### إضافة Dashboard للمراقبة

```typescript
// في src/components/whatsapp/WhatsAppStats.tsx
interface WhatsAppStats {
  total_queued: number;
  total_sent: number;
  total_failed: number;
  success_rate: number;
  avg_send_time: number;
}

export const WhatsAppStats = () => {
  const { data: stats } = useQuery({
    queryKey: ['whatsapp-stats'],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_whatsapp_stats');
      return data as WhatsAppStats;
    },
    refetchInterval: 30000, // تحديث كل 30 ثانية
  });

  return (
    <div className="grid grid-cols-4 gap-4">
      <StatCard 
        title="في الانتظار" 
        value={stats?.total_queued || 0}
        icon={Clock}
        color="yellow"
      />
      <StatCard 
        title="تم الإرسال" 
        value={stats?.total_sent || 0}
        icon={CheckCircle}
        color="green"
      />
      <StatCard 
        title="فشل" 
        value={stats?.total_failed || 0}
        icon={XCircle}
        color="red"
      />
      <StatCard 
        title="معدل النجاح" 
        value={`${stats?.success_rate || 0}%`}
        icon={TrendingUp}
        color="blue"
      />
    </div>
  );
};
```

### SQL Function للإحصائيات

```sql
CREATE OR REPLACE FUNCTION get_whatsapp_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_queued', (SELECT COUNT(*) FROM reminder_schedules WHERE status = 'queued'),
    'total_sent', (SELECT COUNT(*) FROM reminder_schedules WHERE status = 'sent' AND sent_at >= NOW() - INTERVAL '24 hours'),
    'total_failed', (SELECT COUNT(*) FROM reminder_schedules WHERE status = 'failed' AND updated_at >= NOW() - INTERVAL '24 hours'),
    'success_rate', (
      SELECT ROUND(
        (COUNT(*) FILTER (WHERE status = 'sent')::DECIMAL / 
         NULLIF(COUNT(*) FILTER (WHERE status IN ('sent', 'failed')), 0)) * 100, 
        2
      )
      FROM reminder_schedules 
      WHERE updated_at >= NOW() - INTERVAL '24 hours'
    ),
    'avg_send_time', (
      SELECT ROUND(AVG(EXTRACT(EPOCH FROM (sent_at - created_at)))::NUMERIC, 2)
      FROM reminder_schedules
      WHERE status = 'sent' AND sent_at >= NOW() - INTERVAL '24 hours'
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

---

## ✅ قائمة المراجعة النهائية

### قبل التشغيل:
- [ ] تسجيل في Ultramsg وإنشاء instance
- [ ] مسح QR code من الهاتف
- [ ] الحصول على Instance ID و Token
- [ ] إنشاء Edge Function
- [ ] إضافة متغيرات البيئة في Supabase
- [ ] Deploy Edge Function
- [ ] إعداد Cron Job أو Trigger
- [ ] اختبار إرسال رسالة واحدة

### بعد التشغيل:
- [ ] مراقبة السجلات لمدة ساعة
- [ ] التحقق من معدل النجاح (يجب أن يكون > 95%)
- [ ] اختبار إرسال متعدد (10+ رسائل)
- [ ] إعداد alerting لحالات الفشل
- [ ] توثيق الإعداد للفريق

---

## 🚨 معالجة المشاكل الشائعة

### المشكلة 1: "Instance not connected"
**الحل:** إعادة مسح QR code في لوحة Ultramsg

### المشكلة 2: "Rate limit exceeded"
**الحل:** زيادة التأخير بين الرسائل إلى 2-3 ثواني

### المشكلة 3: "Invalid phone number"
**الحل:** التأكد من تنسيق الرقم (مثال: 97412345678)

### المشكلة 4: Edge Function timeout
**الحل:** تقليل عدد الرسائل المعالجة في كل مرة (limit: 20 بدلاً من 50)

---

## 💰 التكلفة المتوقعة

### Ultramsg Pricing:
- **Instance 1:** $5/شهر (رسائل غير محدودة)
- **Instance إضافي:** $5/شهر لكل instance

### مثال:
- **1000 رسالة/شهر:** $5 فقط
- **10,000 رسالة/شهر:** $5 فقط
- **100,000 رسالة/شهر:** $5 فقط

**ROI:** توفير وقت الموظفين يغطي التكلفة عشرات المرات!

---

## 📚 موارد إضافية

- [Ultramsg Documentation](https://docs.ultramsg.com/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Cron Jobs](https://supabase.com/docs/guides/database/extensions/pg_cron)

---

**تاريخ الإنشاء:** 3 نوفمبر 2025  
**الحالة:** ✅ جاهز للتنفيذ  
**الوقت المتوقع:** 30 دقيقة للإعداد الكامل

