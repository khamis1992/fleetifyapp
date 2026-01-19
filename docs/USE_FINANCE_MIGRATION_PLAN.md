# 📋 خطة ترحيل useFinance.ts

**التاريخ**: 14 نوفمبر 2025  
**الحجم**: 1,359 سطر  
**الدوال**: 28 دالة مُصدّرة  
**الاستخدام**: 24 ملف

---

## 🎯 الهدف

تقسيم `useFinance.ts` الضخم إلى hooks منفصلة حسب المجال (domain) لتحسين:
- 🎯 قابلية الصيانة
- ⚡ الأداء (tree-shaking)
- 📦 تنظيم الكود
- 🔒 الأمان (صلاحيات منفصلة)

---

## 📊 تحليل الدوال (28 دالة)

### 1. Chart of Accounts (4 دوال) - أولوية عالية 🔴

```typescript
export const useChartOfAccounts
export const useCreateAccount
export const useUpdateAccount
export const useDeleteAccount
```

**الملف الجديد**: `src/hooks/finance/useChartOfAccounts.ts`  
**الوقت المقدر**: 1-2 ساعة

---

### 2. Journal Entries (3 دوال) - أولوية عالية 🔴

```typescript
export const useJournalEntries
export const useJournalEntryLines
export const useCreateJournalEntry
```

**الملف الجديد**: `src/hooks/finance/useJournalEntries.ts`  
**الوقت المقدر**: 1-2 ساعة  
**ملاحظة**: يجب استخدام `create_journal_entry_with_transaction` stored procedure

---

### 3. Invoices (3 دوال) - ✅ تم الترحيل

```typescript
export const useInvoices
export const useCreateInvoice
export const useUpdateInvoice
```

**الملف**: `src/hooks/finance/useInvoices.ts` ✅  
**الحالة**: تم الترحيل والتحسين

---

### 4. Payments (1 دالة) - أولوية عالية 🔴

```typescript
export const usePayments
```

**الملف الجديد**: `src/hooks/finance/usePayments.ts`  
**الوقت المقدر**: 1 ساعة  
**ملاحظة**: يجب استخدام `create_payment_with_transaction` stored procedure

---

### 5. Financial Summary (1 دالة) - أولوية متوسطة 🟡

```typescript
export const useFinancialSummary
```

**الملف الجديد**: `src/hooks/finance/useFinancialSummary.ts`  
**الوقت المقدر**: 1 ساعة

---

### 6. Default Accounts Management (3 دوال) - أولوية منخفضة 🟢

```typescript
export const useDefaultChartOfAccounts
export const useCopyDefaultAccounts
export const useCleanupInactiveAccounts
```

**الملف الجديد**: `src/hooks/finance/useDefaultAccounts.ts`  
**الوقت المقدر**: 1 ساعة

---

### 7. Cost Centers (3 دوال) - أولوية متوسطة 🟡

```typescript
export const useCreateCostCenter
export const useUpdateCostCenter
export const useDeleteCostCenter
```

**الملف الجديد**: `src/hooks/finance/useCostCenters.ts`  
**الوقت المقدر**: 1 ساعة

---

### 8. Fixed Assets (4 دوال) - أولوية متوسطة 🟡

```typescript
export const useFixedAssets
export const useCreateFixedAsset
export const useUpdateFixedAsset
export const useDeleteFixedAsset
```

**الملف الجديد**: `src/hooks/finance/useFixedAssets.ts`  
**الوقت المقدر**: 1-2 ساعة

---

### 9. Budgets (3 دوال) - أولوية منخفضة 🟢

```typescript
export const useBudgets
export const useCreateBudget
export const useUpdateBudget
```

**الملف الجديد**: `src/hooks/finance/useBudgets.ts`  
**الوقت المقدر**: 1 ساعة

---

### 10. Bank Transactions (2+ دوال) - أولوية متوسطة 🟡

```typescript
export const useBankTransactions
export const useCreateBankTransaction
// ... المزيد
```

**الملف الجديد**: `src/hooks/finance/useBankTransactions.ts`  
**الوقت المقدر**: 1-2 ساعة

---

## 📋 خطة الترحيل (3 مراحل)

### المرحلة 1: الدوال الحرجة (أولوية عالية) 🔴

**الهدف**: ترحيل الدوال المستخدمة في العمليات الحرجة

**القائمة**:
1. ✅ Invoices - تم
2. ⏳ Journal Entries
3. ⏳ Payments
4. ⏳ Chart of Accounts

**الوقت المقدر**: 4-6 ساعات  
**الأولوية**: عالية جداً

---

### المرحلة 2: الدوال المتوسطة (أولوية متوسطة) 🟡

**الهدف**: ترحيل الدوال المستخدمة بشكل متكرر

