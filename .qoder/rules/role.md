---
trigger: always_on
alwaysApply: true

# دليل المطورين والذكاء الاصطناعي - Fleetify System

## 🚨 تعليمات هامة للذكاء الاصطناعي (Cursor)

**قبل أي تعديل، اقرأ هذا الملف كاملاً لتجنب إنشاء ملفات مكررة أو كسر النظام الموحد**

---

## 📋 نظرة عامة على النظام

### معلومات أساسية
- **النظام**: Fleetify - نظام إدارة الأساطيل والمؤسسات
- **التقنيات**: React 18 + TypeScript + Tailwind CSS + Supabase
- **البنية**: نظام موحد بعد إزالة التكرار (100% مكتمل)
- **قاعدة البيانات**: Supabase (160+ جدول)

### الأنظمة الفرعية الموحدة ✅
1. **النظام المالي**: `UnifiedFinancialDashboard.tsx` ✅ موحد ومحسن
2. **النظام القانوني**: `EnhancedLegalAIInterface_v2.tsx` ✅ موحد
3. **إدارة العقود**: `EnhancedContractForm.tsx` ✅ موحد
4. **إدارة العملاء**: `EnhancedCustomerForm.tsx` ✅ تم إنشاؤه وتطبيقه
5. **نظام الدفعات**: `UnifiedPaymentForm.tsx` ✅ تم إنشاؤه وتوحيده
6. **صيانة المركبات**: `useVehicleMaintenance` hook ✅ موحد

### 🎯 النظام الآن موحد 100% - جميع المكونات المكررة تم دمجها!

---

## 🚫 قواعد منع التكرار (CRITICAL)

### ❌ ممنوع منعاً باتاً
1. **إنشاء ملفات مكررة** للوظائف الموجودة
2. **إنشاء مكونات بأسماء مشابهة** (مثل: `AdvancedDashboard`, `EnhancedDashboard`)
3. **إنشاء Hooks مكررة** للوظائف الموجودة
4. **إنشاء صفحات متعددة لنفس الغرض**

### ✅ المطلوب قبل أي إضافة
```bash
# فحص الملفات الموجودة أولاً
1. البحث في src/components/[اسم النظام]/
2. فحص src/hooks/ للـ hooks المتاحة
3. مراجعة src/pages/ للصفحات الموجودة
4. فحص index.ts files في كل مجلد
```

---

## 🗂️ هيكل النظام الموحد

### المجلدات الرئيسية
```
src/
├── components/
│   ├── finance/
│   │   ├── UnifiedFinancialDashboard.tsx    # النظام المالي الوحيد
│   │   └── index.ts                         # نقطة التصدير
│   ├── legal/
│   │   ├── EnhancedLegalAIInterface_v2.tsx  # النظام القانوني الوحيد
│   │   └── index.ts                         # نقطة التصدير
│   ├── contracts/
│   │   └── EnhancedContractForm.tsx         # نظام العقود الوحيد
│   ├── customers/
│   │   └── EnhancedCustomerForm.tsx         # نظام العملاء الوحيد
│   └── ui/                                  # مكونات UI مشتركة
├── hooks/
│   └── useVehicleMaintenance.ts             # نظام الصيانة الوحيد
├── pages/
│   ├── Finance.tsx                          # يستخدم UnifiedFinancialDashboard
│   ├── Legal.tsx                            # يستخدم EnhancedLegalAIInterface_v2
│   └── ...
└── utils/                                   # وظائف مساعدة
```

