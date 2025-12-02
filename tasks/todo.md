# Task: إضافة خيار تحويل العقد إلى الشؤون القانونية

## Objective
إضافة زر "تحويل للشؤون القانونية" في صفحة تفاصيل العقد ✅

## Acceptance Criteria
- [x] زر "تحويل للشؤون القانونية" يظهر في صفحة تفاصيل العقد (للعقود النشطة فقط)
- [x] عند الضغط على الزر يفتح Dialog للتأكيد وإضافة ملاحظات
- [x] يتم إنشاء قضية قانونية جديدة مع البيانات التالية:
  - اسم العميل ورقم الهاتف والبريد الإلكتروني
  - قيمة القضية = المبلغ المتبقي + غرامات التأخير + المخالفات المرورية
  - نوع القضية = payment_collection
  - ربط القضية بالعقد (contract_id)
- [x] تحديث حالة العقد إلى under_legal_procedure
- [x] تحديث حالة المركبة إلى available
- [x] تسجيل العملية في سجل العمليات (contract_operations_log)
- [x] إظهار رسالة نجاح مع رابط للقضية الجديدة

## Steps Completed
- [x] 1. إضافة عمود contract_id لجدول legal_cases (migration)
- [x] 2. إضافة حالة under_legal_procedure للعقود
- [x] 3. إنشاء مكون ConvertToLegalDialog
- [x] 4. إضافة زر التحويل في ContractDetailsPage
- [x] 5. إنشاء hook للتحويل (useConvertToLegal)
- [x] 6. تحديث ContractStatusBadge للحالة الجديدة
- [x] 7. تحديث ContractStatusManagement للحالة الجديدة

## الملفات المعدلة/المنشأة
1. `src/hooks/useConvertToLegal.ts` - **جديد** - Hook للتحويل
2. `src/components/contracts/ConvertToLegalDialog.tsx` - **جديد** - مكون Dialog التحويل
3. `src/components/contracts/ContractStatusBadge.tsx` - إضافة حالة under_legal_procedure
4. `src/components/contracts/ContractStatusManagement.tsx` - إضافة الحالة الجديدة
5. `src/components/contracts/ContractDetailsPage.tsx` - إضافة زر وDialog التحويل
6. `src/hooks/useLegalCases.ts` - إضافة contract_id للـ interface
7. قاعدة البيانات: migration لإضافة عمود contract_id

## المميزات المنفذة
✅ ربط ثنائي الاتجاه (القضية مرتبطة بالعقد)
✅ حساب قيمة القضية تلقائياً (المتبقي + غرامات + مخالفات)
✅ تسجيل تفصيلي للعملية
✅ منع التحويل المتكرر (التحقق من وجود قضية مفتوحة)
✅ إمكانية التراجع (useRevertFromLegal)

## Review
**تم الانتهاء بنجاح ✓**

الميزة جاهزة للاستخدام. عند الضغط على زر "تحويل للشؤون القانونية":
1. يظهر Dialog يعرض ملخص المبالغ المستحقة
2. يمكن اختيار نوع القضية والأولوية وإضافة ملاحظات
3. يتم التأكيد مرة أخرى قبل التنفيذ
4. يتم إنشاء القضية وتحديث العقد والمركبة
5. يظهر toast بنجاح العملية مع رابط للقضية