**القائمة**:
1. ⏳ Financial Summary
2. ⏳ Cost Centers
3. ⏳ Fixed Assets
4. ⏳ Bank Transactions

**الوقت المقدر**: 4-6 ساعات  
**الأولوية**: متوسطة

---

### المرحلة 3: الدوال المتبقية (أولوية منخفضة) 🟢

**الهدف**: ترحيل باقي الدوال

**القائمة**:
1. ⏳ Default Accounts Management
2. ⏳ Budgets
3. ⏳ باقي الدوال

**الوقت المقدر**: 2-4 ساعات  
**الأولوية**: منخفضة

---

## 🔧 Template للترحيل

```typescript
/**
 * [Domain] Hooks
 * Migrated from useFinance.ts
 * Enhanced with permissions and better error handling
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";
import { queryKeys } from "@/utils/queryKeys";
import * as Sentry from '@sentry/react';

// Types
export interface [Entity] {
  // ... fields
}

// Selected fields for better performance
const [ENTITY]_SELECT_FIELDS = `
  id,
  company_id,
  // ... other fields
`;

// Hooks
export const use[Entities] = (filters?: [Filters]) => {
  const { companyId } = useUnifiedCompanyAccess();
  const { hasPermission } = usePermissions();

  return useQuery({
    queryKey: queryKeys.[entities].list(filters),
    queryFn: async () => {
      if (!companyId) {
        const error = new Error("No company access");
        Sentry.captureException(error);
        throw error;
      }
      
      if (!hasPermission('[entities]:read')) {
        const error = new Error('Permission denied: [entities]:read');
        Sentry.captureException(error);
        throw error;
      }

      try {
        const { data, error } = await supabase
          .from("[entities]")
          .select([ENTITY]_SELECT_FIELDS)
          .eq("company_id", companyId);

        if (error) {
          Sentry.captureException(error);
          throw error;
        }
        
        return data || [];
      } catch (error) {
        Sentry.captureException(error);
        throw error;
      }
    },
    enabled: !!companyId && hasPermission('[entities]:read'),
  });
};

// ... باقي الدوال
```

---

## ✅ قائمة التحقق لكل ترحيل

- [ ] إنشاء الملف الجديد
- [ ] نسخ الدوال المطلوبة
- [ ] إضافة imports
- [ ] إضافة types
- [ ] إضافة SELECT_FIELDS constant
- [ ] إضافة التحقق من الصلاحيات
- [ ] إضافة Sentry error tracking
- [ ] استبدال `select('*')` بـ SELECT_FIELDS
- [ ] تحديث queryKeys
- [ ] تحديث الملفات المستخدمة
- [ ] حذف الدوال من useFinance.ts
- [ ] اختبار الـ hook
- [ ] commit التغييرات

---

## 📊 تتبع التقدم

| المجال | الحالة | التاريخ | الملاحظات |
|--------|--------|---------|-----------|
| **Invoices** | ✅ مكتمل | 2025-11-14 | تم التحسين والترحيل |
| **Journal Entries** | ⏳ معلق | - | يحتاج stored procedure |
| **Payments** | ⏳ معلق | - | يحتاج stored procedure |
| **Chart of Accounts** | ⏳ معلق | - | - |
| **Financial Summary** | ⏳ معلق | - | - |
| **Cost Centers** | ⏳ معلق | - | - |
| **Fixed Assets** | ⏳ معلق | - | - |
| **Bank Transactions** | ⏳ معلق | - | - |
| **Default Accounts** | ⏳ معلق | - | - |
| **Budgets** | ⏳ معلق | - | - |

---

## 🚨 تحذيرات

### ❌ لا تفعل هذا:

1. **حذف useFinance.ts قبل اكتمال الترحيل**
   - 24 ملف لا تزال تستخدمه
   - سيكسر التطبيق

2. **ترحيل جميع الدوال دفعة واحدة**
   - صعب الاختبار
   - صعب التراجع

3. **عدم الاختبار بعد كل ترحيل**
   - قد تتراكم الأخطاء

### ✅ افعل هذا:

1. **ترحيل تدريجي**
   - 3-4 دوال في المرة
   - اختبار بعد كل دفعة

2. **توثيق التغييرات**
   - تحديث هذا الملف
   - commit بعد كل دفعة

3. **الاحتفاظ بنسخة احتياطية**
   - branch منفصل للترحيل
   - سهولة التراجع

---

## 📚 المراجع

- [SECURITY_GUIDELINES.md](./SECURITY_GUIDELINES.md) - دليل الأمان
- [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) - خطة الترحيل العامة
- [useInvoices.ts](./src/hooks/finance/useInvoices.ts) - مثال مكتمل

---

**آخر تحديث**: 14 نوفمبر 2025  
**الحالة**: المرحلة 1 - 25% مكتمل (1/4 دوال)  
**التالي**: Journal Entries → Payments → Chart of Accounts
