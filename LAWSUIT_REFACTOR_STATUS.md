# حالة إعادة هيكلة صفحة تجهيز الدعوى
# Lawsuit Preparation Refactor Status

## ✅ ما تم إنجازه | Completed

### 1. بنية المجلدات | Folder Structure
```
src/pages/legal/LawsuitPreparation/
├── components/
│   ├── Header/
│   │   ├── CaseSummary.tsx          ✅ ملخص القضية
│   │   ├── QuickStats.tsx           ✅ إحصائيات سريعة
│   │   └── index.ts                 ✅
│   ├── DocumentList/
│   │   ├── MandatoryDocs.tsx        ✅ المستندات الإلزامية
│   │   ├── OptionalDocs.tsx         ✅ المستندات الاختيارية
│   │   ├── DocumentItem.tsx         ✅ عنصر المستند
│   │   └── index.ts                 ✅
│   ├── Actions/
│   │   ├── ActionBar.tsx            ✅ شريط الإجراءات
│   │   └── index.ts                 ✅
├── hooks/                           📁 (جاهز للهوكات الإضافية)
├── store/
│   ├── types.ts                     ✅ أنواع البيانات
│   ├── reducer.ts                   ✅ المعالج
│   ├── LawsuitPreparationContext.tsx ✅ سياق React
│   └── index.ts                     ✅ تصديرات
├── utils/                           📁 (جاهز للأدوات)
├── __tests__/                       📁 (جاهز للاختبارات)
└── index.tsx                        ✅ الملف الرئيسي
```

### 2. إدارة الحالة | State Management

#### Types (`types.ts`)
- ✅ `Customer` - واجهة العميل
- ✅ `Vehicle` - واجهة المركبة
- ✅ `Contract` - واجهة العقد
- ✅ `OverdueInvoice` - واجهة الفاتورة المتأخرة
- ✅ `TrafficViolation` - واجهة المخالفة المرورية
- ✅ `CompanyLegalDocument` - واجهة مستند الشركة
- ✅ `FinancialCalculations` - حسابات مالية
- ✅ `TaqadiData` - بيانات تقاضي
- ✅ `DocumentState` - حالة المستند
- ✅ `DocumentsState` - حالة جميع المستندات
- ✅ `UIState` - حالة واجهة المستخدم
- ✅ `LawsuitPreparationState` - الحالة الرئيسية
- ✅ `LawsuitPreparationAction` - أنواع الأحداث

#### Reducer (`reducer.ts`)
- ✅ `createInitialState()` - إنشاء الحالة الأولية
- ✅ `calculateProgress()` - حساب التقدم
- ✅ معالج الأحداث الكامل مع 25+ نوع action

#### Context (`LawsuitPreparationContext.tsx`)
- ✅ Provider component مع جميع البيانات
- ✅ Data fetching (contract, invoices, violations, company docs)
- ✅ Calculations effect (الحسابات التلقائية)
- ✅ Taqadi data generation (توليد بيانات تقاضي)
- ✅ جميع الأحداث (actions)

### 3. المكونات | Components

#### CaseSummary
- عرض عنوان القضية
- عرض اسم العميل ورقم العقد
- عرض إجمالي المطالبة
- شريط التقدم

#### QuickStats
- إحصائيات سريعة (4 بطاقات)
- المدعى عليه
- السيارة
- الفواتير المتأخرة
- المخالفات المرورية

#### MandatoryDocs
- قائمة المستندات الإلزامية
- زر تحميل ZIP
- تكامل مع DocumentItem

#### OptionalDocs
- قائمة المستندات الاختيارية
- خيارات تضمين في الحافظة
- إظهار شرطي بناءً على المخالفات

#### DocumentItem
- عرض حالة المستند
- أيقونات الحالة (جاهز/قيد التوليد/مفقود/خطأ)
- أزرار: معاينة، تحميل، توليد، رفع
- دعم PDF/Word للمذكرة الشارحة

