# 📊 مراجعة تبويبة القيود المحاسبية الحالية

## 🔍 ما وجدته في النظام

### الملفات الرئيسية:
- `src/pages/finance/GeneralLedger.tsx` - الصفحة الرئيسية
- `src/components/finance/RedesignedJournalEntryCard.tsx` - بطاقة القيد
- `src/components/finance/JournalEntryForm.tsx` - نموذج إنشاء قيد

---

## 📋 الميزات الموجودة

### 1. البحث والفلتر
- ✅ **بحث نصي** - البحث في القيود
- ✅ **فلتر بالتاريخ** - من تاريخ / إلى تاريخ
- ✅ **فلتر بالحالة** - الكل / مرحل / مسودة / ملغي
- ✅ **فلتر بالحساب** - اختيار حساب محدد
- ✅ **فلتر بمركز التكلفة** - اختيار مركز تكلفة

### 2. عرض القيود (RedesignedJournalEntryCard)
**معلومات القيد:**
- ✅ رقم القيد (entry_number)
- ✅ تاريخ القيد (entry_date)
- ✅ الحالة (status: posted/draft/cancelled/reversed)
- ✅ إجمالي المدين (total_debit)
- ✅ إجمالي الدائن (total_credit)
- ✅ البيان (description)

**التفاصيل (expandable):**
- ✅ جدول الحسابات:
  - رمز الحساب
  - اسم الحساب
  - البيان
  - مدين (debit_amount)
  - دائن (credit_amount)
- ✅ إجمالي كل عمود
- ✅ التحقق من التوازن (مدين = دائن)

### 3. حالات القيد (3 حالات)
- ✅ **مرحل** (posted) - أخضر
- ✅ **مسودة** (draft) - أصفر
- ✅ **ملغي** (cancelled/reversed) - أزرق/أحمر

### 4. الإجراءات
- ✅ **إنشاء قيد جديد** - JournalEntryForm
- ✅ **ترحيل القيد** (post) - من مسودة لمرحل
- ✅ **عكس القيد** (reverse) - إنشاء قيد عكسي
- ✅ **حذف القيد** (delete) - للمسودات فقط
- ✅ **تصدير البيانات** - Excel/PDF/CSV
- ✅ **طباعة القيد** - JournalVoucherDisplay

### 5. الإحصائيات
- ✅ إجمالي القيود
- ✅ القيود المرحلة
- ✅ القيود الملغية
- ✅ القيود غير المتوازنة

### 6. التحقق من الأخطاء
- ✅ فحص التوازن (مدين = دائن)
- ✅ القيود غير المتوازنة (alert)
- ✅ معالجة الأخطاء (error boundary)

---

## 📊 بنية البيانات

### جدول journal_entries:
```typescript
{
  id: string
  entry_number: string
  entry_date: string
  description: string
  total_debit: number
  total_credit: number
  status: 'posted' | 'draft' | 'reversed' | 'cancelled'
  reference_type: string | null
  reference_id: string | null
  created_by: string
  created_at: string
}
```

### جدول journal_entry_lines:
```typescript
{
  id: string
  journal_entry_id: string
  account_id: string
  debit_amount: number | null
  credit_amount: number | null
  line_description: string | null
  line_number: number
  cost_center_id: string | null
  chart_of_accounts: { ... }
}
```

---

## 🎯 التصميم الجديد يجب أن يتضمن

### ✅ من التصميم الحالي:
- [x] بطاقات القيود (Journal Entry Cards)
- [x] جدول تفاصيل القيد
- [x] البحث والفلتر
- [x] حالات القيد (3 حالات)
- [x] إجراءات (ترحيل، عكس، حذف)
- [x] الإحصائيات
- [x] التحقق من التوازن

### ✅ إضافات للتحسين:
- [ ] Stats Cards (إحصائيات سريعة)
- [ ] Timeline للقيود
- [ ] فلتر متقدم (expandable)
- [ ] عرض مختلف (Grid/List)
- [ ] إجراءات مجمعة (bulk actions)
- [ ] تصدير محسّن

---

## 🎨 نظام الألوان الحالي

| الحالة | اللون الحالي | الجديد (FleetifyApp) |
|--------|-------------|----------------------|
| مرحل | 🟢 أخضر | 🟢 أخضر (يبقى) |
| مسودة | 🟡 أصفر | 🟡 أصفر (يبقى) |
| ملغي | 🔵 أزرق | 🔴 أحمر (يتغير) |
| العناوين | 🔵 indigo | 🔴 أحمر (يتغير) |

---

**جاهز لإعادة التصميم؟** ✅










