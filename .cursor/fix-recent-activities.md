# إصلاح مشكلة عدم ظهور النشاطات الأخيرة

## 📋 المشكلة

قسم "النشاطات الأخيرة" في الصفحة الرئيسية لا يعرض أي بيانات.

## 🔍 التشخيص

تم تحديد الأسباب التالية:

1. **جدول `system_logs` موجود لكن بدون سياسات RLS** - مما يمنع المستخدمين من قراءة البيانات
2. **الجدول فارغ** - لا توجد بيانات لعرضها
3. **عدم وجود آلية لتسجيل النشاطات** تلقائياً في النظام

## ✅ الحل المطبق

### 1. إنشاء Migration للجدول والسياسات

تم إنشاء ملفين migration:

#### `20250110235900_create_system_logs_table.sql`
- إنشاء جدول `system_logs` إذا لم يكن موجوداً
- إضافة جميع الحقول المطلوبة (company_id, user_id, level, category, action, message, etc.)
- إنشاء الفهارس لتحسين الأداء

#### `20250111000000_fix_system_logs_rls_policies.sql`
- تفعيل RLS على الجدول
- إضافة سياسة للقراءة: السماح للمستخدمين برؤية سجلات شركتهم فقط
- إضافة سياسة للإدراج: السماح للنظام بإدراج السجلات
- منع التحديث والحذف للحفاظ على سلامة السجلات
- دالة مساعدة `create_sample_system_logs()` لإنشاء بيانات تجريبية

### 2. سكريبت لملء البيانات التجريبية

**ملف:** `src/scripts/populateSystemLogs.ts`

يوفر ثلاث دوال رئيسية:
- `populateSystemLogs(companyId)` - ملء البيانات التجريبية
- `clearSystemLogs(companyId)` - حذف جميع البيانات
- `checkSystemLogsCount(companyId)` - التحقق من عدد السجلات

البيانات التجريبية تشمل:
- 📄 نشاطات العقود (إنشاء، تحديث، تنبيهات انتهاء)
- 👥 نشاطات العملاء (تسجيل، تحديث)
- 🚗 نشاطات المركبات (إضافة، تحديث، تنبيهات صيانة)
- 💰 نشاطات مالية (دفعات، تحذيرات تأخير)
- 👔 نشاطات الموارد البشرية (إضافة موظفين)
- ⚙️ نشاطات النظام (تسجيل دخول، تصدير، نسخ احتياطي)

### 3. مكون المصحح للمطورين

**ملف:** `src/components/dashboard/SystemLogsDebugger.tsx`

مكون تفاعلي يظهر في الزاوية السفلية اليسرى (في بيئة التطوير فقط) يوفر:

**الميزات:**
- ✅ فحص عدد النشاطات الموجودة
- ✅ ملء بيانات تجريبية بضغطة زر
- ✅ حذف جميع النشاطات
- ✅ عرض معلومات الحالة (company_id, عدد السجلات)
- ✅ إعادة تحميل تلقائية بعد ملء البيانات

**كيفية الاستخدام:**
1. افتح الصفحة الرئيسية في بيئة التطوير
2. ستجد نقطة صغيرة في الزاوية السفلية اليسرى
3. اضغط عليها لفتح المصحح
4. اضغط "فحص العدد" للتحقق من البيانات
5. اضغط "ملء البيانات" لإنشاء نشاطات تجريبية
6. سيتم إعادة تحميل الصفحة تلقائياً

### 4. تكامل مع لوحات التحكم

تم إضافة المكون إلى:
- ✅ `CarRentalDashboard.tsx`
- ✅ `RealEstateDashboard.tsx`
- ✅ `RetailDashboard.tsx`

## 🚀 خطوات التطبيق

### 1. تطبيق الـ Migrations

قم بتشغيل الأوامر التالية في مجلد المشروع:

```bash
# إذا كنت تستخدم Supabase CLI
supabase db reset

# أو تطبيق migrations يدوياً
supabase migration up
```

أو من خلال Supabase Dashboard:
1. افتح SQL Editor
2. نسخ محتوى الملفين من مجلد `supabase/migrations/`
3. قم بتشغيلهما بالترتيب

### 2. تشغيل المشروع

```bash
npm run dev
# أو
yarn dev
# أو
pnpm dev
```

### 3. ملء البيانات التجريبية

#### الطريقة الأولى: استخدام المصحح (الأسهل)

1. افتح الصفحة الرئيسية
2. ابحث عن النقطة الصغيرة في الزاوية السفلية اليسرى
3. اضغط عليها لفتح المصحح
4. اضغط "ملء البيانات"
5. انتظر إعادة التحميل التلقائي

#### الطريقة الثانية: استخدام Console المتصفح

افتح Console المتصفح (F12) واكتب:

```javascript
// احصل على معرف شركتك من localStorage أو من الكود
const companyId = 'your-company-uuid-here';

// ملء البيانات
populateSystemLogs(companyId).then(() => {
  console.log('✅ تم ملء البيانات بنجاح');
  window.location.reload();
});

// أو التحقق من العدد أولاً
checkSystemLogsCount(companyId);
```