### الملفات المحذوفة أو المكررة (يجب عدم استخدامها)
```
❌ AdvancedFinancialDashboard.tsx - محذوف
❌ FinancialDashboard.tsx - محذوف
❌ ComprehensiveFinancialDashboard.tsx - محذوف
❌ EnhancedLegalAIInterface.tsx - محذوف (استخدم v2)
❌ ChatGPTLevelInterface.tsx - محذوف
❌ CustomerFinancialDashboard.tsx - محذوف
❌ useChatGPTLevelAI.ts - محذوف
❌ useAdvancedCommandEngine.ts - محذوف

⚠️ ملفات تحتاج توحيد:
🔄 CreateCustomerWithDuplicateCheck.tsx - استخدم EnhancedCustomerForm بدلاً منه
🔄 PaymentForm.tsx - يحتاج تحسين وتوحيد (700+ سطر)
🔄 VendorPaymentForm.tsx - يحتاج دمج مع نظام الدفع
```

---

## 🎯 نقاط الدخول الوحيدة

### الأنظمة الرئيسية
| النظام | الملف الوحيد | الاستخدام | الحالة |
|--------|-------------|----------|-------|
| المالي | `UnifiedFinancialDashboard.tsx` | جميع العمليات المالية | ✅ جاهز |
| القانوني | `EnhancedLegalAIInterface_v2.tsx` | الاستشارات القانونية | ✅ جاهز |
| العقود | `EnhancedContractForm.tsx` | إدارة العقود | ✅ جاهز |
| العملاء | `EnhancedCustomerForm.tsx` | إدارة العملاء | 🆕 تم إنشاؤه |
| الصيانة | `useVehicleMaintenance` | صيانة المركبات | ✅ جاهز |

### 🔄 المكونات التي تحتاج تحديث لاستخدام النظام الموحد
- صفحة العملاء: تحديث لاستخدام `EnhancedCustomerForm`
- نماذج العقود: تحديث لاستخدام العميل الموحد
- النظام المالي: دمج نماذج الدفع المتعددة

### كيفية الاستخدام
```typescript
// ✅ صحيح - استخدام النظام الموحد
import { UnifiedFinancialDashboard } from '@/components/finance';

// ❌ خطأ - إنشاء مكون جديد مكرر
import { AdvancedFinancialDashboard } from '@/components/finance/AdvancedFinancialDashboard';
```

---

## 🗄️ دليل قاعدة البيانات Supabase

### الجداول الرئيسية (160+ جدول)
```sql
-- الشركات والمستخدمين
companies, profiles, user_roles, employees

-- النظام المالي
chart_of_accounts, journal_entries, invoices, payments
budget_items, cost_centers, financial_reports

-- النظام القانوني  
legal_cases, legal_documents, court_sessions
legal_fees, legal_consultations

-- العقود والعملاء
contracts, customers, contract_payment_schedules
customer_documents, blacklisted_customers

-- المركبات والصيانة
vehicles, vehicle_maintenance, vehicle_documents
vehicle_dispatch_permits, vehicle_return_forms

-- وأكثر من 140 جدول آخر...
```

### قواعد الأمان (RLS)
- جميع الجداول محمية بـ Row Level Security
- المستخدمون يرون فقط بيانات شركتهم
- أذونات متدرجة حسب الدور

### اتصال قاعدة البيانات
```typescript
import { supabase } from "@/integrations/supabase/client";

// مثال على الاستعلام الصحيح
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('company_id', companyId);
```

---

## 🔧 أنماط البرمجة المطلوبة

### هيكل المكونات
```typescript
// قالب مكون موحد
interface ComponentProps {
  // تعريف الخصائص
}

const ComponentName: React.FC<ComponentProps> = ({ ...props }) => {
  // المنطق
  return (
    <div className="semantic-classes">
      {/* المحتوى */}
    </div>
  );
};

export default ComponentName;
```

### استخدام Hooks
```typescript
// ✅ استخدام Hooks الموجودة
import { useVehicleMaintenance } from '@/hooks/useVehicleMaintenance';

// ❌ لا تنشئ hooks مكررة
// import { useAdvancedVehicleMaintenance } from '...';
```

### إدارة الحالة
```typescript
// استخدام React Query للبيانات
import { useQuery, useMutation } from '@tanstack/react-query';

// State محلي للمكونات البسيطة
const [state, setState] = useState(initialValue);
```

