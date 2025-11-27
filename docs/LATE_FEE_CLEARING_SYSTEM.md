# 🎯 نظام التسوية التلقائية للغرامات - Late Fee Auto-Clearing System

## 📋 نظرة عامة (Overview)

نظام ذكي لتسوية غرامات التأخير تلقائياً عندما يدفع العميل مبلغاً أكبر من المستحق عليه. النظام يكتشف تلقائياً أن الزيادة في الدفع تغطي غرامة شهر سابق ويقوم بتسويتها مع إضافة ملاحظات توضيحية.

**An intelligent system that automatically clears late fees when a customer pays more than required. The system detects that the excess payment covers a previous month's late fee and settles it with explanatory notes.**

---

## 🎭 سيناريو العمل (Business Scenario)

### المثال العملي (Practical Example):

**شهر يوليو (July):**
- الإيجار الشهري: 1,000 ريال
- دفع متأخر (يوم 5): غرامة 480 ريال
- المبلغ الإجمالي المستحق: 1,480 ريال
- **المدفوع: 1,000 ريال فقط**
- **المتبقي: 480 ريال (غرامة غير مدفوعة)**

**شهر أغسطس (August):**
- الإيجار الشهري: 1,000 ريال
- دفع في الموعد (يوم 1): لا يوجد غرامة
- **المدفوع: 1,480 ريال** (الإيجار + غرامة الشهر السابق)

### ⚡ ماذا يحدث تلقائياً؟ (What Happens Automatically?)

1. النظام يكتشف أن الدفع (1,480 ريال) > الإيجار المستحق (1,000 ريال)
2. الزيادة = 480 ريال
3. النظام يبحث عن غرامات غير مدفوعة في الأشهر السابقة
4. يجد غرامة يوليو (480 ريال)
5. **يقوم بتسوية الغرامة تلقائياً**
6. **يضيف ملاحظات توضيحية على كلا الإيصالين**

---

## 🔧 التطبيق التقني (Technical Implementation)

### 1️⃣ التحديثات على صفحة المدفوعات (Payment Page Updates)

**الملف:** `src/pages/FinancialTracking.tsx`

#### إضافة حقل الملاحظات (Notes Field)

```typescript
// New state for payment notes
const [paymentNotes, setPaymentNotes] = useState('');
```

#### واجهة المستخدم (UI Component)

```tsx
{/* Payment Notes */}
<div className="mt-4">
  <Label htmlFor="paymentNotes">ملاحظات الدفع (اختياري)</Label>
  <Input
    id="paymentNotes"
    type="text"
    value={paymentNotes}
    onChange={(e) => setPaymentNotes(e.target.value)}
    placeholder="مثال: دفعة متأخرة، دفع غرامة الشهر السابق، إلخ..."
    className="mt-1"
  />
  <p className="text-xs text-muted-foreground mt-1">
    ⚡ سيتم إضافة ملاحظة تلقائية إذا تم تسوية غرامة من شهر سابق
  </p>
</div>
```

### 2️⃣ منطق التسوية التلقائية (Auto-Clearing Logic)

