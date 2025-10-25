# دليل نظام تتبع القضايا القانونية | Legal Cases Tracking System Guide

## 📋 نظرة عامة | Overview

نظام تتبع القضايا القانونية هو نظام متكامل لإدارة ومتابعة جميع القضايا القانونية للشركة.

---

## 🎯 كيف يعمل النظام | How The System Works

### 1. قاعدة البيانات الرئيسية

**جدول القضايا** (`legal_cases`):
- **معرف القضية**: رقم تلقائي مثل `LC-2025-001`
- **معلومات القضية**: العنوان، النوع، الحالة، الأولوية
- **معلومات العميل**: ربط بجدول العملاء أو إدخال يدوي
- **معلومات المحكمة**: اسم المحكمة، رقم مرجعي، مواعيد الجلسات
- **التكاليف**: أتعاب محاماة، رسوم محكمة، مصاريف أخرى
- **الفريق القانوني**: المحامي الرئيسي والفريق

**جدول الجلسات القضائية** (`court_sessions`):
- تسجيل كل جلسة محكمة
- نتيجة الجلسة
- موعد الجلسة القادمة
- المستندات المرفقة

### 2. أنواع القضايا المدعومة

| النوع | الاستخدام |
|------|----------|
| `civil` - مدني | تحصيل ديون، قضايا مدنية عامة |
| `criminal` - جنائي | قضايا جنائية، سرقة، احتيال |
| `commercial` - تجاري | نزاعات تجارية، عقود |
| `labor` - عمالي | قضايا موظفين |
| `traffic` - مروري | مخالفات مرورية |
| `rental` - إيجار | نزاعات إيجار |

### 3. حالات القضية

- **نشطة** (`active`): القضية في المحكمة
- **مغلقة** (`closed`): صدر حكم نهائي
- **معلقة** (`suspended`): تم تعليق القضية
- **قيد الانتظار** (`on_hold`): في انتظار إجراء

### 4. مستويات الأولوية

- **عاجل** (`urgent`): جلسة خلال 24-48 ساعة
- **عالي** (`high`): جلسة خلال أسبوع
- **متوسط** (`medium`): جلسة خلال شهر
- **منخفض** (`low`): لا توجد جلسة قريبة

---

## 💻 كيفية الاستخدام | How To Use

### 1. إضافة قضية جديدة

```typescript
// استدعاء Hook
import { useCreateLegalCase } from '@/hooks/useLegalCases';

const createCase = useCreateLegalCase();

// إنشاء قضية
await createCase.mutateAsync({
  case_title: "تحصيل ديون من شركة الخليج",
  case_type: "civil",              // مدني
  priority: "high",                 // أولوية عالية
  case_status: "active",            // نشطة
  client_name: "شركة الخليج",
  court_name: "محكمة الكويت الكلية",
  filing_date: "2025-10-01",
  hearing_date: "2025-11-15",
  case_value: 50000,                // قيمة القضية
  legal_fees: 5000,                 // أتعاب المحاماة
  court_fees: 500,                  // رسوم المحكمة
  other_expenses: 200               // مصاريف أخرى
});
```

**النتيجة**:
- يتم توليد رقم قضية تلقائي: `LC-2025-001`
- يحسب إجمالي التكاليف تلقائياً: 5,700 د.ك
- يتم تسجيل نشاط في سجل الأنشطة

### 2. عرض القضايا

```typescript
import { useLegalCases } from '@/hooks/useLegalCases';

// جلب جميع القضايا
const { data: cases } = useLegalCases();

// فلترة القضايا النشطة فقط
const { data: activeCases } = useLegalCases({
  case_status: 'active'
});

// فلترة القضايا المدنية عالية الأولوية
const { data: urgentCivil } = useLegalCases({
  case_status: 'active',
  case_type: 'civil',
  priority: 'high'
});

// البحث في القضايا
const { data: searchResults } = useLegalCases({
  search: 'الخليج'  // يبحث في رقم القضية، العنوان، اسم العميل
});
```

### 3. الإحصائيات

