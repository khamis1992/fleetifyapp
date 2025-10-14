# Visual Guide: Monthly Rent Auto-Recalculation 🎨

## 📱 User Interface Flow

```
┌─────────────────────────────────────────────────────────┐
│  Financial Tracking Page                                │
│                                                          │
│  العميل المحدد: أحمد محمد                               │
│  الإيجار الشهري: 5,000 ریال  [✏️ Edit]                │
└─────────────────────────────────────────────────────────┘
                      ↓ Click Edit
┌─────────────────────────────────────────────────────────┐
│  الإيجار الشهري: [6000___]  [✓]  [✕]                   │
└─────────────────────────────────────────────────────────┘
                      ↓ Click ✓
┌─────────────────────────────────────────────────────────┐
│  🔄 جاري التحديث...                                    │
└─────────────────────────────────────────────────────────┘
                      ↓ Processing...
┌─────────────────────────────────────────────────────────┐
│  ✅ تم تحديث الإيجار الشهري إلى 6,000 ریال             │
│  ✅ تم تحديث 15 سجل دفع بنجاح                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 Behind the Scenes Process

```
User Updates Rent
       ↓
┌──────────────────────────┐
│ Step 1: Update Contract  │
│ monthly_amount = 6,000   │
└──────────────────────────┘
       ↓
┌──────────────────────────┐
│ Step 2: Fetch Receipts   │
│ Get all customer receipts│
└──────────────────────────┘
       ↓
┌──────────────────────────────────────────┐
│ Step 3: Recalculate Each Receipt         │
│                                          │
│ For Receipt 1 (Jan):                     │
│   rent_amount: 5,000 → 6,000            │
│   fine: 600 (unchanged)                  │
│   amount_due: 5,600 → 6,600             │
│   total_paid: 5,600 (unchanged)          │
│   pending_balance: 0 → 1,000            │
│   status: 'paid' → 'partial'            │
│                                          │
│ For Receipt 2 (Feb):                     │
│   rent_amount: 5,000 → 6,000            │
│   fine: 300 (unchanged)                  │
│   amount_due: 5,300 → 6,300             │
│   total_paid: 3,000 (unchanged)          │
│   pending_balance: 2,300 → 3,300        │
│   status: 'partial' (unchanged)         │
└──────────────────────────────────────────┘
       ↓
┌──────────────────────────┐
│ Step 4: Update Database  │
│ Save all 15 receipts     │
└──────────────────────────┘
       ↓
┌──────────────────────────┐
│ Step 5: Refresh UI       │
│ Show updated data        │
└──────────────────────────┘
```

---

## 📊 Data Transformation Example

### BEFORE (Rent = 5,000 QAR)

```
┌────────────────────────────────────────────────────────────────┐
│                    سجل المدفوعات                               │
├────────┬────────┬──────┬─────────┬────────┬────────┬──────────┤
│ Month  │ Rent   │ Fine │ Total   │ Paid   │Balance │ Status   │
├────────┼────────┼──────┼─────────┼────────┼────────┼──────────┤
│ يناير  │ 5,000  │  600 │ 5,600   │ 5,600  │    0   │ مدفوع ✅ │
│ فبراير │ 5,000  │  300 │ 5,300   │ 3,000  │ 2,300  │ جزئي ⚠️  │
│ مارس   │ 5,000  │    0 │ 5,000   │     0  │ 5,000  │ معلق ⏳  │
└────────┴────────┴──────┴─────────┴────────┴────────┴──────────┘
```

### AFTER (Rent = 6,000 QAR)

```
┌────────────────────────────────────────────────────────────────┐
│                    سجل المدفوعات                               │
├────────┬────────┬──────┬─────────┬────────┬────────┬──────────┤
│ Month  │ Rent   │ Fine │ Total   │ Paid   │Balance │ Status   │
├────────┼────────┼──────┼─────────┼────────┼────────┼──────────┤
│ يناير  │ 6,000↑ │  600 │ 6,600↑  │ 5,600  │ 1,000↑ │ جزئي ⚠️  │
│ فبراير │ 6,000↑ │  300 │ 6,300↑  │ 3,000  │ 3,300↑ │ جزئي ⚠️  │
│ مارس   │ 6,000↑ │    0 │ 6,000↑  │     0  │ 6,000↑ │ معلق ⏳  │
└────────┴────────┴──────┴─────────┴────────┴────────┴──────────┘

Legend: ↑ = Value increased
```

---

## 🎯 Status Change Examples

### Example 1: Fully Paid → Partial Payment

```
BEFORE:
┌──────────────────────────────┐
│ January 2024                 │
│ Rent: 5,000                  │
│ Fine: 600                    │
│ Total Due: 5,600             │
│ Paid: 5,600                  │
│ Balance: 0                   │
│ Status: مدفوع ✅             │
└──────────────────────────────┘

