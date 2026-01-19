# Quick Guide: Edit الإيجار الشهري (Monthly Rent)

## Where is it?
**Financial Tracking Page** → Select a customer → Look for "الإيجار الشهري"

## How to Edit?

1. **Click the pencil icon** ✏️ next to the monthly rent amount
2. **Enter the new amount** in the input field
3. **Click ✓** to save OR **Click ✕** to cancel

## What Happens?

✅ Monthly rent is updated in the **contracts table**  
✅ Change is reflected in **Financial Tracking page**  
✅ Change is reflected in **Agreement/Contract page**  
✅ Success message appears: "تم تحديث الإيجار الشهري إلى [amount] ریال"

## Visual Guide

```
Before Editing:
┌─────────────────────────────────────┐
│ الإيجار الشهري                      │
│ 5,000 ریال  ✏️                     │
└─────────────────────────────────────┘

While Editing:
┌─────────────────────────────────────┐
│ الإيجار الشهري                      │
│ [6000] ✓ ✕                         │
└─────────────────────────────────────┘

After Saving:
┌─────────────────────────────────────┐
│ الإيجار الشهري                      │
│ 6,000 ریال  ✏️                     │
└─────────────────────────────────────┘
```

## Important Notes

⚠️ Only active contracts are updated  
⚠️ Amount must be greater than 0  
⚠️ Changes are permanent (cannot undo)  

## Database Impact

**Updated Table**: `contracts`  
**Updated Column**: `monthly_amount`  
**Filter**: Active contracts for the selected customer

---

**Need help?** Check [EDIT_MONTHLY_RENT_FEATURE.md](./EDIT_MONTHLY_RENT_FEATURE.md) for detailed documentation.
