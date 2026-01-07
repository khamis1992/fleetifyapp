# إصلاح مشكلة تطبيق الجوال - البيانات تظهر كـ 0

## المشكلة
بعد تسجيل الدخول في تطبيق الجوال (APK)، جميع المعلومات تظهر كـ 0.
نفس المشكلة موجودة في التطبيق الرئيسي.

## السبب
في عدة ملفات يتم استخدام:
```javascript
const companyId = user?.user_metadata?.company_id || '';
// أو
company_id_param: (await supabase.auth.getUser()).data.user?.user_metadata?.company_id
```
هذا خطأ! الـ `company_id` الصحيح موجود في `user.profile.company_id` أو `user.company.id`.

## المهام

- [x] إصلاح صفحات Mobile:
  - [x] `MobileHome.tsx` - تم إصلاح واستبدال `gray-*` بـ `slate-*`
  - [x] `MobileContractWizard.tsx` - تم إصلاح واستبدال `gray-*` بـ `slate-*`
  - [x] `MobileOverdue.tsx` - تم إصلاح واستبدال الألوان
  - [x] `MobileCars.tsx` - تم إصلاح
  - [x] `MobileContracts.tsx` - تم إصلاح واستبدال `gray-*` بـ `slate-*`
- [x] إصلاح الملفات الأخرى:
  - [x] `useEnhancedCustomerFinancials.ts` - 4 دوال
  - [x] `MaintenanceForm.tsx`
  - [x] `FinancialAlertsSystem.tsx`
  - [x] `AdvancedFinancialReports.tsx`
  - [x] `LegalCasesTrackingV2Final.tsx`

## الملفات المعدلة

### صفحات Mobile (5 ملفات)
1. `src/pages/mobile/MobileHome.tsx`
2. `src/pages/mobile/MobileContractWizard.tsx`
3. `src/pages/mobile/MobileOverdue.tsx`
4. `src/pages/mobile/MobileCars.tsx`
5. `src/pages/mobile/MobileContracts.tsx`

### ملفات أخرى (5 ملفات)
1. `src/hooks/useEnhancedCustomerFinancials.ts`
2. `src/components/fleet/MaintenanceForm.tsx`
3. `src/components/finance/FinancialAlertsSystem.tsx`
4. `src/components/finance/AdvancedFinancialReports.tsx`
5. `src/pages/legal/LegalCasesTrackingV2Final.tsx`

## التغييرات

**من:**
```javascript
const companyId = user?.user_metadata?.company_id || '';
// أو
company_id_param: (await supabase.auth.getUser()).data.user?.user_metadata?.company_id
```

**إلى:**
```javascript
const companyId = user?.profile?.company_id || user?.company?.id || '';
```

## الخطوات القادمة
لإعادة بناء التطبيق:
```bash
npm run build:ci
npm run build:mobile
npm run mobile:sync
npm run android:build
```

## المراجعة
تم إصلاح 10 ملفات في المجموع. جميع التعديلات تستخدم المصدر الصحيح لـ `company_id`.
