# خطة تطوير وتحسين صفحة تجهيز الدعوى
# Lawsuit Preparation Page - Improvement Plan

## 📋 ملخص تنفيذي | Executive Summary

**الموقع الحالي:** `/legal/lawsuit/prepare/:contractId`  
**المكون الحالي:** `src/pages/legal/LawsuitPreparation.tsx` (2,724 سطر)  
**حالة التقييم:** يحتاج إلى إعادة هيكلة شاملة

---

## 🔍 تحليل الوضع الحالي | Current State Analysis

### الإيجابيات الحالية
1. ✅ وظيفية كاملة - توليد المستندات القانونية
2. ✅ دمج مع نظام تقاضي (Taqadi Automation)
3. ✅ تحميل ZIP لجميع المستندات
4. ✅ تتبع التقدم (Progress Tracking)
5. ✅ قائمة مهام واضحة (Task List Pattern)

### المشكلات الرئيسية

#### 1. تعقيد المكون (Component Complexity)
```
الحجم الحالي: 2,724 سطر
المفضل: < 300 سطر لكل مكون
```
- ❌ خرق لمبدأ المسؤولية الواحدة (SRP)
- ❌ صيانة صعبة وعرضة للأخطاء
- ❌ اختبار صعب بسبب الارتباط العالي (Tight Coupling)

#### 2. خلط المسؤوليات (Mixed Concerns)
| المسؤولية | الموقع الحالي | المفضل |
|-----------|---------------|--------|
| واجهة المستخدم | داخل المكون | مكونات منفصلة |
| منطق المستندات | داخل المكون | خدمات/هوكات مخصصة |
| توليد HTML | داخل المكون | Utilities منفصلة |
| إدارة الحالة | useState متعدد | Context/Reducer |

#### 3. إدارة الحالة (State Management)
```typescript
// ~40+ حالة منفصلة
const [memoUrl, setMemoUrl] = useState<string | null>(null);
const [isGeneratingMemo, setIsGeneratingMemo] = useState(false);
const [docsListUrl, setDocsListUrl] = useState<string | null>(null);
// ... 37+ أخرى
```

#### 4. الأداء (Performance Issues)
- ❌ إعادة توليد المستندات عند كل render
- ❌ لا يوجد caching للمستندات المولدة
- ❌ تحميل جميع المكتبات مرة واحدة (jszip, html2canvas, jspdf)

#### 5. تجربة المستخدم (UX)
- ⚠️ لا يوجد حفظ تلقائي (Auto-save)
- ⚠️ لا يوجد preview للمستندات قبل التحميل
- ⚠️ لا يوجد history للتغييرات
- ⚠️ لا يوجد collaboration (تعدد المستخدمين)

---

## 🎯 خطة التطوير الشاملة | Comprehensive Improvement Plan

### المرحلة 1: إعادة الهيكلة المعمارية (Architecture Refactoring)

#### 1.1 تقسيم المكونات (Component Splitting)

```
src/
├── pages/
│   └── legal/
│       └── LawsuitPreparation/
│           ├── index.tsx                 # Entry point (≤100 سطر)
│           ├── LawsuitPreparationProvider.tsx  # Context Provider
│           ├── components/
│           │   ├── Header/
│           │   │   ├── CaseSummary.tsx   # ملخص القضية
│           │   │   ├── ProgressBar.tsx   # شريط التقدم
│           │   │   └── QuickStats.tsx    # إحصائيات سريعة
│           │   ├── DocumentList/
│           │   │   ├── MandatoryDocs.tsx # المستندات الإلزامية
│           │   │   ├── OptionalDocs.tsx  # المستندات الاختيارية
│           │   │   ├── DocumentItem.tsx  # عنصر المستند الواحد
│           │   │   └── DocumentActions.tsx # أزرار الإجراءات
│           │   ├── TaqadiSection/
│           │   │   ├── TaqadiDataCard.tsx    # بيانات تقاضي
│           │   │   ├── AutomationPanel.tsx   # لوحة الأتمتة
│           │   │   └── CopyableFields.tsx    # حقول قابلة للنسخ
│           │   └── Actions/
│           │       ├── ActionBar.tsx     # شريط الإجراءات
│           │       ├── GenerateAllBtn.tsx # زر توليد الكل
│           │       ├── RegisterCaseBtn.tsx # زر تسجيل القضية
│           │       └── DownloadZipBtn.tsx # زر تحميل ZIP
│           └── hooks/
│               ├── useLawsuitPreparation.ts    # Hook رئيسي
│               ├── useDocumentGeneration.ts    # توليد المستندات
│               ├── useTaqadiAutomation.ts      # أتمتة تقاضي
│               └── useDocumentExport.ts        # تصدير المستندات
```

