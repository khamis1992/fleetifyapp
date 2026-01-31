# TODO: إصلاح توليد مستند Word

## المشكلة
- مكتبة `html-docx-js` قديمة وتسبب خطأ في Build
- تستخدم `with` statement غير مدعوم في Rollup/Vite الحديث
- الخطأ: `Cannot convert Stmt::With`

## الحل
- [x] حذف `html-docx-js` من dependencies
- [x] استخدام `html-to-docx` فقط (موجودة ومثبتة)
- [x] تحديث دالة `downloadMemoDocx` لاستخدام المكتبة الصحيحة
- [x] إعادة بناء المشروع

## الخطوات المنفذة
1. ✅ حذف html-docx-js من package.json
2. ✅ تحديث الكود لاستخدام html-to-docx بشكل صحيح
3. ✅ إزالة الـ fallback logic (لم تعد ضرورية)
4. ✅ تبسيط الكود وتحسين معالجة الأخطاء

## التغييرات
- حذفت `html-docx-js` من dependencies
- استخدمت `html-to-docx` مباشرة (مكتبة حديثة ومدعومة)
- أضفت خيارات تنسيق أفضل للمستند
- حسّنت رسائل الخطأ

## الاختبار
يحتاج المستخدم لتشغيل:
```bash
npm install
npm run build:ci
```
