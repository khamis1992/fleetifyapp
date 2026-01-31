# كيفية رؤية التصميم الجديد لصفحة تفاصيل العقد

## 🔍 المشكلة
قمت بتحديث التصميم في الملفات التالية لكن التصميم الجديد لا يظهر:
- `ContractDetailsPageRedesigned.tsx`
- `ContractHeaderRedesigned.tsx`
- `ContractInvoiceGenerator.tsx`
- `SendRemindersDialog.tsx`
- `VehiclePickupReturnTabRedesigned.tsx`
- `payment-schedules/PaymentScheduleManager.tsx`

---

## ✅ الحلول (جرب بالترتيب):

### 1️⃣ **مسح Cache المتصفح** (الأسرع)

#### في Chrome/Edge:
1. اضغط `Ctrl + Shift + Delete`
2. اختر "Cached images and files"
3. اضغط "Clear data"
4. أو اضغط `Ctrl + Shift + R` (Hard Reload)

#### أو استخدم DevTools:
1. افتح DevTools (`F12`)
2. اضغط بزر الماوس الأيمن على زر Refresh
3. اختر "Empty Cache and Hard Reload"

---

### 2️⃣ **إعادة تشغيل السيرفر**

```bash
# أوقف السيرفر
Ctrl + C

# امسح cache Vite
rm -rf node_modules/.vite

# أعد تشغيل السيرفر
npm run dev
```

---

### 3️⃣ **التحقق من حفظ الملفات**

تأكد من:
- ✅ جميع الملفات **محفوظة** (Ctrl + S)
- ✅ لا توجد أخطاء في **Console** (F12)
- ✅ السيرفر **يعمل** بدون أخطاء

---

### 4️⃣ **التحقق من المسار الصحيح**

صفحة تفاصيل العقد تعمل على المسار:
```
http://localhost:8080/contracts/:contractNumber
```

مثال:
```
http://localhost:8080/contracts/LTO202436
```

**ملاحظة:** استخدم `contractNumber` وليس `contractId`!

---

### 5️⃣ **فحص الأخطاء في Console**

افتح DevTools (`F12`) وتحقق من:
- ❌ أخطاء JavaScript
- ❌ أخطاء تحميل المكونات
- ❌ أخطاء React

---

### 6️⃣ **التحقق من Lazy Loading**

في `src/routes/index.ts`:
```typescript
const ContractDetailsPage = lazy(() => import('@/components/contracts/ContractDetailsPageRedesigned'));
```

تأكد من:
- ✅ المسار صحيح
- ✅ الملف يُصدّر `default export`

---

## 🔧 الحل السريع (جرب هذا أولاً):

```bash
# 1. أوقف السيرفر (Ctrl + C)

# 2. امسح cache
rm -rf node_modules/.vite
rm -rf dist

# 3. أعد تشغيل السيرفر
npm run dev

# 4. في المتصفح: Ctrl + Shift + R (Hard Reload)
```

---

## 🐛 إذا لم يعمل، تحقق من:

### هل الملف يُصدّر بشكل صحيح؟
```typescript
// في نهاية ContractDetailsPageRedesigned.tsx
export default ContractDetailsPageRedesigned;  // ✅ يجب أن يكون موجود
```

### هل هناك أخطاء في الكود؟
```bash
# تحقق من الأخطاء
npm run type-check
npm run lint
```

### هل المسار صحيح؟
- ✅ استخدم `/contracts/LTO202436` (contractNumber)
- ❌ لا تستخدم `/contracts/uuid-here` (contractId)

---

## 📝 ملاحظة مهمة:

إذا كنت تستخدم **contractId** بدلاً من **contractNumber**، فأنت تفتح صفحة مختلفة!

المسار `/contracts/:contractNumber` يستخدم `ContractDetailsPageRedesigned`
المسار `/contracts/:contractId` قد يكون له component مختلف

تأكد من استخدام **رقم العقد** (مثل: LTO202436) وليس **UUID**!
