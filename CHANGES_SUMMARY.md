# ملخص التغييرات - توحيد توليد المستندات

## المشكلة الأساسية
عند تحميل المستندات من صفحة `/legal/delinquency`، كانت المستندات **مختلفة** عن المستندات المولدة في صفحة `/legal/lawsuit/prepare/[id]`

## السبب الجذري
ملف `src/utils/bulkDocumentGenerator.ts` كان يستخدم:
1. جدول قاعدة بيانات خاطئ: `penalties` بدلاً من `traffic_violations`
2. أسماء حقول خاطئة للمخالفات
3. منطق حساب مختلف للمبالغ

---

## التغييرات المطبقة

### 1️⃣ ملف: `src/utils/bulkDocumentGenerator.ts`

#### أ) تصحيح جدول قاعدة البيانات (السطر 323)
```typescript
// قبل:
.from('penalties')
.neq('payment_status', 'paid')

// بعد:
.from('traffic_violations')
.neq('status', 'paid')
.order('violation_date', { ascending: false })
```

#### ب) توحيد منطق حساب المبالغ (السطور 384-412)
```typescript
// قبل:
const totalOverdue = unpaidInvoices.reduce(...)
const violationsTotal = violations.reduce((sum, v) => sum + Number(v.amount), 0)
const grandTotal = totalOverdue + violationsTotal

// بعد:
// حساب غرامات التأخير لكل فاتورة (120 ريال/يوم، حد أقصى 3000)
const invoicesWithPenalties = unpaidInvoices.map(inv => {
  const daysLate = Math.max(0, Math.floor(...))
  const penalty = remaining > 0 ? Math.min(daysLate * 120, 3000) : 0
  return { ...inv, daysLate, penalty, remaining }
})

const totalOverdue = invoicesWithPenalties.reduce((sum, inv) => sum + inv.remaining, 0)
const totalPenalties = invoicesWithPenalties.reduce((sum, inv) => sum + inv.penalty, 0)
const violationsTotal = violations.reduce((sum, v) => sum + (Number(v.total_amount) || Number(v.fine_amount) || 0), 0)
const damagesFee = 10000 // رسوم الأضرار الثابتة

const claimAmount = totalOverdue + totalPenalties + damagesFee
const grandTotal = claimAmount + violationsTotal
```

#### ج) تصحيح أسماء حقول المخالفات (السطور 506-514، 659-666، 737-745)
```typescript
// قبل:
violationNumber: v.penalty_number || v.violation_number
violationDate: v.penalty_date
fineAmount: Number(v.amount)

// بعد:
violationNumber: v.violation_number
violationDate: v.violation_date
fineAmount: Number(v.total_amount) || Number(v.fine_amount)
```

#### د) تصحيح حقل monthly_rent (السطور 432، 458)
```typescript
// قبل:
monthly_rent: Number(contract.monthly_rent) || 0

// بعد:
monthly_rent: Number(contract.monthly_amount) || 0
```

#### هـ) إضافة كشف المستندات في الترتيب الصحيح (السطور 527-574)
نقلت قسم "كشف المستندات" ليُنشأ **قبل** باقي المستندات وحذفت النسخة المكررة

#### و) تصحيح بيانات بلاغ سرقة المركبة (السطور 691-717)
أضفت جميع الحقول المطلوبة مثل:
- `customerNationality`
- `plateType`
- `manufactureYear`
- `chassisNumber`

#### ز) إصلاح توليد ملف ZIP (السطور 962-969)
```typescript
// قبل:
return await zip.generateAsync({ type: 'blob' })

// بعد:
return await zip.generateAsync({ 
  type: 'blob',
  compression: 'DEFLATE',
  compressionOptions: { level: 6 },
  mimeType: 'application/zip'  // ← مهم جداً!
})
```

#### ح) إصلاح دالة downloadZipFile (السطور 976-994)
```typescript
// قبل:
const url = URL.createObjectURL(blob)
link.download = filename

// بعد:
if (!filename.endsWith('.zip')) filename = filename + '.zip'
const zipBlob = new Blob([blob], { type: 'application/zip' })
const url = URL.createObjectURL(zipBlob)
link.setAttribute('type', 'application/zip')
```

---

### 2️⃣ ملف: `package.json`

#### حذف المكتبة القديمة
```json
// قبل:
"html-docx-js": "^0.3.1",
"html-to-docx": "^1.8.0",

// بعد:
"html-to-docx": "^1.8.0",
```

---

### 3️⃣ ملف: `src/pages/legal/LawsuitPreparation/store/LawsuitPreparationContext.tsx`

#### تحديث دالة downloadMemoDocx (السطور 820-885)
```typescript
// قبل:
const htmlDocx = (await import('html-docx-js')).default
const docxBlob = htmlDocx.asBlob(completeHtml, {...})

// بعد:
const { default: HTMLtoDOCX } = await import('html-to-docx')
const fileBuffer = await HTMLtoDOCX(completeHtml, null, {...})
const docxBlob = new Blob([fileBuffer], { type: '...' })
```

---

## النتيجة النهائية

### المبالغ الموحدة:
- الإيجار المتأخر: **48,300 ر.ق**
- غرامات التأخير: **69,000 ر.ق** (120 ريال/يوم، حد أقصى 3000)
- رسوم الأضرار: **10,000 ر.ق** (ثابتة)
- المخالفات المرورية: **9,000 ر.ق** (21 مخالفة)
- **إجمالي المطالبة: 136,300 ر.ق**

### المستندات الموحدة:
1. ✅ المذكرة الشارحة (HTML + DOCX)
2. ✅ كشف المطالبات المالية
3. ✅ كشف المستندات المرفوعة
4. ✅ كشف المخالفات المرورية
5. ✅ بلاغ سرقة المركبة
6. ✅ طلب تحويل المخالفات
7. ✅ مستندات الشركة (السجل التجاري، IBAN، هوية الممثل)
8. ✅ صورة العقد

---

## الخطوات المطلوبة لتطبيق التغييرات

```bash
# 1. حذف المكتبة القديمة
npm install

# 2. إعادة تشغيل السيرفر (إذا لزم الأمر)
# السيرفر يعمل حالياً على المنفذ 8083
```

---

## ملاحظات مهمة

1. **جدول المخالفات**: تأكد من أن جميع الاستعلامات تستخدم `traffic_violations` وليس `penalties`
2. **أسماء الحقول**: استخدم `violation_number`, `violation_date`, `total_amount`/`fine_amount`
3. **الحسابات**: غرامات التأخير = 120 ريال/يوم (حد أقصى 3000 لكل فاتورة)
4. **رسوم الأضرار**: 10,000 ريال ثابتة
5. **ملف ZIP**: يجب أن يحتوي على MIME type صحيح: `application/zip`