#### ActionBar
- زر رجوع
- زر توليد جميع المستندات
- زر تسجيل القضية
- زر إرسال إلى بيانات تقاضي
- زر تحميل ZIP
- زر رفع إلى تقاضي (أتمتة)
- حالة الأتمتة

### 4. الملف الرئيسي | Main Entry

`index.tsx`:
- ✅ Provider wrapper
- ✅ حالات التحميل والخطأ
- ✅ تركيبة المكونات

---

## 📊 مقارنة قبل/بعد | Before/After Comparison

| الجانب | قبل (القديم) | بعد (الجديد) |
|--------|-------------|--------------|
| **عدد الأسطر** | 2,724 سطر | ~200 سطر (main) + components |
| **عدد المكونات** | 1 | 7+ |
| **إدارة الحالة** | 40+ useState | Context + Reducer |
| **الت coupling** | عالي | منخفض |
| **قابلية الاختبار** | صعبة | سهلة |
| **قابلية إعادة الاستخدام** | منخفضة | عالية |

---

## 📁 الملفات المنشأة | Created Files

### جديدة (New Files)
1. `src/pages/legal/LawsuitPreparation/store/types.ts` (10,712 bytes)
2. `src/pages/legal/LawsuitPreparation/store/reducer.ts` (13,677 bytes)
3. `src/pages/legal/LawsuitPreparation/store/LawsuitPreparationContext.tsx` (19,304 bytes)
4. `src/pages/legal/LawsuitPreparation/store/index.ts` (194 bytes)
5. `src/pages/legal/LawsuitPreparation/components/Header/CaseSummary.tsx` (2,675 bytes)
6. `src/pages/legal/LawsuitPreparation/components/Header/QuickStats.tsx` (2,321 bytes)
7. `src/pages/legal/LawsuitPreparation/components/Header/index.ts` (90 bytes)
8. `src/pages/legal/LawsuitPreparation/components/DocumentList/DocumentItem.tsx` (6,994 bytes)
9. `src/pages/legal/LawsuitPreparation/components/DocumentList/MandatoryDocs.tsx` (3,256 bytes)
10. `src/pages/legal/LawsuitPreparation/components/DocumentList/OptionalDocs.tsx` (4,877 bytes)
11. `src/pages/legal/LawsuitPreparation/components/DocumentList/index.ts` (146 bytes)
12. `src/pages/legal/LawsuitPreparation/components/Actions/ActionBar.tsx` (7,036 bytes)
13. `src/pages/legal/LawsuitPreparation/components/Actions/index.ts` (42 bytes)
14. `src/pages/legal/LawsuitPreparation/index.tsx` (2,709 bytes)

### نسخ احتياطية (Backups)
15. `src/pages/legal/LawsuitPreparation.backup.tsx` (الملف الأصلي)

---

## 🔧 ما يلزم لإكمال التكامل | Remaining Integration Work

### 1. توليد المستندات (Document Generation)

يجب إنشاء utilities لتوليد المستندات:

```typescript
// src/pages/legal/LawsuitPreparation/utils/documentGenerators.ts

export async function generateExplanatoryMemo(
  state: LawsuitPreparationState
): Promise<{ url: string; html: string }> {
  // استدعاء generateLegalComplaintHTML
}

export async function generateClaimsStatement(
  state: LawsuitPreparationState
): Promise<{ url: string; html: string }> {
  // استدعاء generateClaimsStatementHtml
}

export async function generateDocumentsList(
  state: LawsuitPreparationState
): Promise<{ url: string; html: string }> {
  // استدعاء generateDocumentsListHtml
}

export async function generateViolationsList(
  state: LawsuitPreparationState
): Promise<{ url: string; html: string }> {
  // استدعاء generateClaimsStatementHtml مع الفواتير فارغة
}

export async function generateCriminalComplaint(
  state: LawsuitPreparationState
): Promise<{ url: string; html: string }> {
  // استدعاء generateCriminalComplaintHtml
}

export async function generateViolationsTransfer(
  state: LawsuitPreparationState
): Promise<{ url: string; html: string }> {
  // استدعاء generateViolationsTransferHtml
}
```

