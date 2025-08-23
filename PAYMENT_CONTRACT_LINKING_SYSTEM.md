# نظام ربط المدفوعات بالعقود المحسن

## نظرة عامة

تم تطوير نظام شامل لربط المدفوعات بالعقود يدعم رفع البيانات من الجداول الخارجية (مثل Excel) وربطها تلقائياً بالعقود الموجودة في النظام. يوفر النظام واجهات متقدمة للمعاينة والتحقق والإدارة.

## الميزات الرئيسية

### 🔗 الربط الذكي للعقود
- **البحث متعدد المعايير**: يدعم البحث برقم الاتفاقية، رقم العقد، ومعلومات العميل
- **نظام الثقة**: تقييم دقة الربط بنسب مئوية (0-100%)
- **الربط التلقائي**: ربط المدفوعات عالية الثقة تلقائياً
- **التحقق الذكي**: فحص شامل للبيانات قبل الربط

### 📊 واجهات متقدمة
- **رفع محسن**: واجهة تفاعلية لرفع ملفات CSV مع معاينة فورية
- **لوحة تحكم شاملة**: عرض إحصائيات وإدارة المدفوعات المربوطة وغير المربوطة
- **نظام التحذيرات**: تنبيهات ذكية للمشاكل المحتملة
- **تقارير تفصيلية**: تحليل شامل لعمليات الربط

### 🛡️ نظام التحقق والأمان
- **التحقق متعدد المستويات**: أساسي، قياسي، وصارم
- **إدارة المخاطر**: تصنيف المخاطر (منخفض، متوسط، عالي، حرج)
- **تتبع العمليات**: تسجيل جميع محاولات الربط
- **صلاحيات المستخدمين**: تحكم دقيق في الوصول

## البنية التقنية

### الملفات الأساسية

#### 1. Backend/Database
```
supabase/migrations/20250115120000_enhance_payments_contract_linking.sql
```
- إضافة حقول جديدة لجدول المدفوعات
- إنشاء جدول تتبع محاولات الربط
- دوال البحث الذكي والإحصائيات
- فهارس محسنة للأداء

#### 2. Hooks/Logic
```
src/hooks/usePaymentsCSVUpload.ts          # رفع وتحليل المدفوعات
src/hooks/usePaymentContractLinking.ts     # إدارة عمليات الربط
src/utils/paymentContractValidation.ts     # نظام التحقق والتحذيرات
```

#### 3. Components/UI
```
src/components/finance/EnhancedPaymentsCSVUpload.tsx    # واجهة الرفع المحسنة
src/components/finance/LinkedPaymentsDashboard.tsx      # لوحة تحكم الربط
```

### الحقول الجديدة في جدول المدفوعات

| الحقل | النوع | الوصف |
|-------|--------|--------|
| `agreement_number` | VARCHAR(100) | رقم الاتفاقية كما يظهر في الوثائق |
| `due_date` | DATE | تاريخ استحقاق الدفعة |
| `original_due_date` | DATE | تاريخ الاستحقاق الأصلي |
| `late_fine_days_overdue` | INTEGER | عدد أيام التأخير |
| `reconciliation_status` | VARCHAR(50) | حالة التسوية |
| `description_type` | VARCHAR(100) | نوع وصف الدفعة |

## كيفية الاستخدام

### 1. رفع المدفوعات من ملف Excel/CSV

```typescript
// استخدام الواجهة المحسنة
<EnhancedPaymentsCSVUpload
  open={showDialog}
  onOpenChange={setShowDialog}
  onUploadComplete={handleComplete}
/>
```

**الحقول المطلوبة في الملف:**
- `payment_date`: تاريخ الدفع
- `amount`: المبلغ
- `agreement_number`: رقم الاتفاقية (مهم للربط)

**الحقول الاختيارية:**
- `contract_number`: رقم العقد
- `due_date`: تاريخ الاستحقاق
- `late_fine_days_overdue`: أيام التأخير
- `description`: وصف الدفعة
- `customer_name`: اسم العميل

### 2. إعدادات الربط

```typescript
const linkingSettings = {
  autoLink: true,           // الربط التلقائي
  minConfidence: 0.8,       // الحد الأدنى للثقة (80%)
  strictMatching: false,    // التطابق الصارم
  searchMethods: {
    byAgreementNumber: true,  // البحث برقم الاتفاقية
    byContractNumber: true,   // البحث برقم العقد
    byCustomerInfo: false     // البحث بمعلومات العميل
  },
  validationLevel: 'standard' // مستوى التحقق
};
```

### 3. استخدام لوحة التحكم

```typescript
// عرض لوحة تحكم الربط
<LinkedPaymentsDashboard />
```

**الميزات المتاحة:**
- عرض إحصائيات الربط
- إدارة المدفوعات المربوطة وغير المربوطة
- الربط التلقائي المتقدم
- البحث والتصفية
- تصدير التقارير

### 4. البحث الذكي عن العقود

```typescript
const { searchPotentialContracts } = usePaymentContractLinking();

const contracts = await searchPotentialContracts({
  agreement_number: "LTO2024177",
  contract_number: "CON-001",
  customer_id: "uuid-here"
});
```

