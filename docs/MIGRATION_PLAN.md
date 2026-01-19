# 🔄 خطة الترحيل التدريجي للـ Hooks القديمة

**التاريخ**: 14 نوفمبر 2025  
**الهدف**: ترحيل جميع الـ hooks من استخدام Supabase مباشرة إلى استخدام طبقة الخدمة

---

## 📊 الوضع الحالي

| المقياس | العدد |
|---------|-------|
| Hooks تستخدم Supabase مباشرة | 180 |
| Hooks تستخدم Services | 2 |
| Hooks تستخدم useFinance القديم | 24 |

---

## 🎯 الأهداف

1. ✅ ترحيل جميع الـ hooks لاستخدام Services
2. ✅ حذف `useFinance.ts` الضخم
3. ✅ توحيد طريقة الوصول للبيانات
4. ✅ تحسين الأمان والصلاحيات

---

## 📋 خطة الترحيل (3 مراحل)

### المرحلة 1: الـ Hooks الحرجة (أولوية عالية) 🔴

**الهدف**: ترحيل الـ hooks المستخدمة في العمليات الحرجة

**القائمة**:
1. `useContracts` - ✅ تم (يستخدم contractService)
2. `usePayments` - ✅ تم (يستخدم paymentService)
3. `useInvoices` - ⚠️ يوجد نسختان
4. `useFinance` - ❌ يحتاج تقسيم

**الإجراءات**:
- [x] إنشاء Stored Procedures للعمليات الحرجة
- [ ] حذف النسخة القديمة من `useInvoices`
- [ ] تقسيم `useFinance` إلى hooks منفصلة
- [ ] تحديث جميع الصفحات لاستخدام النسخ الجديدة

**الوقت المقدر**: 4-6 ساعات

---

### المرحلة 2: الـ Hooks المتوسطة (أولوية متوسطة) 🟡

**الهدف**: ترحيل الـ hooks المستخدمة بشكل متكرر

**القائمة**:
1. `useCustomers`
2. `useVehicles`
3. `useDrivers`
4. `useMaintenanceRecords`
5. `useFuelRecords`

**الإجراءات**:
- [ ] إنشاء Services لكل مجال
- [ ] تحديث الـ hooks لاستخدام Services
- [ ] إضافة التحقق من الصلاحيات
- [ ] إضافة unit tests

**الوقت المقدر**: 6-8 ساعات

---

### المرحلة 3: الـ Hooks المتبقية (أولوية منخفضة) 🟢

**الهدف**: ترحيل باقي الـ hooks

**القائمة**:
- جميع الـ hooks المتبقية (~150 hook)

**الإجراءات**:
- [ ] تصنيف الـ hooks حسب المجال
- [ ] إنشاء Services للمجالات المفقودة
- [ ] ترحيل تدريجي (10-15 hook في المرة)
- [ ] اختبار شامل بعد كل دفعة

**الوقت المقدر**: 15-20 ساعة

---

## 🔧 الأدوات المساعدة

### 1. Script للبحث عن الـ Hooks القديمة

```bash
#!/bin/bash
# find-old-hooks.sh

echo "Searching for hooks using Supabase directly..."
grep -r "from '@/integrations/supabase" src/hooks/ | wc -l

echo "\nSearching for hooks using useFinance..."
grep -r "from.*useFinance" src/ | wc -l

echo "\nSearching for hooks using Services..."
grep -r "from '@/services'" src/hooks/ | wc -l
```

### 2. Template للـ Hook الجديد

```typescript
// Template: src/hooks/data/useExample.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { usePermissions } from '@/hooks/usePermissions';
import { exampleService } from '@/services';

export function useExamples(filters?: ExampleFilters) {
  const { companyId } = useUnifiedCompanyAccess();
  const { hasPermission } = usePermissions();
  
  return useQuery({
    queryKey: ['examples', companyId, filters],
    queryFn: async () => {
      if (!hasPermission('examples:read')) {
        throw new Error('No permission');
      }
      return exampleService.findAll(companyId, filters);
    },
    enabled: !!companyId && hasPermission('examples:read'),
  });
}

export function useCreateExample() {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();
  const { hasPermission } = usePermissions();
  
  return useMutation({
    mutationFn: async (data: CreateExampleData) => {
      if (!hasPermission('examples:create')) {
        throw new Error('No permission');
      }
      return exampleService.create(data, companyId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examples'] });
    },
  });
}
```

---

## ✅ قائمة التحقق لكل Hook

عند ترحيل hook، تأكد من:

- [ ] استخدام `useUnifiedCompanyAccess` للحصول على `companyId`
- [ ] استخدام `usePermissions` للتحقق من الصلاحيات
- [ ] استخدام Service بدلاً من Supabase مباشرة
- [ ] إضافة `enabled` condition في useQuery
- [ ] إضافة `invalidateQueries` في useMutation
- [ ] معالجة الأخطاء بشكل صحيح
- [ ] إضافة types للبيانات
- [ ] تحديث جميع الصفحات المستخدمة
- [ ] اختبار الـ hook
- [ ] توثيق التغييرات

---

## 📝 سجل الترحيل

### تم الترحيل ✅

| Hook | التاريخ | الملاحظات |
|------|---------|-----------|
| `useContracts` | 2025-11-14 | يستخدم contractService |
| `usePayments` | 2025-11-14 | يستخدم paymentService |

### قيد الترحيل ⚠️

| Hook | الحالة | الملاحظات |
|------|--------|-----------|
| `useInvoices` | 50% | يوجد نسختان |
| `useFinance` | 0% | يحتاج تقسيم |

### لم يتم الترحيل ❌

| Hook | الأولوية | الملاحظات |
|------|----------|-----------|
| ~180 hook | متفاوتة | انظر المراحل أعلاه |

---

## 🚨 تحذيرات

### ❌ لا تفعل هذا:

1. **حذف الـ hooks القديمة مباشرة**
   - قد يكسر التطبيق
   - تحقق من الاستخدام أولاً

2. **ترحيل الكل دفعة واحدة**
   - صعب الاختبار
   - صعب التراجع عند الخطأ

3. **عدم الاختبار بعد كل ترحيل**
   - قد تتراكم الأخطاء
   - صعب تحديد مصدر الخطأ

### ✅ افعل هذا:

1. **ترحيل تدريجي**
   - 5-10 hooks في المرة
   - اختبار بعد كل دفعة

2. **توثيق التغييرات**
   - سجل ما تم ترحيله
   - سجل المشاكل المواجهة

3. **الاحتفاظ بنسخة احتياطية**
   - commit بعد كل دفعة
   - سهولة التراجع عند الحاجة

---

## 📚 المراجع

- [SECURITY_GUIDELINES.md](./SECURITY_GUIDELINES.md) - دليل الأمان
- [Services Documentation](./src/services/README.md) - توثيق الخدمات
- [Hooks Best Practices](./docs/hooks-best-practices.md) - أفضل الممارسات

---

**آخر تحديث**: 14 نوفمبر 2025  
**الحالة**: المرحلة 1 - قيد التنفيذ
