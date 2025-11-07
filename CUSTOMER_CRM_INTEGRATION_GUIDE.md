# دليل نظام إدارة علاقات العملاء (CRM)

## 📋 نظرة عامة

تم دمج نظام CRM شامل مع FleetifyApp لتتبع جميع التواصلات مع العملاء وإدارة المتابعات بشكل احترافي.

---

## 🎯 المميزات الرئيسية

### 1. **إحصائيات مباشرة**
- عدد العملاء النشطين
- عدد المكالمات اليوم
- المتابعات المعلقة
- العمليات المكتملة هذا الشهر

### 2. **إدارة العملاء**
- عرض جميع العملاء ذوي العقود النشطة
- معلومات تفصيلية لكل عميل:
  - الاسم ورقم الجوال
  - رقم العقد وتاريخ الانتهاء
  - آخر موعد اتصال
  - حالة العقد (نشط/قريب الانتهاء/منتهي)

### 3. **سجل التواصل**
- تسجيل جميع أنواع التواصل:
  - 📞 **مكالمات هاتفية** (مع تسجيل المدة)
  - 📱 **رسائل SMS**
  - 👥 **اجتماعات**
  - 📝 **ملاحظات عامة**

### 4. **إدارة المتابعات**
- جدولة متابعات مستقبلية
- تتبع حالة المتابعات (معلقة/مكتملة/ملغية)
- تنبيهات تلقائية للمتابعات المعلقة
- تحديد الإجراءات المطلوبة:
  - إعداد عرض سعر
  - تجهيز عقد جديد
  - متابعة دفعة
  - جدولة صيانة
  - تجديد العقد

### 5. **تنبيهات ذكية**
- تحذيرات للعملاء الذين يحتاجون متابعة عاجلة
- إشعارات للعقود القريبة من الانتهاء
- مؤشرات بصرية للحالات المختلفة

---

## 📁 بنية الملفات

```
src/
├── types/
│   └── crm.ts                          # نماذج البيانات
├── pages/
│   └── customers/
│       └── CustomerCRM.tsx              # الصفحة الرئيسية
├── hooks/
│   └── useCustomerCRM.ts                # Hooks للبيانات
├── navigation/
│   └── navigationConfig.ts              # التنقل (محدث)
└── App.tsx                              # Routes (محدث)

supabase/
└── migrations/
    └── create_customer_communications_table.sql  # Migration للجدول
```

---

## 🗄️ بنية قاعدة البيانات

### جدول `customer_communications`

```sql
- id: UUID (Primary Key)
- customer_id: UUID (Foreign Key → customers)
- company_id: UUID (Foreign Key → companies)
- communication_type: TEXT ('phone', 'message', 'meeting', 'note')
- communication_date: DATE
- communication_time: TIME
- duration_minutes: INTEGER (للمكالمات)
- employee_id: UUID (Foreign Key → auth.users)
- notes: TEXT
- action_required: TEXT
- action_description: TEXT
- follow_up_scheduled: BOOLEAN
- follow_up_date: DATE
- follow_up_time: TIME
- follow_up_status: TEXT ('pending', 'completed', 'cancelled')
- attachments: JSONB
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

---

## 🚀 كيفية الاستخدام

### 1. **تطبيق Migration قاعدة البيانات**

```bash
# من Supabase Dashboard SQL Editor
supabase/migrations/create_customer_communications_table.sql
```

أو استخدم:
```bash
supabase db push
```

### 2. **الوصول للصفحة**

بعد تشغيل النظام:
1. سجل الدخول للنظام
2. من السايد بار → **إدارة العملاء**
3. اختر **إدارة العلاقات (CRM)**

المسار المباشر:
```
/customers/crm
```

### 3. **إضافة متابعة جديدة**

1. اضغط على زر **"+ متابعة جديدة"** من أعلى الصفحة
   أو
2. اضغط على **"إضافة ملاحظة"** من بطاقة العميل

3. املأ النموذج:
   - اختر نوع التواصل
   - حدد التاريخ والوقت
   - اكتب الملاحظات التفصيلية
   - (اختياري) حدد الإجراء المطلوب
   - (اختياري) جدول متابعة قادمة

4. اضغط **"حفظ المتابعة"**

### 4. **عرض سجل التواصل**

1. من بطاقة العميل، اضغط **"عرض السجل"**
2. سيظهر Timeline بجميع المتابعات السابقة
3. يمكنك تعديل أو حذف أي متابعة

---

## 🎨 التصميم والواجهة

### نظام الألوان

- **الأساسي (Primary):** أخضر احترافي `#22C55E` - للنجاح والعمليات الإيجابية
- **التحذير (Warning):** برتقالي `#F59E0B` - للمتابعات المعلقة
- **الخطر (Danger):** أحمر `#EF4444` - للحالات العاجلة
- **المعلومات (Info):** أزرق `#3B82F6` - للمعلومات العامة

### الحركات والتأثيرات

- تحميل الصفحة: `fade-in 500ms`
- البطاقات: `slide-in-from-bottom` مع `stagger 50ms`
- Hover: `shadow-lg transition-all 300ms`
- Timeline: `slide-in-from-top 300ms`