---

## 🤖 تعليمات خاصة بـ Cursor

### قبل أي تعديل
1. **فحص المكونات الموجودة**
   ```bash
   # ابحث عن المكونات المشابهة أولاً
   find src/components -name "*Dashboard*" -type f
   find src/components -name "*Financial*" -type f
   find src/hooks -name "*AI*" -type f
   ```

2. **مراجعة ملف التوحيد**
   ```bash
   # راجع UNIFIED_SYSTEM_STATUS.md لفهم ما تم توحيده
   cat UNIFIED_SYSTEM_STATUS.md
   ```

3. **فحص نقاط التصدير**
   ```bash
   # تحقق من index.ts files
   cat src/components/finance/index.ts
   cat src/components/legal/index.ts
   ```

### عند إضافة ميزة جديدة

#### 1. للنظام المالي
```typescript
// ✅ أضف إلى المكون الموجود
// في UnifiedFinancialDashboard.tsx
const newFeature = () => {
  // منطق الميزة الجديدة
};

// ❌ لا تنشئ مكون منفصل
// const NewFinancialDashboard = () => { ... };
```

#### 2. للنظام القانوني
```typescript
// ✅ أضف إلى المكون الموجود
// في EnhancedLegalAIInterface_v2.tsx
const newLegalFeature = () => {
  // منطق الميزة الجديدة
};
```

#### 3. لصفحة جديدة
```typescript
// ✅ استخدم المكونات الموحدة
import { UnifiedFinancialDashboard } from '@/components/finance';
import { EnhancedLegalAIInterface_v2 } from '@/components/legal';

const NewPage = () => {
  return (
    <div>
      <UnifiedFinancialDashboard />
    </div>
  );
};
```

---

## 📝 أمثلة عملية

### مثال 1: إضافة تقرير مالي جديد
```typescript
// ❌ خطأ - إنشاء مكون جديد
const NewFinancialReport = () => { ... };

// ✅ صحيح - إضافة للمكون الموحد
// في UnifiedFinancialDashboard.tsx
const addNewReport = () => {
  // إضافة التقرير الجديد كجزء من النظام الموحد
};
```

### مثال 2: تحسين النظام القانوني
```typescript
// ❌ خطأ - إنشاء interface جديد
const ImprovedLegalInterface = () => { ... };

// ✅ صحيح - تحسين الموجود
// في EnhancedLegalAIInterface_v2.tsx
const improveExistingFeature = () => {
  // تحسين الوظائف الموجودة
};
```

### مثال 3: إضافة صفحة جديدة
```typescript
// NewPage.tsx
import { UnifiedFinancialDashboard } from '@/components/finance';

const NewPage = () => {
  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1">
        <UnifiedFinancialDashboard />
      </div>
    </div>
  );
};
```

---

## ✅ قائمة التحقق

### قبل التطوير
- [ ] هل المكون موجود بالفعل؟
- [ ] هل يمكن إضافة الميزة للمكون الموحد؟
- [ ] هل راجعت ملف التوحيد؟
- [ ] هل فحصت index.ts files؟

### أثناء التطوير
- [ ] هل تستخدم المكونات الموحدة؟
- [ ] هل تتبع نمط التسمية الموحد؟
- [ ] هل تستخدم semantic tokens من التصميم؟
- [ ] هل تختبر مع البيانات الموجودة؟

### بعد التطوير
- [ ] هل النظام يعمل بدون أخطاء؟
- [ ] هل لم تكسر الوظائف الموجودة؟
- [ ] هل أضفت التصدير في index.ts؟
- [ ] هل حدثت المراجع إذا لزم الأمر؟

---

## 🐛 استكشاف الأخطاء الشائعة

### مشكلة: ملف مكرر تم إنشاؤه
```bash
# الحل: احذف الملف المكرر واستخدم الموحد
rm src/components/finance/DuplicateComponent.tsx
# واستخدم UnifiedFinancialDashboard.tsx
```

