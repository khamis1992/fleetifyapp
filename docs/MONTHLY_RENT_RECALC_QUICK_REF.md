# Quick Reference: Monthly Rent Auto-Recalculation

## What's New in v2.0? 🆕

When you update **الإيجار الشهري**, the system now:
- ✅ Updates the contract
- ✅ **Recalculates ALL existing payment receipts** (NEW!)
- ✅ Updates pending balances automatically
- ✅ Adjusts payment statuses
- ✅ Refreshes all displays

## How It Works

### Step 1: Edit Monthly Rent
Click the pencil icon ✏️ → Enter new amount → Click ✓

### Step 2: System Auto-Recalculates
For EACH existing payment receipt:
```
New rent_amount = Updated monthly rent
New amount_due = New rent + Existing fine
New pending_balance = Amount_due - Total_paid
New payment_status = Auto-determined
```

### Step 3: See Results
- Success message shows: "تم تحديث X سجل دفع بنجاح"
- All receipts table shows updated values
- Summary cards reflect new totals

## Example

### Before: Rent = 5,000 QAR
| Receipt | Rent | Fine | Total Due | Paid | Balance | Status |
|---------|------|------|-----------|------|---------|--------|
| Jan | 5,000 | 600 | 5,600 | 5,600 | 0 | Paid ✅ |
| Feb | 5,000 | 300 | 5,300 | 3,000 | 2,300 | Partial ⚠️ |

### After: Rent = 6,000 QAR
| Receipt | Rent | Fine | Total Due | Paid | Balance | Status |
|---------|------|------|-----------|------|---------|--------|
| Jan | 6,000 | 600 | 6,600 | 5,600 | 1,000 | Partial ⚠️ |
| Feb | 6,000 | 300 | 6,300 | 3,000 | 3,300 | Partial ⚠️ |

**Notice**: 
- Jan changed from Paid → Partial (new balance 1,000)
- Feb balance increased from 2,300 → 3,300
- Late fees stay the same
- Already paid amounts stay the same

## What Gets Updated?

### ✅ Updated Automatically:
- rent_amount
- amount_due
- pending_balance
- payment_status

### ✅ Stays the Same:
- fine (late fees)
- total_paid
- payment_date
- notes

## Messages You'll See

**Success:**
```
تم تحديث الإيجار الشهري إلى 6,000 ریال ✅
تم تحديث 15 سجل دفع بنجاح ✅
```

**Partial Success:**
```
تم تحديث 14 من 15 سجل دفع
```

## Quick Tips

⚠️ **Important**: Changing rent affects ALL past receipts
💡 **Best Practice**: Review customer balances after update
✅ **Benefit**: No manual recalculation needed!

## Use Cases

1. **Rent Increase**: Customer's rent goes up → Past receipts may show new balances
2. **Rent Decrease**: Customer's rent goes down → Some partial payments may become full
3. **Correction**: Fix data entry error → All receipts automatically corrected

---

**Full Documentation**: See [MONTHLY_RENT_AUTO_RECALCULATION.md](./MONTHLY_RENT_AUTO_RECALCULATION.md)
