# 📋 تحليل Workflow إرسال تنبيهات واتساب

## 🔍 الوضع الحالي للنظام

### ✅ ما يعمل الآن:

#### 1. **واجهة المستخدم (Frontend)**
- ✅ زر "إرسال تنبيهات" في صفحة العقود
- ✅ Dialog لاختيار العقود ونوع التذكير
- ✅ Hook `useSendManualReminders` يعمل بشكل صحيح

#### 2. **قاعدة البيانات (Database)**
- ✅ جدول `reminder_schedules` موجود
- ✅ جدول `reminder_history` موجود
- ✅ RLS Policies موجودة
- ✅ Function `check_payment_reminders()` موجودة

#### 3. **Backend Hook (`useSendManualReminders.ts`)**
```typescript
// ما يحدث عند الضغط على "إرسال":

1. التحقق من المستخدم والشركة
2. لكل عقد:
   a. البحث عن فاتورة غير مدفوعة (unpaid)
   b. الحصول على بيانات العميل
   c. إنشاء رسالة بناءً على نوع التذكير
   d. إدراج سجل في reminder_schedules مع status='queued'
   e. تسجيل في reminder_history
3. إرجاع عدد النجاح/الفشل
```

---

## ❌ ما لا يعمل (ناقص):

### **Service لإرسال الرسائل فعلياً عبر WhatsApp**

النظام الحالي **يُسجل** التنبيهات فقط في قاعدة البيانات، لكن **لا يرسلها فعلياً** عبر WhatsApp!

---

## 🔄 Workflow الكامل المطلوب

### **المرحلة 1: المستخدم يضغط "إرسال"**

```
┌─────────────────────────────────────────┐
│  المستخدم يضغط "إرسال تنبيهات"          │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  SendRemindersDialog.handleSend()       │
│  - يتحقق من العقود المحددة               │
│  - يستدعي sendReminders.mutateAsync()   │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  useSendManualReminders Hook            │
│  - لكل عقد:                              │
│    * يبحث عن فاتورة غير مدفوعة           │
│    * يحصل على بيانات العميل             │
│    * ينشئ رسالة                          │
│    * يُسجل في reminder_schedules        │
│      status='queued'                     │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  قاعدة البيانات: reminder_schedules     │
│  - id, invoice_id, customer_id          │
│  - phone_number, message_template       │
│  - status='queued' ✅                     │
│  - scheduled_date, scheduled_time        │
└─────────────────────────────────────────┘
```

### **المرحلة 2: Service يقرأ من قاعدة البيانات** ⚠️ **ناقص حالياً**

```
┌─────────────────────────────────────────┐
│  Node.js WhatsApp Service                │
│  (يجب أن يعمل بشكل مستمر)                │
│                                          │
│  while (true) {                          │
│    1. يقرأ reminder_schedules            │
│       WHERE status='queued'              │
│                                          │
│    2. يرسل عبر WhatsApp Web                 │
│       - يفتح WhatsApp Web API           │
│       - يرسل الرسالة للرقم               │
│                                          │
│    3. يحدث status='sent'                 │
│       - يكتب sent_at timestamp          │
│       - يسجل في reminder_history         │
│  }                                       │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  WhatsApp Web (Puppeteer/WhatsApp API)  │
│  - يرسل الرسالة فعلياً للعميل            │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  العميل يستلم الرسالة على واتساب        │
└─────────────────────────────────────────┘
```

---

## 📝 تفاصيل الكود الحالي

### **Hook: `useSendManualReminders.ts`**

```typescript
// السطور 48-144: ما يحدث فعلياً

for (const contract of contracts) {
  // 1. البحث عن فاتورة غير مدفوعة
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, invoice_number, total_amount, due_date')
    .eq('contract_id', contract.id)
    .eq('payment_status', 'unpaid')
    .limit(1)
    .single();

  // 2. الحصول على بيانات العميل
  const { data: customer } = await supabase
    .from('customers')
    .select('id, phone, first_name_ar')
    .eq('id', invoice.customer_id)
    .single();

  // 3. إنشاء رسالة بناءً على نوع التذكير
  let messageTemplate = customMessage || getDefaultMessage(reminderType);

  // 4. إدراج في reminder_schedules ✅
  const { data: reminder } = await supabase
    .from('reminder_schedules')
    .insert({
      company_id: profile.company_id,
      invoice_id: invoice.id,
      customer_id: invoice.customer_id,
      reminder_type: reminderType,
      scheduled_date: new Date().toISOString().split('T')[0],
      scheduled_time: new Date().toTimeString().split(' ')[0],
      phone_number: customer.phone,
      customer_name: customer.first_name_ar,
      message_template: messageTemplate,
      status: 'queued', // ✅ هنا: status='queued'
      sent_by: user.id,
    })
    .select()
    .single();

  // ❌ **لا يوجد كود لإرسال فعلي عبر WhatsApp!**
}
```

---

## ⚠️ المشكلة الرئيسية

### **النظام الحالي:**
- ✅ يُسجل التنبيهات في قاعدة البيانات
- ✅ يضع status='queued'
- ❌ **لا يرسل الرسائل فعلياً عبر WhatsApp**

### **ما يجب أن يكون موجوداً:**

#### **1. Node.js WhatsApp Service**