#### 1.2 إدارة الحالة المركزية (State Management)

```typescript
// src/pages/legal/LawsuitPreparation/store/types.ts

interface LawsuitPreparationState {
  // بيانات القضية
  case: {
    contractId: string;
    customer: Customer | null;
    vehicle: Vehicle | null;
    calculations: FinancialCalculations;
    taqadiData: TaqadiData | null;
  };
  
  // حالة المستندات
  documents: {
    memo: DocumentState;
    claims: DocumentState;
    docsList: DocumentState;
    violations: DocumentState;
    criminalComplaint: DocumentState;
    violationsTransfer: DocumentState;
  };
  
  // حالة العمليات
  ui: {
    isGeneratingAll: boolean;
    isRegistering: boolean;
    isDownloadingZip: boolean;
    showTaqadiData: boolean;
    progress: number;
  };
}

interface DocumentState {
  status: 'pending' | 'generating' | 'ready' | 'error';
  url: string | null;
  htmlContent: string | null;
  error: Error | null;
  generatedAt: Date | null;
}
```

#### 1.3Reducer Pattern

```typescript
// src/pages/legal/LawsuitPreparation/store/reducer.ts

type Action =
  | { type: 'GENERATE_DOCUMENT_START'; payload: { docId: string } }
  | { type: 'GENERATE_DOCUMENT_SUCCESS'; payload: { docId: string; url: string; html: string } }
  | { type: 'GENERATE_DOCUMENT_ERROR'; payload: { docId: string; error: Error } }
  | { type: 'RESET_DOCUMENT'; payload: { docId: string } }
  | { type: 'GENERATE_ALL_START' }
  | { type: 'GENERATE_ALL_COMPLETE' }
  | { type: 'UPDATE_PROGRESS' };

function lawsuitPreparationReducer(state: LawsuitPreparationState, action: Action): LawsuitPreparationState {
  // Implementation
}
```

---

### المرحلة 2: تحسين الأداء (Performance Optimization)

#### 2.1 Lazy Loading للمكتبات الثقيلة

```typescript
// Before
import JSZip from 'jszip';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// After
async function generatePDF(html: string) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);
  // ...
}
```

#### 2.2 تخزين المستندات المولدة (Caching)

```typescript
// src/pages/legal/LawsuitPreparation/hooks/useDocumentCache.ts

export function useDocumentCache() {
  const cacheDocument = useCallback((key: string, html: string) => {
    localStorage.setItem(`lawsuit_doc_${key}`, JSON.stringify({
      html,
      timestamp: Date.now(),
      hash: generateHash(html),
    }));
  }, []);
  
  const getCachedDocument = useCallback((key: string) => {
    const cached = localStorage.getItem(`lawsuit_doc_${key}`);
    if (!cached) return null;
    
    const { html, timestamp } = JSON.parse(cached);
    // Invalidate after 24 hours
    if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(`lawsuit_doc_${key}`);
      return null;
    }
    return html;
  }, []);
  
  return { cacheDocument, getCachedDocument };
}
```

#### 2.3 Memoization

```typescript
// Heavy calculations memoization
const calculations = useMemo(() => 
  calculateDelinquencyAmounts(invoices, violations),
  [invoices, violations]
);

// Document list memoization
const documentsList = useMemo(() => 
  buildDocumentsList(state, actions),
  [state.documents, state.case]
);
```

---

### المرحلة 3: تحسين تجربة المستخدم (UX Enhancement)

#### 3.1 حفظ تلقائي (Auto-save)

```typescript
// src/pages/legal/LawsuitPreparation/hooks/useAutoSave.ts

export function useAutoSave(state: LawsuitPreparationState) {
  const saveDraft = useCallback(async () => {
    await supabase
      .from('lawsuit_drafts')
      .upsert({
        contract_id: state.case.contractId,
        state: serializeState(state),
        updated_at: new Date().toISOString(),
      });
  }, [state]);
  
  useEffect(() => {
    const interval = setInterval(saveDraft, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [saveDraft]);
}
```

#### 3.2 Preview للمستندات

```typescript
// إضافة modal لمعاينة المستند قبل التحميل
<DocumentPreviewModal 
  html={documentHtml}
  onDownload={() => downloadDocument()}
  onPrint={() => window.print()}
/>
```

#### 3.3 Guided Tour (جولة إرشادية)

```typescript
// للمستخدمين الجدد
<GuidedTour 
  steps={[
    { target: '#documents-list', content: 'قائمة المستندات المطلوبة' },
    { target: '#generate-btn', content: 'توليد جميع المستندات' },
    { target: '#register-btn', content: 'تسجيل القضية' },
  ]}
/>
```

#### 3.4 تحسين حالات التحميل

