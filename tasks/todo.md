# تحديث خط المستندات القانونية

## الهدف
تحديث نوع الخط في جميع المستندات التي يتم توليدها في صفحة تجهيز الدعوى القضائية ليصبح `Times New Roman (Headings CS)`.

## الخطة

- [x] 1. تحديد ملفات توليد المستندات.
- [x] 2. تحديث `src/utils/legal-document-generator.ts` لاستخدام الخط المطلوب.
- [x] 3. تحديث `src/utils/official-letters/styles.ts` (المستخدم في الكتب الرسمية الموحدة) لاستخدام الخط المطلوب.
- [x] 4. تحديث `src/utils/official-letters/claims-statement.ts` (قسم الفاتورة الفعلية) لاستخدام الخط المطلوب.
- [x] 5. مراجعة التغييرات والتأكد من شمولية التحديث.

## المراجعة

### الملفات المعدلة
- `src/utils/legal-document-generator.ts`: تم تحديث `font-family` في دالة `generateLegalComplaintHTML`.
- `src/utils/official-letters/styles.ts`: تم تحديث `font-family` في `getOfficialLetterStyles` التي تستخدمها معظم الكتب الرسمية.
- `src/utils/official-letters/claims-statement.ts`: تم تحديث `font-family` في دالة `generateActualInvoice`.

### ملخص التغييرات
تم تغيير نوع الخط (font-family) في جميع القوالب المذكورة ليصبح:
`font-family: 'Times New Roman (Headings CS)', 'Times New Roman', serif;`

هذا يضمن ظهور الخط المطلوب عند طباعة المستندات أو عرضها، مع وجود خطوط بديلة (Times New Roman, serif) للأمان.