### 5. التحقق من صحة الربط

```typescript
const validation = PaymentContractValidator.generateLinkingReport(
  paymentData,
  contractData,
  linkingAttempt
);

console.log(validation.overallAssessment.riskLevel); // 'low' | 'medium' | 'high' | 'critical'
console.log(validation.linkingQuality.confidence);   // 0.0 - 1.0
```

## مثال عملي: رفع الجدول المرفوع

بناءً على الجدول المرفوع في الطلب، إليك كيفية إعداد الملف:

### تنسيق ملف CSV المطلوب:

```csv
agreement_number,amount,payment_date,due_date,late_fine_days_overdue,description,type,payment_status
LTO2024177,1780,2024-07-01,2024-07-01,0,JULY RENT INCOME,INCOME,completed
LTO2024247,1800,2024-09-01,2024-09-01,4,september INCOME,INCOME,completed
MR202476,2100,2024-05-01,2024-05-01,0,May Rent INCOME,INCOME,completed
```

### خطوات الرفع:

1. **تحضير الملف**: تأكد من وجود الحقول المطلوبة
2. **رفع الملف**: استخدم واجهة الرفع المحسنة
3. **معاينة البيانات**: راجع النتائج والتحذيرات
4. **تأكيد الربط**: اختر المدفوعات للربط
5. **مراجعة النتائج**: تحقق من نجاح العملية

## الدوال المساعدة

### دوال قاعدة البيانات

```sql
-- البحث الذكي عن العقود
SELECT * FROM find_contract_by_identifiers(
  'company-uuid',
  'LTO2024177',    -- رقم الاتفاقية
  'CON-001',       -- رقم العقد
  'customer-uuid'  -- معرف العميل
);

-- إحصائيات الربط
SELECT * FROM get_payment_linking_stats('company-uuid');
```

### دوال JavaScript

```typescript
// تحليل بيانات الدفعة
const analysis = await analyzePaymentData(csvData);

// البحث عن عقود محتملة
const contracts = await searchPotentialContracts(paymentData);

// ربط دفعة بعقد
await linkPaymentToContract.mutateAsync({
  paymentId: 'payment-uuid',
  contractId: 'contract-uuid',
  linkingMethod: 'agreement_number',
  confidence: 0.95
});
```

## معالجة الأخطاء الشائعة

### 1. عدم العثور على العقد
```
السبب: رقم الاتفاقية غير موجود أو غير صحيح
الحل: تحقق من صحة رقم الاتفاقية أو أنشئ العقد أولاً
```

### 2. تضارب في المبالغ
```
السبب: المبلغ المدفوع أكبر من رصيد العقد
الحل: راجع رصيد العقد أو صحح مبلغ الدفعة
```

### 3. تضارب في التواريخ
```
السبب: تاريخ الدفعة بعد انتهاء العقد
الحل: تحقق من تواريخ العقد أو الدفعة
```

### 4. مستوى ثقة منخفض
```
السبب: عدم تطابق دقيق في البيانات
الحل: راجع البيانات يدوياً أو حسن معايير البحث
```

## الأداء والتحسين

### الفهارس المضافة
- `idx_payments_agreement_number`: للبحث برقم الاتفاقية
- `idx_payments_due_date`: للبحث بتاريخ الاستحقاق
- `idx_payments_reconciliation_status`: لتصفية حالة التسوية

### نصائح الأداء
- استخدم الربط التلقائي للمدفوعات عالية الثقة
- راجع المدفوعات منخفضة الثقة يدوياً
- حدث بيانات العقود بانتظام
- استخدم البحث المتقدم للحالات المعقدة

## الأمان والصلاحيات

### صلاحيات الوصول
- **المشاهدة**: جميع المستخدمين
- **الربط**: المحاسبين والمدراء
- **الإدارة**: مدراء الشركة والمشرفين العامين

### تتبع العمليات
جميع عمليات الربط مسجلة في جدول `payment_contract_linking_attempts` مع:
- معرف المستخدم
- تاريخ ووقت العملية
- طريقة الربط المستخدمة
- مستوى الثقة
- العقود المحتملة

## التطوير المستقبلي

### ميزات مخططة
- [ ] ربط متعدد العقود للدفعة الواحدة
- [ ] تعلم آلي لتحسين دقة الربط
- [ ] تكامل مع أنظمة محاسبية خارجية
- [ ] تقارير تحليلية متقدمة
- [ ] إشعارات تلقائية للمدفوعات المتأخرة

### تحسينات الأداء
- [ ] تخزين مؤقت للبحث المتكرر
- [ ] معالجة متوازية للملفات الكبيرة
- [ ] ضغط البيانات التاريخية
- [ ] فهرسة متقدمة للنصوص

---

## الدعم والمساعدة

للحصول على المساعدة أو الإبلاغ عن مشاكل:
1. راجع هذا الدليل أولاً
2. تحقق من سجلات النظام
3. اتصل بفريق الدعم التقني

**تاريخ آخر تحديث:** 15 يناير 2025  
**الإصدار:** 1.0.0
