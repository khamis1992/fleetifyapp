# إصلاح مشكلة عدم ظهور المستندات في كشف المستندات المرفوعة

## المشكلة
في صفحة تجهيز الدعوى (`LawsuitPreparation.tsx`)، عند توليد "كشف المستندات المرفوعة"، لا يظهر:
1. المذكرة الشارحة
2. كشف المطالبات المالية

## السبب
- دالة `generateDocumentsList` تعتمد على `memoUrl` و `claimsStatementUrl` من الـ closure
- عند استدعاء `generateAllDocuments`، يتم توليد المستندات بالتتابع مع تأخير 800ms
- لكن React state updates غير متزامنة، فعندما يتم استدعاء `generateDocumentsList`، قيم الـ state قد لا تكون محدثة بعد

## الحل
- إضافة refs لتتبع أحدث قيم لـ `memoUrl` و `claimsStatementUrl`
- تحديث الـ refs مباشرة عند إنشاء المستندات
- تعديل `generateDocumentsList` لاستخدام الـ refs

## المهام
- [x] تحليل المشكلة وتحديد السبب
- [x] إضافة ref لتتبع أحدث قيمة لـ claimsStatementUrl
- [x] إضافة ref لتتبع أحدث قيمة لـ memoUrl
- [x] تعديل generateClaimsStatement لتحديث الـ ref مباشرة
- [x] تعديل generateExplanatoryMemo لتحديث الـ ref مباشرة
- [x] تعديل generateDocumentsList لاستخدام الـ refs

## ملخص التغييرات

### الملف: `src/pages/legal/LawsuitPreparation.tsx`

1. **إضافة `useRef` للـ imports**
2. **إضافة refs جديدة**: `memoUrlRef` و `claimsStatementUrlRef`
3. **إضافة useEffects** لمزامنة الـ refs مع الـ state
4. **تعديل `generateExplanatoryMemo`**: تحديث الـ ref مباشرة عند إنشاء blob URL
5. **تعديل `generateClaimsStatement`**: تحديث الـ ref مباشرة عند إنشاء blob URL
6. **تعديل `generateDocumentsList`**: استخدام `memoUrlRef.current` و `claimsStatementUrlRef.current` للحصول على أحدث القيم

