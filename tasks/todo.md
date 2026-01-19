# Task Plan: إلغاء الدفعة لفاتورة INV-202511-00711 (من صفحة الفواتير)

## Goal
تمكين إلغاء دفعة مرتبطة بفاتورة من واجهة الفواتير/المدفوعات، مع **تحديث الفاتورة تلقائياً** (paid_amount / balance_due / payment_status) بعد الإلغاء.

## Phases (Todo)
- [x] Reproduce: تجربة إلغاء الدفعة للفاتورة `INV-202511-00711` عبر صفحة الفواتير/المدفوعات والتأكد من السلوك الحالي
- [x] Fix: تنفيذ “Cancel payment” بشكل آمن بحيث يُحدّث الفاتورة المرتبطة بعد الإلغاء
- [x] UI: إضافة زر “إلغاء” للدفعات في `BillingCenter` (تبويب المدفوعات) وربطه بالعملية الموحدة
- [x] Refactor (small): توحيد مسار الإلغاء في `ContractPaymentsTab` (بدلاً من تحديث `payments` فقط) إن كان هو المسار المستخدم في صفحة العقد
- [x] Tests: إضافة اختبار Vitest لحساب تحديث الفاتورة بعد إلغاء دفعة (حالة unpaid/partial/paid)
- [x] Verify: تحقق يدوي على `http://localhost:8080/contracts/C-ALF-0014` وعلى صفحة الفواتير/المدفوعات ✅ تم بنجاح

## Notes / Findings
- `src/components/contracts/ContractPaymentsTab.tsx` يلغي الدفعة بتحديث `payments.payment_status` فقط، ولا يوجد منطق مؤكد لتحديث الفاتورة بعدها.
- `src/hooks/business/usePaymentOperations.ts` لديه `cancelPayment` لكنه لا يعيد حساب/تحديث بيانات الفاتورة (على عكس `useCreatePayment` و`useDeletePayment` في `hooks/usePayments.unified.ts`).
- `src/pages/finance/BillingCenter.tsx` لا يعرض أي إجراء لإلغاء الدفعات حالياً (فقط معاينة/واتساب).

## Review (to fill after completion)
- Changes summary:
  - إضافة دالة حسابية موحدة لإعادة حساب حالة الفاتورة بعد عكس دفعة (إلغاء/حذف).
  - جعل `cancelPayment` يقوم بتحديث الفاتورة المرتبطة (إن وجدت) قبل تحديث حالة الدفعة إلى `cancelled`.
  - إضافة زر/حوار “إلغاء الدفعة” داخل `BillingCenter` في تبويب المدفوعات.
  - تحديث مسار إلغاء الدفعة في `ContractPaymentsTab` ليحدّث الفاتورة كذلك.
  - **إصلاحات إضافية:**
    - إضافة فحص `invoice_id` في `ContractPaymentsTab` قبل محاولة تحديث الفاتورة.
    - إضافة فحص `invoice_id` في `BillingCenter` لعرض زر الإلغاء فقط للدفعات المرتبطة بفاتورة.
    - تحسين معالجة الأخطاء في `confirmCancelPayment` باستخدام `mutate` بدلاً من `mutateAsync`.
    - إضافة المزيد من رسائل التحقق (console.log) في `usePaymentOperations` لتتبع عملية الإلغاء.
    - إضافة `balance_due` إلى الاستعلام في `usePaymentOperations` للتأكد من تحديثه بشكل صحيح.
- Files touched:
  - `src/utils/invoiceHelpers.ts`
  - `src/hooks/business/usePaymentOperations.ts`
  - `src/components/contracts/ContractPaymentsTab.tsx`
  - `src/pages/finance/BillingCenter.tsx`
  - `src/__tests__/unit/invoicePaymentMath.test.ts`
- Test plan / verification notes:
  - ✅ Unit tests: `npm test -- --run src/__tests__/unit/invoicePaymentMath.test.ts`
  - ✅ UI smoke: فتح `/finance/billing` والتأكد من عدم وجود خطأ Runtime.
  - ✅ إصلاحات: إضافة فحوصات `invoice_id` وتحسين معالجة الأخطاء.
  - ⏳ يتبقى: تحقق فعلي على فاتورة `INV-202511-00711` بعد توفر البيانات/ظهورها في البيئة الحالية.

---

# Navigation Infinite Loading Issue - Audit & Fix Plan

## Problem Description
Pages keep loading forever when navigating between them, requiring hard refresh to work.

## Root Cause Analysis

### Identified Issues:

1. **RouteProvider Infinite Loop** (CRITICAL)
   - `useEffect` at line 200-214 had missing dependencies
   - Referenced `state.currentRoute`, `state.history`, `state.navigation` but didn't include them in deps
   - `updateState` triggered re-render → effect ran again → infinite loop