### 2. تسجيل القضية (Case Registration)

```typescript
// src/pages/legal/LawsuitPreparation/utils/caseRegistration.ts

export async function registerLegalCase(
  state: LawsuitPreparationState,
  userId: string
): Promise<{ caseId: string; caseNumber: string }> {
  // استخدام convertToLegalCase hook
  // رفع المستندات
  // إنشاء القضية
}
```

### 3. تصدير ZIP

```typescript
// src/pages/legal/LawsuitPreparation/utils/zipExport.ts

export async function exportDocumentsAsZip(
  state: LawsuitPreparationState,
  contentRefs: ContentRefs
): Promise<void> {
  // استخدام JSZip
  // إضافة جميع المستندات
  // تحميل الملف
}
```

### 4. تحديث Routes

يجب التأكد من أن Routes تشير إلى الملف الجديد:

```typescript
// src/routes/index.ts
// التأكد من أن المسار يستخدم الملف الجديد
{
  path: '/legal/lawsuit/prepare/:contractId',
  component: LawsuitPreparation, // سيستخدم index.tsx الجديد
  // ...
}
```

---

## 🧪 الاختبارات | Testing

### اختبارات مقترحة

```typescript
// __tests__/reducer.test.ts
// اختبار المعالج

describe('lawsuitPreparationReducer', () => {
  it('should handle GENERATE_DOCUMENT_START', () => {
    // Test
  });
  
  it('should calculate progress correctly', () => {
    // Test
  });
});

// __tests__/components/DocumentItem.test.tsx
// اختبار مكون المستند

describe('DocumentItem', () => {
  it('should render ready state correctly', () => {
    // Test
  });
  
  it('should call onGenerate when clicked', () => {
    // Test
  });
});
```

---

## 🚀 خطوات التفعيل | Activation Steps

لتفعيل الهيكلة الجديدة:

1. **نسخ الملف الأصلي** (تم)
   ```bash
   copy src\pages\legal\LawsuitPreparation.tsx src\pages\legal\LawsuitPreparation.backup.tsx
   ```

2. **إنشاء utilities** (مطلوب)
   - documentGenerators.ts
   - caseRegistration.ts
   - zipExport.ts

3. **تحديث Context** (مطلوب)
   - ربط generateDocument بالـ utilities

4. **اختبار التكامل** (مطلوب)
   ```bash
   npm run dev
   # اختبار الصفحة على /legal/lawsuit/prepare/:contractId
   ```

5. **حذف الملف القديم** (اختياري بعد التأكد)
   ```bash
   del src\pages\legal\LawsuitPreparation.tsx
   ```

---

## 📈 فوائد الهيكلة الجديدة | Benefits of New Architecture

1. **قابلية الصيانة** - كل مكون له مسؤولية واحدة
2. **قابلية الاختبار** - سهولة اختبار كل مكون منفرداً
3. **إعادة الاستخدام** - المكونات يمكن استخدامها في أماكن أخرى
4. **الأداء** - Memoization وسيطرة أفضل على الـ re-renders
5. **قابلية التوسع** - سهولة إضافة ميزات جديدة
6. **فصل المخاوف** - UI منفصل عن المنطق
7. **Type Safety** - TypeScript types شاملة

---

## 📝 ملاحظات | Notes

- جميع الملفات الجديدة متوافقة مع TypeScript
- المكونات تستخدم Tailwind CSS والمكونات الموجودة
- Context يوفر جميع البيانات والأحداث اللازمة
- Reducer يدير الحالة بطريقة متوقعة (Predictable)
- الأخطاء في الـ build الحالي موجودة مسبقاً في المشروع

---

**تاريخ الإنشاء:** 2026-01-29  
**الحالة:** المرحلة الأولى مكتملة ✅  
**المرحلة التالية:** إنشاء utilities وربطها
