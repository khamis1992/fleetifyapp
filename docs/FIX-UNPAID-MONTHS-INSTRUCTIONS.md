# Fix for "Only 1 Unpaid Month Showing" Issue

## 🐛 Problem
The unpaid months list only shows 1 month instead of all unpaid months.

## 🔍 Root Cause
The database function `get_customer_unpaid_months` was using the wrong column name:
- ❌ Used: `c.monthly_payment` (doesn't exist)
- ✅ Should use: `c.monthly_amount` (correct column)

This caused the function to fail silently and only return 1 result.

## ✅ Solution

### Step 1: Open Supabase Dashboard
1. Go to your Supabase project: https://supabase.com/dashboard
2. Select your project
3. Click on **SQL Editor** in the left sidebar

### Step 2: Run the Fix
1. Click **New Query** button
2. Open the file: `fix-unpaid-months-function.sql`
3. Copy the ENTIRE contents
4. Paste into the SQL Editor
5. Click **RUN** (or press `Ctrl+Enter`)
6. Wait for success message: "✅ Successfully fixed get_customer_unpaid_months function"

### Step 3: Verify the Fix
1. Go back to your Financial Tracking page: `/financial-tracking`
2. Select a customer with multiple unpaid months
3. Check the "⚠️ أشهر غير مدفوعة" section
4. You should now see ALL unpaid months listed!

## 🎯 What Was Fixed

**Before (wrong):**
```sql
SELECT c.monthly_payment  -- ❌ Column doesn't exist
FROM contracts c
```

**After (correct):**
```sql
SELECT c.monthly_amount  -- ✅ Correct column name
FROM contracts c
```

## 📝 Expected Result

After running the fix, the function will:
1. ✅ Loop through ALL months from contract start to now
2. ✅ Check each month for payments
3. ✅ Return ALL unpaid months (not just 1)
4. ✅ Update automatically when payments are added
5. ✅ Show overdue status and days overdue

## 🔄 How It Works After Fix

When you select a customer:
1. Function queries their active contract
2. Calculates months from contract start to current date
3. For each month, checks if payment exists in `rental_payment_receipts`
4. Returns only months without payments
5. UI displays all unpaid months with overdue information

## ⚠️ Note

If you already ran `fix-rpc-functions.sql` before, this fix is redundant (the full fix file already includes this correction). But running it again won't cause any issues.

---

**Status:** Ready to Apply  
**Impact:** All unpaid months will show correctly  
**Estimated Time:** 1 minute to run