#### الطريقة الثالثة: من SQL Editor في Supabase

```sql
-- استبدل 'your-company-uuid' بمعرف شركتك الفعلي
SELECT create_sample_system_logs('your-company-uuid');

-- للتحقق من البيانات
SELECT COUNT(*) FROM system_logs WHERE company_id = 'your-company-uuid';

-- لعرض البيانات
SELECT * FROM system_logs 
WHERE company_id = 'your-company-uuid' 
ORDER BY created_at DESC 
LIMIT 10;
```

## 🔧 الصيانة المستقبلية

### تسجيل النشاطات تلقائياً

لتسجيل النشاطات تلقائياً في المستقبل، استخدم الـ hook الموجود:

```typescript
import { useSystemLogger } from '@/hooks/useSystemLogger';

function MyComponent() {
  const { logAction } = useSystemLogger();

  const handleCreateContract = async () => {
    // ... منطق إنشاء العقد
    
    // تسجيل النشاط
    await logAction({
      level: 'info',
      category: 'contracts',
      action: 'create',
      message: 'تم إنشاء عقد جديد #2025-001',
      resourceType: 'contract',
      resourceId: contractId,
      metadata: { contractNumber: '2025-001' }
    });
  };
}
```

### إنشاء Triggers لتسجيل تلقائي

يمكنك إنشاء Database Triggers لتسجيل العمليات تلقائياً:

```sql
-- مثال: تسجيل إنشاء عقد جديد تلقائياً
CREATE OR REPLACE FUNCTION log_contract_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO system_logs (
    company_id,
    user_id,
    level,
    category,
    action,
    resource_type,
    resource_id,
    message
  ) VALUES (
    NEW.company_id,
    auth.uid(),
    'info',
    'contracts',
    'create',
    'contract',
    NEW.id,
    'تم إنشاء عقد جديد #' || NEW.contract_number
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_contract_created
  AFTER INSERT ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION log_contract_creation();
```

## 📊 التحقق من النجاح

بعد تطبيق الحل، يجب أن ترى:

1. ✅ قسم "النشاطات الأخيرة" يعرض بيانات
2. ✅ النشاطات مرتبة حسب الوقت (الأحدث أولاً)
3. ✅ كل نشاط يحتوي على:
   - أيقونة ملونة تمثل نوع النشاط
   - عنوان النشاط
   - وصف تفصيلي
   - الوقت النسبي (منذ X دقيقة/ساعة/يوم)
4. ✅ تصفية النشاطات حسب النوع (العقود، العملاء، المركبات، إلخ)
5. ✅ إمكانية تحديث القائمة

## 🐛 استكشاف الأخطاء

### المشكلة: لا تزال النشاطات لا تظهر

**الحلول:**
1. تحقق من تطبيق الـ migrations بنجاح
2. تحقق من وجود `company_id` صحيح
3. افتح Console المتصفح وابحث عن أخطاء
4. تحقق من سياسات RLS في Supabase Dashboard

### المشكلة: خطأ في الأذونات (RLS Policy)

```sql
-- تحقق من السياسات الموجودة
SELECT * FROM pg_policies WHERE tablename = 'system_logs';

-- إعادة تطبيق السياسات
DROP POLICY IF EXISTS "Users can view their company system logs" ON system_logs;
-- ... ثم أعد تشغيل migration السياسات
```

### المشكلة: البيانات لا تظهر للمستخدمين

تحقق من:
```sql
-- هل المستخدم لديه company_id؟
SELECT user_id, company_id FROM profiles WHERE user_id = auth.uid();

-- هل توجد سجلات لهذه الشركة؟
SELECT COUNT(*) FROM system_logs WHERE company_id = 'your-company-id';
```

## 📝 ملاحظات مهمة

1. المكون المصحح (`SystemLogsDebugger`) يظهر **فقط في بيئة التطوير**
2. البيانات التجريبية يمكن حذفها في أي وقت
3. في الإنتاج، يجب الاعتماد على تسجيل النشاطات الحقيقية
4. الـ migration آمن ويمكن تشغيله عدة مرات (يستخدم `IF NOT EXISTS`)

## 🎯 الخطوات التالية

1. ✅ **تطبيق Migrations** - أولوية عالية
2. ✅ **اختبار المصحح** - تأكد من عمله
3. 🔄 **إضافة تسجيل تلقائي** - في جميع العمليات الرئيسية
4. 🔄 **إنشاء Triggers** - للعمليات الشائعة
5. 🔄 **تحسين الرسائل** - جعلها أكثر وضوحاً ومفيدة

## 📞 الدعم

إذا واجهت أي مشاكل:
1. تحقق من Console المتصفح للأخطاء
2. استخدم المصحح لفحص الحالة
3. راجع هذا الملف للحلول

---

**تاريخ الإنشاء:** 2025-01-11  
**الحالة:** ✅ جاهز للتطبيق  
**المطور:** Cursor AI Assistant





