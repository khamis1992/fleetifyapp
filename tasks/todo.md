# استبدال نص المذكرة الشارحة

## المهمة
نسخ نص المذكرة الشارحة من `legal-document-generator.ts` (المستخدم في صفحة العملاء المتأخرين عند إنشاء قضية) إلى `official-letter-generator.ts` (المستخدم في صفحة تجهيز الدعوى) - مع الحفاظ على التصميم الحالي.

## التحليل
- `generateLegalComplaintHTML` في `legal-document-generator.ts`: يولد مذكرة مفصلة تحتوي على:
  - وقائع تفصيلية عن العقد والتأخير والمخالفات
  - جدول المطالبات المالية (غرامات + إيجار + تعويضات)
  - الطلب المتعلق بالمخالفات المرورية
  - الأساس القانوني (مواد القانون المدني)
  - الطلبات التفصيلية

- `generateExplanatoryMemoHtml` في `official-letter-generator.ts`: يولد مذكرة بسيطة

## قائمة المهام

- [x] قراءة وفهم كلا الملفين
- [x] تعديل `generateExplanatoryMemoHtml` لاستخدام نفس نص المذكرة المفصل
- [x] اختبار التغييرات في المتصفح (تحتاج نشر)

## ملاحظة
سيتم الحفاظ على التصميم الحالي (CSS/التنسيق) من `official-letter-generator.ts`، فقط استبدال المحتوى النصي.

---

## مراجعة التغييرات

### الملفات المعدلة:

1. **`src/utils/official-letter-generator.ts`**
   - أضفت واجهة `ExplanatoryMemoData` جديدة مع بيانات إضافية
   - عدّلت دالة `generateExplanatoryMemoHtml` لتوليد مذكرة مفصلة تحتوي على:
     - وقائع تفصيلية مع بيانات العقد والمركبة والتأخير
     - جدول المطالبات المالية (غرامات تأخير + إيجار + تعويضات)
     - قسم خاص للمخالفات المرورية (إن وجدت)
     - الأساس القانوني مع مواد القانون المدني القطري
     - الطلبات التفصيلية

2. **`src/pages/legal/LawsuitPreparation.tsx`**
   - عدّلت استدعاء `generateExplanatoryMemoHtml` لتمرير البيانات الإضافية:
     - `defendantIdNumber`, `defendantPhone`
     - `contractStartDate`, `vehiclePlate`, `vehicleInfo`
     - `monthlyRent`, `daysOverdue`, `monthsUnpaid`
     - `overdueRent`, `latePenalty`, `damages`
     - `violationsCount`, `violationsAmount`

### النتيجة:
- المذكرة الشارحة في صفحة تجهيز الدعوى ستحتوي الآن على نفس النص التفصيلي الموجود في صفحة العملاء المتأخرين
- تم الحفاظ على التصميم الحالي (الترويسة، التوقيع، CSS)