---

## 🔧 Hooks المتاحة

### `useCRMStats(companyId)`
جلب إحصائيات CRM الشاملة

```typescript
const { data: stats, isLoading } = useCRMStats(selectedCompanyId);
// Returns: CRMStats
```

### `useCRMCustomers(companyId)`
جلب قائمة العملاء مع معلومات CRM

```typescript
const { data: customers, isLoading } = useCRMCustomers(selectedCompanyId);
// Returns: CRMCustomer[]
```

### `useCustomerCommunications(customerId, companyId)`
جلب سجل التواصل لعميل محدد

```typescript
const { data: communications } = useCustomerCommunications(customerId, companyId);
// Returns: CustomerCommunication[]
```

### `useAddCommunication(companyId)`
إضافة متابعة جديدة

```typescript
const addComm = useAddCommunication(companyId);
await addComm.mutateAsync(input);
```

### `useUpdateCommunicationStatus(companyId)`
تحديث حالة متابعة

```typescript
const updateStatus = useUpdateCommunicationStatus(companyId);
await updateStatus.mutateAsync({ communicationId, status });
```

### `useDeleteCommunication(companyId)`
حذف متابعة

```typescript
const deleteCom = useDeleteCommunication(companyId);
await deleteCom.mutateAsync(communicationId);
```

---

## 🔒 الأمان والصلاحيات

### Row Level Security (RLS)

تم تطبيق سياسات RLS التالية:

1. **SELECT:** المستخدمون يمكنهم رؤية متابعات الشركة التي ينتمون إليها فقط
2. **INSERT:** المستخدمون يمكنهم إضافة متابعات لشركتهم فقط
3. **UPDATE:** المستخدمون يمكنهم تحديث متابعاتهم الخاصة فقط
4. **DELETE:** المستخدمون يمكنهم حذف متابعاتهم الخاصة أو (المديرون/المالكون)

---

## 📊 الفلاتر المتاحة

### 1. البحث النصي
- البحث بالاسم
- البحث برقم الجوال
- البحث برقم العقد

### 2. حالة العقد
- الكل
- عقود نشطة
- قريبة من الانتهاء
- منتهية

### 3. آخر موعد اتصال
- اليوم
- آخر 7 أيام
- آخر 30 يوم
- أكثر من شهر
- الكل

---

## 🚨 التنبيهات الذكية

### تنبيهات تلقائية للعملاء الذين:
1. ✅ العقد ينتهي خلال 10 أيام أو أقل
2. ⚠️ لم يتم الاتصال بهم منذ أسبوع
3. 🔴 العقد منتهي ولم يتم تجديده

---

## 🎯 خطط التطوير المستقبلية

### المرحلة الثانية
- [ ] تقارير CRM تفصيلية
- [ ] تصدير سجل التواصل إلى Excel/PDF
- [ ] إرسال SMS تلقائي من النظام
- [ ] تسجيل المكالمات (اختياري)
- [ ] تكامل مع WhatsApp Business API
- [ ] لوحة تحكم CRM مستقلة

### المرحلة الثالثة
- [ ] AI لاقتراح أفضل أوقات الاتصال
- [ ] تحليل سلوك العملاء
- [ ] نظام النقاط والمكافآت
- [ ] تكامل مع Email Marketing

---

## 📝 ملاحظات مهمة

1. ✅ النظام متكامل بالكامل مع `useUnifiedCompanyAccess` للتعامل مع شركات متعددة
2. ✅ جميع البيانات محمية بـ RLS
3. ✅ التصميم متجاوب يعمل على جميع الأجهزة
4. ✅ يدعم RTL (من اليمين لليسار)
5. ✅ استخدام React Query للتخزين المؤقت وتحسين الأداء

---

## 🐛 استكشاف الأخطاء

### المشكلة: لا تظهر البيانات
**الحل:**
1. تأكد من تطبيق Migration قاعدة البيانات
2. تحقق من اختيار الشركة الصحيحة
3. تأكد من وجود عقود نشطة

### المشكلة: خطأ في RLS
**الحل:**
1. تحقق من أن المستخدم موجود في `company_users`
2. تحقق من صلاحيات المستخدم
3. راجع سياسات RLS في Supabase Dashboard

### المشكلة: لا يمكن حفظ المتابعة
**الحل:**
1. تحقق من ملء جميع الحقول المطلوبة
2. تحقق من صلاحيات الإضافة
3. راجع Console للأخطاء

---

## 👨‍💻 المطور

تم تطوير هذا النظام بواسطة **Cursor AI + Claude Sonnet 4.5**

التاريخ: **نوفمبر 2025**

الإصدار: **1.0.0**

---

## 📞 الدعم

للمساعدة أو الاستفسارات:
- راجع التوثيق الكامل في المشروع
- تحقق من ملف `src/types/crm.ts` للـ Type Definitions
- راجع `src/hooks/useCustomerCRM.ts` لأمثلة الاستخدام

---

**🎉 نظام CRM جاهز للاستخدام!**