```typescript
import { useLegalCaseStats } from '@/hooks/useLegalCases';

const { data: stats } = useLegalCaseStats();

// النتيجة:
{
  total: 45,              // إجمالي القضايا
  active: 32,             // النشطة
  closed: 10,             // المغلقة
  suspended: 2,           // المعلقة
  highPriority: 12,       // عالية الأولوية
  totalValue: 1250000,    // إجمالي التكاليف
  pendingBilling: 8,      // فواتير معلقة
  overduePayments: 3,     // مدفوعات متأخرة
  byType: {
    civil: 20,
    criminal: 5,
    commercial: 10
  }
}
```

### 4. تحديث قضية

```typescript
import { useUpdateLegalCase } from '@/hooks/useLegalCases';

const updateCase = useUpdateLegalCase();

// تحديث حالة القضية
await updateCase.mutateAsync({
  id: caseId,
  data: {
    case_status: "closed",
    notes: "تم الحكم لصالح الشركة بمبلغ 50,000 د.ك"
  }
});

// تحديث موعد الجلسة
await updateCase.mutateAsync({
  id: caseId,
  data: {
    hearing_date: "2025-12-01",
    notes: "تم تأجيل الجلسة"
  }
});
```

---

## 🔗 التكامل مع الأنظمة الأخرى | System Integration

### 1. نظام العملاء

عند ربط قضية بعميل:
- يؤثر على **تقييم المخاطر** للعميل
- يظهر في **سجل العميل القانوني**
- قد يؤدي لإدراج العميل في **القائمة السوداء** (إذا كانت قضايا متعددة)

```typescript
const case = {
  client_id: "customer-uuid",  // يربط بجدول العملاء
  // ... باقي البيانات
};
```

### 2. النظام المالي

التكاليف تسجل في النظام المالي:
- **أتعاب المحاماة** → حساب مصروفات قانونية
- **رسوم المحكمة** → حساب رسوم رسمية
- **مصاريف أخرى** → حساب مصروفات متنوعة

```typescript
const costs = {
  legal_fees: 5000,        // مصروف قانوني
  court_fees: 500,         // رسوم رسمية
  other_expenses: 200,     // مصاريف متنوعة
  billing_status: "pending" // حالة الفواتير
};
```

### 3. الذكاء الاصطناعي القانوني

يمكن استخدام Legal AI لـ:
- تحليل القضية وتقييم فرص النجاح
- توليد المستندات القانونية (إنذارات، مذكرات)
- البحث في سوابق قانونية
- التوصية بأفضل الإجراءات

---

## 📊 سير العمل النموذجي | Standard Workflow

### مثال: قضية تحصيل ديون

**المرحلة 1 - الإنشاء**:
```typescript
{
  case_number: "LC-2025-015",  // تلقائي
  case_title: "تحصيل إيجارات متأخرة",
  case_type: "civil",
  priority: "high",
  case_status: "active",
  client_name: "شركة النور",
  case_value: 75000,           // المبلغ المطالب به
  filing_date: "2025-10-20"
}
```

**المرحلة 2 - الجلسة الأولى** (بعد 35 يوم):
```typescript
// في جدول court_sessions
{
  session_number: 1,
  session_date: "2025-11-25",
  outcome: "adjourned",        // تأجيل
  next_session_date: "2025-12-20",
  notes: "تأجيل لحضور الطرف الآخر"
}
```

**المرحلة 3 - الجلسة الثانية** (بعد 25 يوم):
```typescript
{
  session_number: 2,
  session_date: "2025-12-20",
  outcome: "judgment_issued",  // صدور حكم
  notes: "الحكم لصالح الشركة بمبلغ 75,000 د.ك"
}
```

**المرحلة 4 - الإغلاق**:
```typescript
// تحديث القضية
{
  case_status: "closed",
  notes: "تم الحكم لصالح الشركة، جاري التنفيذ"
}
```

---

## 🎨 واجهة المستخدم | User Interface

### صفحة التتبع: `/legal/cases-tracking`

**المكونات الرئيسية**:

1. **بطاقات الإحصائيات** (4 بطاقات):
   - إجمالي القضايا
   - قضايا عالية الأولوية
   - إجمالي التكاليف
   - مدفوعات متأخرة

2. **أدوات البحث والفلترة**:
   - حقل بحث نصي
   - فلتر حسب الحالة (نشطة، مغلقة، معلقة)
   - فلتر حسب النوع (مدني، جنائي، تجاري...)

