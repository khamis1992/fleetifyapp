# إصلاح عرض أسماء العملاء في صفحة التقاضي

## المشكلة
كانت أسماء العملاء في صفحة التقاضي (`/legal/delinquency`) تُعرض بطريقة مختلفة عن صفحة تفاصيل العميل، مما يسبب عدم تطابق في الأسماء.

## السبب
كانت بعض المكونات تستخدم طرقاً مختلفة لتنسيق أسماء العملاء:
- بعضها يستخدم `first_name + last_name`
- بعضها يستخدم `first_name_ar + last_name_ar`
- بدلاً من استخدام الدالة الموحدة `formatCustomerName`

## الحل
تم توحيد جميع المكونات لاستخدام دالة `formatCustomerName` من `@/utils/formatCustomerName`

### الملفات المعدلة
1. ✅ `src/pages/legal/LawsuitPreparation/components/Header/CaseSummary.tsx`
2. ✅ `src/pages/legal/LawsuitPreparation/components/LegalOverview.tsx`
3. ✅ `src/pages/legal/LawsuitPreparation/components/Header/QuickStats.tsx`

### قواعد `formatCustomerName`
الدالة تتبع القواعد التالية:

#### للشركات (`customer_type: 'corporate'` أو `'company'`):
1. الأولوية للاسم العربي: `company_name_ar`
2. ثم الاسم الإنجليزي: `company_name`
3. Fallback: `full_name` أو "شركة بدون اسم"

#### للأفراد (`customer_type: 'individual'` أو غير محدد):
1. الأولوية للاسم الإنجليزي: `first_name + last_name`
2. ثم الاسم العربي: `first_name_ar + last_name_ar`
3. Fallback: `full_name` أو "عميل بدون اسم"

## النتيجة
الآن جميع الصفحات تعرض اسم العميل بنفس الطريقة:
- ✅ صفحة تفاصيل العميل
- ✅ صفحة التقاضي (ملخص القضية)
- ✅ صفحة التقاضي (النظرة العامة)
- ✅ صفحة التقاضي (الإحصائيات السريعة)
- ✅ المستندات المولدة (المذكرة الشارحة، إلخ)

## الاختبار
للتحقق من التغييرات:
1. افتح صفحة تفاصيل العميل: `/customers/:id`
2. لاحظ اسم العميل المعروض
3. افتح صفحة التقاضي لنفس العميل: `/legal/delinquency?contract=:contractId`
4. تأكد من أن الاسم متطابق في جميع الأماكن

## ملاحظات
- الدالة `formatCustomerName` موجودة في `src/utils/formatCustomerName.ts`
- يتم استخدامها في أكثر من 50 مكاناً في النظام
- أي تعديل على منطق عرض الأسماء يجب أن يتم في هذه الدالة فقط