```typescript
// Skeleton loading
<DocumentSkeleton />

// Progressive loading
<ProgressiveDocumentLoad 
  documents={documents}
  onDocumentReady={handleDocumentReady}
/>
```

---

### المرحلة 4: تحسين الأمان والاستقرار (Security & Stability)

#### 4.1 Error Boundaries

```typescript
// src/pages/legal/LawsuitPreparation/components/ErrorBoundary.tsx

export class LawsuitErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

#### 4.2 Retry Logic

```typescript
// src/pages/legal/LawsuitPreparation/utils/withRetry.ts

export async function withRetry<T>(
  fn: () => Promise<T>,
  options = { maxAttempts: 3, delay: 1000 }
): Promise<T> {
  // Implementation with exponential backoff
}
```

#### 4.3 Validation

```typescript
// src/pages/legal/LawsuitPreparation/validation/schema.ts

export const lawsuitPreparationSchema = z.object({
  documents: z.object({
    memo: z.object({ status: z.enum(['ready']) }),
    claims: z.object({ status: z.enum(['ready']) }),
  }),
  case: z.object({
    taqadiData: z.object({
      caseTitle: z.string().min(1),
      amount: z.number().positive(),
    }),
  }),
});
```

---

### المرحلة 5: اختبارات شاملة (Testing Strategy)

#### 5.1 Unit Tests

```typescript
// src/pages/legal/LawsuitPreparation/__tests__/reducer.test.ts

describe('lawsuitPreparationReducer', () => {
  it('should handle GENERATE_DOCUMENT_START', () => {
    // Test
  });
  
  it('should handle GENERATE_DOCUMENT_SUCCESS', () => {
    // Test
  });
});
```

#### 5.2 Integration Tests

```typescript
// src/pages/legal/LawsuitPreparation/__tests__/integration.test.tsx

describe('LawsuitPreparation Integration', () => {
  it('should generate all documents and register case', async () => {
    // Test complete workflow
  });
});
```

#### 5.3 E2E Tests

```typescript
// e2e/lawsuit-preparation.spec.ts

test('complete lawsuit preparation flow', async ({ page }) => {
  await page.goto('/legal/lawsuit/prepare/123');
  await page.click('[data-testid="generate-all"]');
  await expect(page.locator('[data-testid="progress"]')).toHaveText('100%');
  await page.click('[data-testid="register-case"]');
  await expect(page).toHaveURL('/legal/cases');
});
```

---

## 📊 خطة التنفيذ | Implementation Roadmap

### الأسبوع 1: الأساسيات
- [ ] إنشاء بنية المجلدات الجديدة
- [ ] نقل types إلى ملف منفصل
- [ ] إنشاء Context & Reducer
- [ ] اختبارات للـ reducer

### الأسبوع 2: المكونات
- [ ] إنشاء CaseSummary component
- [ ] إنشاء DocumentList components
- [ ] إنشاء DocumentItem component
- [ ] إنشاء ActionBar component

### الأسبوع 3: المنطق والحالة
- [ ] نقل منطق توليد المستندات إلى hooks
- [ ] تنفيذ useDocumentGeneration
- [ ] تنفيذ useTaqadiAutomation
- [ ] تنفيذ useDocumentExport

### الأسبوع 4: التحسينات
- [ ] إضافة Caching
- [ ] إضافة Auto-save
- [ ] إضافة Error Boundaries
- [ ] تحسين الأداء

### الأسبوع 5: الاختبارات والتلميع
- [ ] كتابة الاختبارات الشاملة
- [ ] اختبار المستخدم (User Testing)
- [ ] إصلاح الأخطاء
- [ ] تحديث الوثائق

---

## 🔧 أمثلة على الكود المُحسَّن | Code Examples

### Before (الحالي)

```typescript
// 2,724 lines in one file
export default function LawsuitPreparationPage() {
  // ~40 useState calls
  const [memoUrl, setMemoUrl] = useState<string | null>(null);
  const [isGeneratingMemo, setIsGeneratingMemo] = useState(false);
  // ... 38 more
  
  // Document generation inline
  const generateExplanatoryMemo = useCallback(() => {
    // 100+ lines of logic
  }, [/* 10+ dependencies */]);
  
  // UI mixed with logic
  return (
    <div>
      {/* 1000+ lines of JSX */}
    </div>
  );
}
```

### After (المُحسَّن)

```typescript
// src/pages/legal/LawsuitPreparation/index.tsx
// ~80 lines