3. **جدول القضايا** يعرض:
   - رقم القضية
   - العنوان
   - النوع (Badge ملون)
   - الحالة (Badge ملون)
   - الأولوية (Badge ملون)
   - العميل
   - التكاليف
   - تاريخ الإنشاء

### الألوان والشارات

**حالة القضية**:
- نشطة → أزرق
- مغلقة → رمادي
- معلقة → أحمر
- قيد الانتظار → رمادي فاتح

**الأولوية**:
- عاجل / عالي → أحمر
- متوسط → أزرق
- منخفض → رمادي

---

## 🔐 الأمان | Security

### Row Level Security (RLS)

كل مستخدم يرى **فقط قضايا شركته**:
```sql
CREATE POLICY "Users can view cases from their company"
  ON legal_cases FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );
```

### الصلاحيات المطلوبة

| الإجراء | الصلاحية |
|---------|----------|
| عرض القضايا | `legal.cases.view` |
| إضافة قضية | `legal.cases.create` |
| تحديث قضية | `legal.cases.update` |
| حذف قضية | `legal.cases.delete` |

---

## 📱 أمثلة عملية | Practical Examples

### مثال 1: البحث عن قضايا عميل محدد

```typescript
const { data: customerCases } = useLegalCases({
  client_id: "customer-uuid"
});

console.log(`العميل لديه ${customerCases.length} قضية`);
```

### مثال 2: القضايا التي لها جلسات هذا الأسبوع

```typescript
const { data: allCases } = useLegalCases({ case_status: 'active' });

const upcomingCases = allCases.filter(c => {
  const hearing = new Date(c.hearing_date);
  const weekFromNow = new Date();
  weekFromNow.setDate(weekFromNow.getDate() + 7);
  return hearing <= weekFromNow;
});

console.log(`${upcomingCases.length} قضية لها جلسات خلال أسبوع`);
```

### مثال 3: تقرير التكاليف الشهرية

```typescript
const { data: stats } = useLegalCaseStats();

const monthlyCosts = {
  legalFees: stats.totalValue * 0.65,      // 65% أتعاب محاماة
  courtFees: stats.totalValue * 0.30,      // 30% رسوم محكمة
  otherExpenses: stats.totalValue * 0.05   // 5% مصاريف أخرى
};
```

---

## 🚀 نصائح مهمة | Important Tips

### ✅ افعل:

1. **سجل القضية فور تقديمها** للمحكمة
2. **حدث موعد الجلسة القادمة** دائماً
3. **سجل نتيجة كل جلسة** في `court_sessions`
4. **استخدم tags** للتصنيف السريع
5. **حدث billing_status** لتتبع الفواتير

### ❌ لا تفعل:

1. لا تترك `hearing_date` فارغ إذا كان هناك جلسة محددة
2. لا تنسى تسجيل التكاليف
3. لا تهمل ربط القضية بالعميل إذا كان موجود في النظام
4. لا تنسى تحديث `case_status` عند إغلاق القضية

---

## 📚 الملفات المصدرية | Source Files

| الملف | الوظيفة |
|------|---------|
| `/hooks/useLegalCases.ts` | Hooks للبيانات والعمليات |
| `/pages/legal/LegalCasesTracking.tsx` | واجهة المستخدم الرئيسية |
| `/supabase/migrations/...legal_system_tables.sql` | هيكل قاعدة البيانات |

---

## ❓ الأسئلة الشائعة | FAQ

**س: كيف يتم توليد رقم القضية؟**  
ج: تلقائياً عبر دالة `generate_legal_case_number()` بصيغة `LC-2025-XXX`

**س: هل يمكن ربط قضية واحدة بعدة عملاء؟**  
ج: لا، قضية واحدة لعميل واحد. لكن يمكن إنشاء عدة قضايا لنفس العميل.

**س: كيف يتم حساب إجمالي التكاليف؟**  
ج: تلقائياً: `legal_fees + court_fees + other_expenses`

**س: ماذا يحدث عند إغلاق قضية؟**  
ج: يتم تحديث `case_status` إلى `closed` ويمكن إضافة ملاحظات نهائية.

---

*آخر تحديث: 2025-10-25*