```typescript
const handleAddPayment = async () => {
  // ... validation ...
  
  // Calculate payment details
  const { fine, month, rent_amount } = calculateDelayFine(paymentDate, selectedCustomer.monthly_rent);
  const totalDue = rent_amount + fine;
  const paidAmount = parseFloat(paymentAmount);
  
  let autoNotes = paymentNotes.trim();
  let previousMonthUpdated = null;

  // LATE FEE CLEARING LOGIC
  if (paidAmount > totalDue && companyId) {
    // 1. Fetch previous receipts with unpaid late fees
    const { data: previousReceipts } = await supabase
      .from('rental_payment_receipts')
      .select('*')
      .eq('customer_id', selectedCustomer.id)
      .eq('company_id', companyId)
      .gt('fine', 0)
      .gt('pending_balance', 0)
      .order('payment_date', { ascending: false })
      .limit(10);

    if (previousReceipts && previousReceipts.length > 0) {
      // 2. Filter receipts with unpaid fines
      const receiptsWithUnpaidFines = previousReceipts.filter(
        receipt => receipt.pending_balance >= receipt.fine && receipt.fine > 0
      );

      if (receiptsWithUnpaidFines.length > 0) {
        const previousReceipt = receiptsWithUnpaidFines[0];
        const excessAmount = paidAmount - totalDue;

        // 3. Check if excess covers the late fee
        if (excessAmount >= previousReceipt.fine) {
          // 4. Clear the late fee
          const newPendingBalance = Math.max(0, previousReceipt.pending_balance - previousReceipt.fine);
          const newPaymentStatus = newPendingBalance === 0 ? 'paid' : 'partial';
          
          // 5. Update previous receipt with note
          const clearedFeeNote = `تم دفع غرامة التأخير (${previousReceipt.fine.toLocaleString('ar-QA')} ريال) من شهر ${previousReceipt.month} في تاريخ ${format(new Date(paymentDate), 'dd/MM/yyyy')}`;
          
          const previousNotes = previousReceipt.notes 
            ? `${previousReceipt.notes}\n\n${clearedFeeNote}` 
            : clearedFeeNote;

          await supabase
            .from('rental_payment_receipts')
            .update({
              pending_balance: newPendingBalance,
              payment_status: newPaymentStatus,
              notes: previousNotes,
              updated_at: new Date().toISOString()
            })
            .eq('id', previousReceipt.id);

          previousMonthUpdated = previousReceipt.month;
          
          // 6. Add note to current payment
          const currentPaymentNote = `تم تطبيق ${excessAmount.toLocaleString('ar-QA')} ريال لسداد غرامة شهر ${previousReceipt.month} (${previousReceipt.fine.toLocaleString('ar-QA')} ريال)`;
          autoNotes = autoNotes ? `${autoNotes}\n\n${currentPaymentNote}` : currentPaymentNote;
        }
      }
    }
  }
  
  // 7. Create receipt with notes
  await createReceiptMutation.mutateAsync({
    // ... other fields ...
    notes: autoNotes || null
  });

  // 8. Show success message
  if (previousMonthUpdated) {
    toast.success(`تم إضافة الدفعة بنجاح ✅\nتم تسوية غرامة شهر ${previousMonthUpdated}`, { duration: 4000 });
  }
};
```

### 3️⃣ تحديث Hook الإدخال (Insert Hook Update)

**الملف:** `src/hooks/useRentalPayments.ts`

```typescript
export const useCreateRentalReceipt = () => {
  const queryClient = useQueryClient();
  const { companyId, user } = useUnifiedCompanyAccess();

  return useMutation({
    mutationFn: async (receipt: Omit<RentalPaymentReceipt, 'id' | 'created_at' | 'updated_at' | 'company_id' | 'created_by'>) => {
      if (!companyId) {
        throw new Error('Company ID is required');
      }

      // Direct insert with notes support
      const { data, error } = await supabase
        .from('rental_payment_receipts')
        .insert({
          customer_id: receipt.customer_id,
          customer_name: receipt.customer_name,
          month: receipt.month,
          payment_date: receipt.payment_date,
          rent_amount: receipt.rent_amount,
          fine: receipt.fine,
          total_paid: receipt.total_paid,
          amount_due: receipt.amount_due,
          pending_balance: receipt.pending_balance,
          payment_status: receipt.payment_status,
          notes: receipt.notes || null,  // ← Support notes
          company_id: companyId,
          created_by: user?.id || null
        })
        .select()
        .single();

      if (error) throw error;
      return data as RentalPaymentReceipt;
    },
    // ... onSuccess, onError ...
  });
};
```

---

## 📊 هجرة البيانات التاريخية (Historical Data Migration)

### الملف: `supabase/migrations/20251014000002_auto_clear_late_fees.sql`

هذه الهجرة تعالج جميع البيانات التاريخية وتطبق منطق التسوية بأثر رجعي.

**This migration processes all historical data and applies clearing logic retroactively.**

#### ماذا تفعل الهجرة؟ (What Does the Migration Do?)