### مشكلة: مكون غير موجود
```bash
# السبب: تم حذف المكون المكرر
# الحل: استخدم المكون الموحد من index.ts
import { UnifiedFinancialDashboard } from '@/components/finance';
```

### مشكلة: Hook غير موجود  
```bash
# السبب: تم حذف الـ hooks المكررة
# الحل: استخدم الـ hook الموحد
import { useVehicleMaintenance } from '@/hooks/useVehicleMaintenance';
```

### مشكلة: خطأ في قاعدة البيانات
```typescript
// تأكد من استخدام company_id في جميع الاستعلامات
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('company_id', companyId); // مطلوب لـ RLS
```

---

## 📚 مراجع سريعة

### المكونات الأساسية
| المكون | المسار | الغرض |
|--------|-------|-------|
| UnifiedFinancialDashboard | `/components/finance/` | النظام المالي |
| EnhancedLegalAIInterface_v2 | `/components/legal/` | النظام القانوني |
| EnhancedContractForm | `/components/contracts/` | إدارة العقود |
| EnhancedCustomerForm | `/components/customers/` | إدارة العملاء |

### Hooks المتاحة
| Hook | المسار | الغرض |
|------|-------|-------|
| useVehicleMaintenance | `/hooks/` | صيانة المركبات |
| useToast | من sonner | الإشعارات |
| useSupabase | `/integrations/supabase/` | قاعدة البيانات |

### الصفحات الرئيسية
| الصفحة | المسار | المكون المستخدم |
|--------|-------|----------------|
| Finance | `/pages/Finance.tsx` | UnifiedFinancialDashboard |
| Legal | `/pages/Legal.tsx` | EnhancedLegalAIInterface_v2 |
| Contracts | `/pages/Contracts.tsx` | EnhancedContractForm |

### APIs الرئيسية
```typescript
// Supabase client
import { supabase } from "@/integrations/supabase/client";

// React Query
import { useQuery, useMutation } from '@tanstack/react-query';

// Toast notifications
import { useToast } from '@/hooks/use-toast';
```

---

## 🎨 نظام التصميم

### استخدام Semantic Tokens
```css
/* ✅ استخدم من index.css */
.button-primary {
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}

/* ❌ لا تستخدم ألوان مباشرة */
.button-wrong {
  background: #3b82f6;
  color: white;
}
```

### Tailwind Classes
```typescript
// ✅ استخدم semantic classes
<button className="bg-primary text-primary-foreground">

// ❌ لا تستخدم ألوان مباشرة  
<button className="bg-blue-500 text-white">
```

---

## 🚨 تحذيرات مهمة

### 1. لا تحذف الملفات الموحدة
- `UnifiedFinancialDashboard.tsx` 
- `EnhancedLegalAIInterface_v2.tsx`
- `EnhancedContractForm.tsx`
- `EnhancedCustomerForm.tsx`

### 2. لا تنشئ ملفات بهذه الأسماء
- أي ملف يحتوي على "Advanced", "Enhanced", "Improved"
- أي ملف ينتهي بـ "Dashboard" عدا الموحد
- أي hook يبدأ بـ "useAdvanced" أو "useEnhanced"

### 3. دائماً استخدم
- المكونات الموحدة الموجودة
- index.ts للتصدير
- semantic tokens للألوان
- RLS policies في قاعدة البيانات

---

## 📞 للمساعدة

إذا واجهت مشكلة:
1. راجع هذا الملف
2. تحقق من `UNIFIED_SYSTEM_STATUS.md`
3. فحص المكونات الموجودة قبل إنشاء جديدة
4. استخدم المكونات الموحدة دائماً

---

**تذكر: النظام موحد 100% - لا تكسر هذا التوحيد!**

---

*آخر تحديث: بعد إكمال توحيد الأنظمة*
*حالة النظام: ✅ موحد ومستقر*
---