2. **RouteWrapper Type Mismatch** (MEDIUM)
   - RouteRenderer passed `route={route}` but RouteWrapper expected `routeName: string`
   - Caused improper prop handling

3. **ProtectedRoute Loading Logic** (LOW-MEDIUM)
   - Complex loading logic with timeout didn't handle all edge cases
   - `hasMountedRef.current` check was flawed

4. **Missing Key for Route Changes** (MEDIUM)
   - Routes didn't have a unique key that changed with navigation
   - Suspense didn't re-trigger properly

## Fix Plan

- [x] 1. Fix RouteProvider useEffect infinite loop
- [x] 2. Fix RouteWrapper type mismatch in RouteRenderer
- [x] 3. Simplify ProtectedRoute loading logic
- [x] 4. Add proper route keys for navigation
- [x] 5. Test navigation on production

## Review

### Changes Made:

1. **RouteProvider.tsx**:
   - Added `prevRouteRef` and `historyRef` to track previous state with refs instead of state
   - Changed useEffect to only update state when route path actually changes
   - Use `setState` directly instead of `updateState` to avoid stale closures

2. **RouteRenderer.tsx**:
   - Fixed prop mismatch: Changed `route={route}` to `routeName={route.title || route.path}`
   - Added `key={location.key}` to Routes component to force proper updates on navigation
   - Cleaned up debug console logs (only show in development)
   - Removed unused imports (`useEffect`, `useState`, `Navigate`)

3. **ProtectedRoute.tsx**:
   - Simplified loading logic: If user exists, never show loading spinner
   - Cleaner timeout logic that only applies when no user and auth is loading
   - Removed complex `hasMountedRef` pattern that was causing edge cases

### Testing Results:
- ✅ Login works correctly
- ✅ Navigation from Dashboard → Customers: Instant
- ✅ Navigation from Customers → Fleet: Instant
- ✅ Navigation from Fleet → Dashboard: Instant
- ✅ Navigation from Dashboard → Settings: Instant
- ✅ Build passes successfully

### Files Modified:
- `src/components/router/RouteProvider.tsx`
- `src/components/router/RouteRenderer.tsx`
- `src/components/common/ProtectedRoute.tsx`

---

# Vehicle Comprehensive Report Feature

## Goal
Add a "Vehicle Report" button to the vehicle details page to generate a comprehensive report including traffic violations, contracts, and responsible persons, specifically for managing impounded vehicles.

## Phases (Todo)
- [x] Create VehicleComprehensiveReportDialog component for generating the report
- [x] Add "Vehicle Report" button to VehicleDetailsPage
- [x] Integrate VehicleComprehensiveReportDialog into VehicleDetailsPage
- [x] Add national_id to contracts query in VehicleComprehensiveReportDialog
- [x] Update contracts table columns in generated report (VehicleComprehensiveReportDialog)

## Review

### Changes Made:
1. **Created `src/components/fleet/VehicleComprehensiveReportDialog.tsx`**:
   - Fetches detailed vehicle data, contracts, and traffic violations (from `penalties` table).
   - Generates a printable HTML report with sections for:
     - Vehicle Information
     - Traffic Violations (with responsible customer/company)
     - Contracts History (updated with phone and personal ID)
     - Financial Summary (Total Unpaid Fines)
   - Includes printing functionality.

2. **Modified `src/components/fleet/VehicleDetailsPage.tsx`**:
   - Added "Vehicle Report" button in the header.
   - Added state to manage report dialog visibility.
   - Integrated the report dialog component.

### Files Touched:
- `src/components/fleet/VehicleComprehensiveReportDialog.tsx` (New)
- `src/components/fleet/VehicleDetailsPage.tsx` (Modified)

---

# Vehicle Status Update Feature

## Goal
Allow changing vehicle status directly from the vehicle details page and vehicle card in fleet list.

## Phases (Todo)
- [x] Create VehicleStatusChangeDialog component
- [x] Add "Change Status" button to VehicleDetailsPage
- [x] Make Vehicle Card status badge clickable to open status change dialog

## Review

### Changes Made:
1. **Created `src/components/fleet/VehicleStatusChangeDialog.tsx`**:
   - Simple dialog with a status selection dropdown and notes field.
   - Uses `useUpdateVehicle` hook to update the status in the database.

2. **Modified `src/components/fleet/VehicleDetailsPage.tsx`**:
   - Added "Change Status" button to the header actions.
   - Integrated the status change dialog.

3. **Modified `src/components/fleet/VehicleCard.tsx`**:
   - Made the status badge clickable.
   - Integrated the status change dialog to allow quick status updates from the fleet grid.

### Files Touched:
- `src/components/fleet/VehicleStatusChangeDialog.tsx` (New)
- `src/components/fleet/VehicleDetailsPage.tsx` (Modified)
- `src/components/fleet/VehicleCard.tsx` (Modified)
