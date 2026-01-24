# إضافة ميزة إرسال مهمة تدقيق بيانات العميل للموظف

## المهام التقنية

- [x] إنشاء جدول `customer_verification_tasks` في قاعدة البيانات
- [x] إضافة زر "إرسال للتدقيق" في DelinquentCustomersTab
- [x] إنشاء مكون SendVerificationTaskDialog لاختيار الموظف
- [x] إنشاء صفحة CustomerVerificationPage للتدقيق
- [x] إضافة بادج "تم التدقيق" في بطاقة العميل
- [x] إضافة مسار الصفحة في الراوتر
- [x] إنشاء hook للتحقق من حالة التدقيق
- [x] إضافة تبويب "مهام التدقيق" في صفحة إدارة المهام
- [x] إضافة تنبيه للموظف عند استلام مهمة تدقيق
- [x] جعل تنبيهات التدقيق تبقى ظاهرة حتى إكمال المهمة

## ملخص التغييرات

### 1. قاعدة البيانات
**ملف:** `supabase/migrations/20260124000001_create_verification_tasks.sql`
- إنشاء جدول `customer_verification_tasks` مع الحقول:
  - معرفات العميل والعقد والموظفين
  - حالة المهمة (pending, in_progress, verified, rejected)
  - تاريخ واسم المدقق
  - ملاحظات
- إضافة فهارس للبحث السريع
- تفعيل RLS مع سياسات الأمان

### 2. زر إرسال للتدقيق
**ملف:** `src/components/legal/DelinquentCustomersTab.tsx`
- إضافة زر "إرسال للتدقيق" في شريط الإجراءات الجماعية
- يظهر عند تحديد عملاء
- يفتح نافذة اختيار الموظف

### 3. نافذة إرسال المهمة
**ملف:** `src/components/legal/SendVerificationTaskDialog.tsx`
- نافذة لاختيار الموظف المكلف بالتدقيق
- عرض العملاء المحددين
- إضافة ملاحظات للموظف
- إرسال المهمة لقاعدة البيانات

### 4. صفحة التدقيق للموظف
**ملف:** `src/pages/legal/CustomerVerificationPage.tsx`
- بطاقة بيانات العميل قابلة للتعديل:
  - الاسم
  - الرقم الشخصي (الهوية)
  - رقم الجوال
  - قيمة الإيجار الشهري
- جدول الفواتير غير المدفوعة مع:
  - عرض تفاصيل كل فاتورة
  - زر تسجيل دفعة لكل فاتورة
- زر "جاهز لرفع دعوى" للتأكيد
- المسار: `/legal/verify/:taskId`

### 5. بادج التدقيق في بطاقة العميل
**ملف:** `src/components/legal/DelinquentCustomersTab.tsx`
- بادج أخضر "تم التدقيق من: [اسم الموظف]" للعملاء المدققين
- بادج برتقالي "قيد التدقيق" للمهام الجارية
- تمييز البطاقة بلون أخضر للعملاء المدققين

### 6. مسار الصفحة
**ملف:** `src/routes/index.ts`
- إضافة مسار `/legal/verify/:taskId`
- ربطه بصفحة CustomerVerificationPage

### 7. Hook للتحقق من حالة التدقيق
**ملف:** `src/hooks/useVerificationTasks.ts`
- `useVerificationStatuses`: للحصول على حالة التدقيق لعدة عقود
- `useMyVerificationTasks`: للحصول على مهام التدقيق المكلف بها الموظف الحالي

### 8. تبويب مهام التدقيق في صفحة إدارة المهام
**ملفات:**
- `src/pages/tasks/TasksPage.tsx`: إضافة تبويب "مهام التدقيق"
- `src/components/tasks/VerificationTasksList.tsx`: مكون عرض مهام التدقيق
- عرض المهام المعلقة والقيد التدقيق
- بطاقة تفصيلية لكل مهمة تحتوي:
  - اسم العميل
  - رقم العقد
  - رقم الهاتف
  - اسم المرسل
  - تاريخ الإرسال
  - الملاحظات