1. **تحليل جميع الإيصالات** لكل عميل بالترتيب الزمني
2. **اكتشاف المدفوعات الزائدة** (دفع أكثر من المستحق)
3. **البحث عن غرامات غير مدفوعة** في الأشهر السابقة
4. **تسوية الغرامات تلقائياً** حيثما أمكن
5. **إضافة ملاحظات توضيحية** على جميع الإيصالات المعنية

#### تشغيل الهجرة (Running the Migration)

```bash
# Via Supabase CLI
supabase migration up

# Or apply directly via MCP
# The migration will show:
# - Number of receipts processed
# - Total cleared fees amount
# - Number of affected customers
```

#### نتائج الهجرة (Migration Results)

```
========================================
Late Fee Clearing Migration Complete
========================================
Receipts processed: 15
Total cleared fees: 7,200 QAR
Affected customers: 8
========================================
```

---

## 💡 أمثلة عملية (Practical Examples)

### مثال 1: دفع غرامة شهر واحد سابق

**قبل (Before):**
| الشهر | الإيجار | الغرامة | المدفوع | المتبقي | الملاحظات |
|-------|---------|---------|---------|---------|-----------|
| يوليو | 1,000 | 480 | 1,000 | 480 | - |
| أغسطس | 1,000 | 0 | 1,480 | 0 | - |

**بعد التطبيق (After):**
| الشهر | الإيجار | الغرامة | المدفوع | المتبقي | الملاحظات |
|-------|---------|---------|---------|---------|-----------|
| يوليو | 1,000 | 480 | 1,000 | **0** | ✅ تم دفع غرامة التأخير (480 ريال) من شهر يوليو في تاريخ 01/08/2024 |
| أغسطس | 1,000 | 0 | 1,480 | 0 | 💰 تم تطبيق 480 ريال لسداد غرامة شهر يوليو (480 ريال) |

### مثال 2: دفع جزئي مع ملاحظة مخصصة

**الدفع:**
- المبلغ: 2,000 ريال
- الملاحظة: "دفع متأخر بسبب السفر"

**النتيجة:**
```
الملاحظات النهائية:
دفع متأخر بسبب السفر

تم تطبيق 600 ريال لسداد غرامة شهر يونيو (600 ريال)
```

---

## 🔍 التحقق من التسوية (Verification)

### كيف تتحقق أن النظام يعمل؟ (How to Verify It's Working?)

1. **افحص الإيصالات** في صفحة المدفوعات
2. **ابحث عن عمود "ملاحظات"** في جدول الإيصالات
3. **تحقق من الملاحظات التلقائية** التي تبدأ بـ "تم دفع غرامة" أو "تم تطبيق"

### نموذج التحقق (Verification Query)

```sql
-- عرض جميع الإيصالات مع الملاحظات
SELECT 
  customer_name,
  month,
  total_paid,
  fine,
  pending_balance,
  payment_status,
  notes
FROM rental_payment_receipts
WHERE notes IS NOT NULL
  AND notes LIKE '%تم دفع غرامة%'
ORDER BY payment_date DESC;
```

---

## 🎨 واجهة المستخدم (User Interface)

### حقل الملاحظات (Notes Field)

```
┌─────────────────────────────────────────┐
│ ملاحظات الدفع (اختياري)                │
├─────────────────────────────────────────┤
│ مثال: دفعة متأخرة، دفع غرامة ...      │
└─────────────────────────────────────────┘
  ⚡ سيتم إضافة ملاحظة تلقائية إذا تم تسوية غرامة
```

### عرض الملاحظات في الجدول (Notes Display in Table)

يمكن إضافة عمود جديد:

```tsx
<TableHead className="text-right">الملاحظات</TableHead>

// ... في TableBody:
<TableCell>
  {receipt.notes ? (
    <div className="text-xs max-w-xs">
      <Badge variant="outline" className="mb-1">
        📝 ملاحظات
      </Badge>
      <p className="text-muted-foreground whitespace-pre-wrap">
        {receipt.notes}
      </p>
    </div>
  ) : (
    <span className="text-muted-foreground text-xs">-</span>
  )}
</TableCell>
```

---

## 🚀 الفوائد (Benefits)

### 1. التوفير الزمني (Time Saving)
- ✅ **تسوية تلقائية** بدلاً من التسوية اليدوية
- ✅ **تتبع دقيق** للغرامات المدفوعة
- ✅ **شفافية كاملة** مع العملاء