AFTER:
┌──────────────────────────────┐
│ January 2024                 │
│ Rent: 6,000  (↑1,000)       │
│ Fine: 600                    │
│ Total Due: 6,600  (↑1,000)  │
│ Paid: 5,600                  │
│ Balance: 1,000  (NEW!)      │
│ Status: جزئي ⚠️ (CHANGED!)  │
└──────────────────────────────┘
```

### Example 2: Partial → Still Partial (Balance Increases)

```
BEFORE:
┌──────────────────────────────┐
│ February 2024                │
│ Rent: 5,000                  │
│ Fine: 300                    │
│ Total Due: 5,300             │
│ Paid: 3,000                  │
│ Balance: 2,300               │
│ Status: جزئي ⚠️              │
└──────────────────────────────┘

AFTER:
┌──────────────────────────────┐
│ February 2024                │
│ Rent: 6,000  (↑1,000)       │
│ Fine: 300                    │
│ Total Due: 6,300  (↑1,000)  │
│ Paid: 3,000                  │
│ Balance: 3,300  (↑1,000)    │
│ Status: جزئي ⚠️              │
└──────────────────────────────┘
```

---

## 💰 Financial Impact

### Summary Cards Update

```
BEFORE:
┌──────────────────┬──────────────────┬──────────────────┬──────────────────┐
│ إجمالي المدفوعات │ إجمالي الغرامات  │ إجمالي الإيجار   │ الرصيد المتبقي   │
│    8,600 ریال    │    900 ریال     │   15,000 ریال   │   7,300 ریال    │
└──────────────────┴──────────────────┴──────────────────┴──────────────────┘

AFTER:
┌──────────────────┬──────────────────┬──────────────────┬──────────────────┐
│ إجمالي المدفوعات │ إجمالي الغرامات  │ إجمالي الإيجار   │ الرصيد المتبقي   │
│    8,600 ریال    │    900 ریال     │   18,000 ریال↑ │  10,300 ریال↑   │
└──────────────────┴──────────────────┴──────────────────┴──────────────────┘
```

---

## 🎨 Color Coding in UI

### Status Badges

```
✅ مدفوع (Paid)
   Background: Green
   Text: White
   Condition: pending_balance = 0

⚠️ جزئي (Partial)
   Background: Orange/Yellow
   Text: Dark
   Condition: pending_balance > 0 AND total_paid > 0

⏳ معلق (Pending)
   Background: Gray
   Text: Dark
   Condition: total_paid = 0
```

### Balance Display

```
0 ریال
   Color: Green
   Font: Bold
   
1,000 ریال
   Color: Orange
   Font: Bold
   
5,000 ریال
   Color: Red
   Font: Bold
```

---

## 📱 Toast Messages Timeline

```
Time: 0s
┌────────────────────────────────────┐
│ 🔄 جاري تحديث الإيجار الشهري...   │
└────────────────────────────────────┘

Time: 2s
┌────────────────────────────────────┐
│ ✅ تم تحديث الإيجار الشهري إلى    │
│    6,000 ریال                     │
└────────────────────────────────────┘

Time: 2.5s
┌────────────────────────────────────┐
│ ✅ تم تحديث 15 سجل دفع بنجاح      │
└────────────────────────────────────┘
```

---

## 🔍 What Gets Updated vs What Stays

### ✅ UPDATED (Green)

```
┌─────────────────────────┐
│ rent_amount             │  5,000 → 6,000
│ amount_due              │  5,600 → 6,600
│ pending_balance         │      0 → 1,000
│ payment_status          │   paid → partial
└─────────────────────────┘
```

### 🔒 UNCHANGED (Blue)

```
┌─────────────────────────┐
│ fine                    │  600 (same)
│ total_paid              │  5,600 (same)
│ payment_date            │  2024-01-15 (same)
│ notes                   │  "تم الدفع" (same)
│ receipt_id              │  UUID (same)
└─────────────────────────┘
```

---

## 🚦 Success Indicators

### Visual Cues

```
1. Loading State
   ┌────────────────────────┐
   │ [⟳ spinner] Loading... │
   └────────────────────────┘

2. Success State
   ┌────────────────────────┐
   │ ✅ Success Message     │
   └────────────────────────┘

3. Updated Values
   ┌────────────────────────┐
   │ 6,000 ریال (in green)  │
   └────────────────────────┘

4. Refresh Animation
   ┌────────────────────────┐
   │ Table rows flash/fade  │
   └────────────────────────┘
```

---

## 📈 Performance Indicators

### Progress Display

```
Processing 15 receipts...

[████████████████████████] 100%

✅ 15/15 receipts updated successfully
```

---

**Quick Tips**:
- 💡 Watch the balance column - it updates in real-time
- 💡 Status badges change colors automatically
- 💡 Summary cards refresh instantly
- 💡 All changes are saved permanently

---

**See Also**:
- [MONTHLY_RENT_AUTO_RECALCULATION.md](./MONTHLY_RENT_AUTO_RECALCULATION.md) - Full technical details
- [MONTHLY_RENT_RECALC_QUICK_REF.md](./MONTHLY_RENT_RECALC_QUICK_REF.md) - Quick reference