- زر "فتح" للانتقال لصفحة التدقيق

### 9. تنبيهات استلام مهام التدقيق
**ملفات:**
- `src/components/legal/SendVerificationTaskDialog.tsx`: إنشاء التنبيهات
- `src/components/notifications/NotificationsList.tsx`: عرض التنبيهات بشكل مميز
- `src/hooks/useNotifications.ts`: استثناء تنبيهات التدقيق من "وضع علامة مقروء على الكل"
- `src/pages/legal/CustomerVerificationPage.tsx`: وضع علامة مقروء عند إكمال المهمة

**المميزات:**
- عند إرسال مهمة تدقيق يتم إنشاء تنبيه لكل موظف مكلف
- التنبيه يظهر بلون برتقالي مميز مع بادج "مهمة معلقة"
- لا يمكن وضع علامة مقروء على تنبيهات التدقيق يدوياً
- لا تتأثر بزر "وضع علامة مقروء على الكل"
- يتم وضع علامة مقروء تلقائياً عند إكمال المهمة
- زر "فتح المهمة" للانتقال مباشرة لصفحة التدقيق

## ملاحظات للتشغيل

1. **تطبيق Migration:**
   ```bash
   npx supabase db push
   ```
   أو تطبيق الـ SQL يدوياً في Supabase Dashboard

2. **تجربة الميزة:**
   - اذهب لصفحة إدارة المتعثرات المالية
   - حدد عميل أو أكثر
   - اضغط "إرسال للتدقيق"
   - اختر الموظف/الموظفين وأرسل المهمة
   - الموظف يجد المهمة في صفحة **إدارة المهام** > تبويب **"مهام التدقيق"**
   - يضغط على المهمة للانتقال لصفحة التدقيق

## Fix: Phone Number Visibility in Send Verification Task Dialog

**Date:** 2026-01-24

### Issue
WhatsApp numbers for some employees (e.g., Tarek) were not showing up in the "Send Audit Task" dialog, even though they exist in the system.
- Cause: The dialog was only querying the `profiles` table. Some users have their phone number stored in the `employees` table (HR record) but not in their user `profile`.

### Changes
**File:** `src/components/legal/SendVerificationTaskDialog.tsx`
- Modified the data fetching logic to query both `profiles` and `employees` tables.
- Merged the data: if a profile has no phone number, it falls back to the phone number found in the `employees` table for the corresponding `user_id`.
- This ensures that all employees with a phone number in the HR system will display the WhatsApp icon and receive messages.

## Fix: Dashboard Showing Old Design

**Date:** 2026-01-24

### Issue
The user reported that the "Old Design" of the dashboard was sometimes appearing when refreshing the page.
- Cause: The file `src/pages/dashboards/CarRentalDashboard.tsx` was still importing the old `BentoDashboard` component (`src/components/dashboard/bento/BentoDashboard.tsx`) instead of the new `BentoDashboardRedesigned` component. This meant that if the user landed on any route using `CarRentalDashboard`, they would see the old design.

### Changes
1.  **Updated `CarRentalDashboard.tsx`:** Changed the import to use `BentoDashboardRedesigned` directly.
    - **File:** `src/pages/dashboards/CarRentalDashboard.tsx`
2.  **Renamed Old Component:** Renamed the old `BentoDashboard.tsx` to `BentoDashboard.legacy.tsx` to preserve it but prevent accidental usage.
    - **File:** `src/components/dashboard/bento/BentoDashboard.legacy.tsx`
3.  **Created Wrapper:** Created a new `BentoDashboard.tsx` that re-exports `BentoDashboardRedesigned`.
    - **File:** `src/components/dashboard/bento/BentoDashboard.tsx`
    - This ensures that any other part of the system trying to import `BentoDashboard` will automatically get the new Redesigned version.

This guarantees that the old design will no longer appear to the user.