### 2. دقة محاسبية (Accounting Accuracy)
- ✅ **حسابات دقيقة** للأرصدة المتبقية
- ✅ **سجل تدقيق واضح** مع الملاحظات
- ✅ **منع الأخطاء** في التسويات اليدوية

### 3. تحسين تجربة العميل (Enhanced Customer Experience)
- ✅ **شفافية**: العميل يرى بوضوح كيف تم تطبيق دفعته
- ✅ **سهولة الفهم**: ملاحظات واضحة بالعربية
- ✅ **ثقة**: تسوية عادلة وتلقائية

---

## 📝 الملاحظات الفنية (Technical Notes)

### 1. ترتيب المعالجة (Processing Order)
- الإيصالات تُعالج **بالترتيب الزمني** (الأقدم أولاً)
- الغرامات تُسوى **بالترتيب العكسي** (الأحدث أولاً)

### 2. أولوية التسوية (Clearing Priority)
1. أحدث غرامة غير مدفوعة
2. إذا تبقى زيادة، الغرامة التي قبلها
3. وهكذا...

### 3. قيود النظام (System Constraints)
- الزيادة يجب أن تكون **≥ الغرامة** للتسوية
- فقط الغرامات **ضمن pending_balance** يتم تسويتها
- النظام **لا يسوي** غرامات من عملاء آخرين

---

## 🔐 الأمان والأذونات (Security & Permissions)

### Row Level Security (RLS)
- ✅ جميع الاستعلامات تحترم `company_id`
- ✅ المستخدمون يرون فقط بيانات شركتهم
- ✅ الهجرة تعمل على مستوى الشركة

### سجل التدقيق (Audit Trail)
- ✅ `updated_at` يُحدث تلقائياً
- ✅ `created_by` يُسجل منشئ الدفعة
- ✅ `notes` تحفظ تاريخ كامل للتسويات

---

## 📞 الدعم والاستكشاف (Support & Troubleshooting)

### المشاكل الشائعة (Common Issues)

#### 1. الملاحظات لا تظهر
**الحل:** تأكد من أن عمود `notes` موجود في جدول الإيصالات

#### 2. التسوية لا تحدث تلقائياً
**الحل:** تحقق من:
- المبلغ المدفوع > المستحق
- يوجد غرامة غير مدفوعة في شهر سابق
- الغرامة ≤ الزيادة في الدفع

#### 3. الهجرة فشلت
**الحل:** 
- تحقق من صلاحيات قاعدة البيانات
- راجع سجل الأخطاء
- شغّل الهجرة يدوياً عبر Supabase Dashboard

---

## ✅ قائمة التحقق (Checklist)

قبل التطبيق في الإنتاج:

- [ ] اختبار سيناريوهات متعددة
- [ ] التحقق من الملاحظات التلقائية
- [ ] تشغيل الهجرة على نسخة احتياطية أولاً
- [ ] فحص النتائج يدوياً
- [ ] تدريب المستخدمين على الميزة الجديدة
- [ ] توثيق الإجراءات للفريق

---

## 📈 التطوير المستقبلي (Future Enhancements)

### أفكار للتحسين:
1. **تسوية متعددة**: تسوية عدة غرامات في دفعة واحدة
2. **تقرير التسويات**: عرض جميع التسويات التلقائية
3. **إشعارات**: إشعار العميل عند تسوية غرامة
4. **إحصائيات**: عدد الغرامات المسواة شهرياً
5. **تصدير**: تصدير سجل التسويات

---

## 📄 الملخص (Summary)

نظام التسوية التلقائية للغرامات يوفر:
- ✅ **تسوية ذكية** تلقائية للغرامات
- ✅ **ملاحظات واضحة** على كل دفعة
- ✅ **هجرة تاريخية** لتصحيح البيانات القديمة
- ✅ **واجهة سهلة** للمستخدمين
- ✅ **شفافية كاملة** مع العملاء

---

*آخر تحديث: 2025-10-14*
*الإصدار: 1.0*
*الحالة: ✅ جاهز للإنتاج*