```javascript
// services/whatsapp-reminder-service.js (ناقص!)
const { createClient } = require('@supabase/supabase-js');
const puppeteer = require('puppeteer-core');

async function processQueuedReminders() {
  // 1. الاتصال بقاعدة البيانات
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  
  // 2. قراءة التنبيهات في قائمة الانتظار
  const { data: reminders } = await supabase
    .from('reminder_schedules')
    .select('*')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(50);

  // 3. الاتصال بـ WhatsApp Web
  const browser = await puppeteer.launch({
    headless: true,
    userDataDir: './whatsapp-session'
  });
  
  const page = await browser.newPage();
  await page.goto('https://web.whatsapp.com');
  
  // 4. إرسال كل رسالة
  for (const reminder of reminders) {
    try {
      // تنسيق الرقم
      const phone = formatPhoneNumber(reminder.phone_number);
      const url = `https://web.whatsapp.com/send?phone=${phone}`;
      
      await page.goto(url);
      await page.waitForSelector('textarea[data-testid="conversation-compose-box-input"]');
      await page.type('textarea[data-testid="conversation-compose-box-input"]', reminder.message_template);
      await page.keyboard.press('Enter');
      
      // 5. تحديث status إلى 'sent'
      await supabase
        .from('reminder_schedules')
        .update({ 
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', reminder.id);
        
    } catch (error) {
      // تحديث status إلى 'failed'
      await supabase
        .from('reminder_schedules')
        .update({ 
          status: 'failed',
          last_error: error.message
        })
        .eq('id', reminder.id);
    }
  }
  
  await browser.close();
}

// تشغيل كل دقيقة
setInterval(processQueuedReminders, 60000);
```

#### **2. Cron Job (اختياري)**

```sql
-- تشغيل service تلقائياً كل ساعة
SELECT cron.schedule(
  'process-whatsapp-reminders',
  '*/60 * * * *', -- كل 60 دقيقة
  $$SELECT pg_notify('process_whatsapp_reminders', '')$$
);
```

---

## 🎯 الحلول المقترحة

### **الحل 1: إنشاء WhatsApp Service (مستحسن)**

```bash
# 1. إنشاء مجلد services
mkdir services
cd services

# 2. تثبيت المكتبات
npm init -y
npm install @supabase/supabase-js puppeteer-core dotenv

# 3. إنشاء ملف .env
echo "SUPABASE_URL=your_url" > .env
echo "SUPABASE_KEY=your_key" >> .env

# 4. إنشاء whatsapp-reminder-service.js
# (الكود أعلاه)

# 5. تشغيل Service
node whatsapp-reminder-service.js
# أو باستخدام PM2:
pm2 start whatsapp-reminder-service.js --name whatsapp-reminders
```

### **الحل 2: استخدام WhatsApp Business API (بديل)**

بدلاً من Puppeteer، يمكن استخدام WhatsApp Business API الرسمي:
- ✅ أكثر استقراراً
- ✅ لا يحتاج QR code scanning
- ❌ يتطلب تسجيل حساب WhatsApp Business
- ❌ قد يكون مكلفاً

### **الحل 3: Integration مع خدمة خارجية**

استخدام خدمات مثل:
- Twilio WhatsApp API
- MessageBird
- ChatAPI

---

## 📊 ملخص الوضع الحالي

| المرحلة | الحالة | الوصف |
|---------|--------|-------|
| **UI (واجهة المستخدم)** | ✅ يعمل | Dialog وزر الإرسال يعملان |
| **Frontend Hook** | ✅ يعمل | `useSendManualReminders` يعمل |
| **قاعدة البيانات** | ✅ يعمل | Tables وFunctions موجودة |
| **تسجيل التنبيهات** | ✅ يعمل | يتم إدراج في `reminder_schedules` |
| **إرسال فعلي** | ❌ **ناقص** | **لا يوجد service لإرسال الرسائل** |
| **WhatsApp Integration** | ❌ **ناقص** | **لا يوجد اتصال بواتساب** |

---

## 🚀 الخطوات التالية المطلوبة

1. **إنشاء WhatsApp Service**
   - [ ] إنشاء ملف `services/whatsapp-reminder-service.js`
   - [ ] تثبيت المكتبات المطلوبة
   - [ ] إعداد Puppeteer مع WhatsApp Web
   - [ ] ربط Service مع قاعدة البيانات

2. **اختبار الإرسال**
   - [ ] اختبار إرسال رسالة واحدة
   - [ ] اختبار إرسال متعدد
   - [ ] معالجة الأخطاء

3. **النشر**
   - [ ] تشغيل Service على server
   - [ ] إعداد PM2 أو systemd
   - [ ] إعداد monitoring

4. **التوثيق**
   - [ ] توثيق إعداد Service
   - [ ] توثيق troubleshooting
   - [ ] توثيق configuration

---

## 💡 ملاحظات مهمة

1. **WhatsApp Web محدودية:**
   - قد يتم حظر الحساب إذا تم إرسال رسائل كثيرة
   - يحتاج QR code scanning أول مرة
   - قد ينقطع الاتصال أحياناً

2. **WhatsApp Business API:**
   - أكثر استقراراً لكن مكلف
   - يحتاج تطبيق رسمي

3. **البدائل:**
   - SMS API
   - Email reminders
   - Push notifications

---

**تاريخ التحليل:** 2 نوفمبر 2025  
**الحالة:** ⚠️ النظام غير مكتمل - يحتاج WhatsApp Service