export default function LawsuitPreparationPage() {
  const { contractId } = useParams();
  const { state, dispatch, actions } = useLawsuitPreparation(contractId);
  
  if (state.ui.isLoading) return <LawsuitPreparationSkeleton />;
  
  return (
    <LawsuitPreparationProvider value={{ state, dispatch, actions }}>
      <div className="container mx-auto p-4 max-w-4xl" dir="rtl">
        <BackButton />
        <CaseSummary />
        <QuickStats />
        <ProgressBar />
        <MandatoryDocuments />
        <OptionalDocuments />
        <TaqadiDataSection />
        <ActionBar />
      </div>
    </LawsuitPreparationProvider>
  );
}
```

---

## 📈 المقاييس المستهدفة | Target Metrics

| المقياس | الحالي | المستهدف |
|---------|--------|----------|
| عدد أسطر الملف الرئيسي | 2,724 | < 100 |
| عدد المكونات | 1 | 10+ |
| وقت التحميل الأولي | ~3s | < 1s |
| Time to Interactive | ~5s | < 2s |
| معدل إعادة الـ renders | عالي | منخفض |
| تغطية الاختبارات | 0% | > 80% |

---

## 🎨 تصميم واجهة المستخدم المُقترح | Proposed UI Design

### التصميم الحالي
```
┌─────────────────────────────────────────┐
│  تجهيز الدعوى - محمد أحمد               │
│  [شريط تقدم] 67% مكتمل                  │
├─────────────────────────────────────────┤
│  [بطاقات معلومات سريعة]                 │
├─────────────────────────────────────────┤
│  المستندات الإلزامية                    │
│  - المذكرة الشارحة ✅ [معاينة] [تحميل]  │
│  - كشف المطالبات ⏳ [توليد]             │
├─────────────────────────────────────────┤
│  مستندات داعمة (اختياري)                │
├─────────────────────────────────────────┤
│  بيانات تقاضي (قابلة للطي)              │
├─────────────────────────────────────────┤
│  [توليد الكل] [تسجيل القضية] [ZIP]      │
└─────────────────────────────────────────┘
```

### التصميم المُحسَّن
```
┌─────────────────────────────────────────┐
│  ← رجوع  تجهيز الدعوى        [القائمة] │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────┐    │
│  │  📊 ملخص القضية                │    │
│  │  محمد أحمد | ر.ق 45,000        │    │
│  │  [████████░░] 80% جاهز         │    │
│  └─────────────────────────────────┘    │
├─────────────────────────────────────────┤
│  📋 قائمة المهام                        │
│  ┌─────────────────────────────────┐    │
│  │ ✅ المذكرة الشارحة        [👁️] │    │
│  │ ✅ كشف المطالبات          [👁️] │    │
│  │ ⏳ كشف المستندات      [توليد]  │    │
│  │ ⚠️  عقد الإيجار       [رفع]    │    │
│  └─────────────────────────────────┘    │
├─────────────────────────────────────────┤
│  📎 إضافات (3)              [توسيع]     │
├─────────────────────────────────────────┤
│  📋 بيانات تقاضي            [نسخ الكل]  │
│  ┌─────────────────────────────────┐    │
│  │ عنوان الدعوى        [📋]        │    │
│  │ الوقائع             [📋]        │    │
│  │ الطلبات             [📋]        │    │
│  └─────────────────────────────────┘    │
├─────────────────────────────────────────┤
│  [🚀 توليد الكل] [⚡ أتمتة تقاضي]       │
│  [📥 تحميل ZIP] [⚖️ تسجيل القضية]       │
└─────────────────────────────────────────┘
```

---

## 🚀 خطوات البدء الفوري | Immediate Next Steps

1. **إنشاء فرع جديد** للتطوير
   ```bash
   git checkout -b refactor/lawsuit-preparation
   ```

2. **إنشاء بنية المجلدات**
   ```bash
   mkdir -p src/pages/legal/LawsuitPreparation/{components,hooks,store,utils,__tests__}
   ```

3. **نقل Types أولاً** (آمن ولا يكسر الشيء)
   ```bash
   # نقل types إلى ملف منفصل
   ```

4. **إنشاء Hooks تدريجياً**
   - ابدأ بـ useDocumentGeneration
   - ثم useTaqadiAutomation
   - أخيراً useLawsuitPreparation

---

## 📝 ملاحظات إضافية | Additional Notes

### التوافق مع المتصفحات
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### اعتبارات الوصول (Accessibility)
- دعم كامل للـ RTL
- دعم قارئات الشاشة
- تباين ألوان مناسب
- لوحة مفاتيح قابلة للتنقل

### التوافق مع الموبايل
- تصميم متجاوب بالكامل
- أزرار كبيرة للمس
- تحسين الأداء للشبكات البطيئة

---

**تم إعداد هذا المستند بتاريخ:** 2026-01-29  
**الإصدار:** 1.0  
**المؤلف:** Fleetify Development Team
