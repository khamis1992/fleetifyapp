# Supabase SQL Scripts to Run

Please execute these SQL scripts in your **Supabase Dashboard → SQL Editor** to fix all database-related issues.

---

## ⚠️ IMPORTANT: Run these in order!

### 1️⃣ First: Fix RPC Functions (REQUIRED - High Priority)
**File:** `fix-rpc-functions.sql`
**Purpose:** Fixes the column name error (`monthly_payment` → `monthly_amount`)
**Fixes these errors:**
- ❌ Error fetching outstanding balance: column c.monthly_payment does not exist
- ❌ Error fetching unpaid months: column c.monthly_payment does not exist

**What it does:**
- Updates `get_customer_outstanding_balance` function
- Updates `get_customer_unpaid_months` function  
- Updates `get_all_customers_outstanding_balance` function

**Run this NOW** - your Financial Tracking page won't work without it!

---

### 2️⃣ Second: Create Customer Function (OPTIONAL - Recommended)
**File:** `create-customer-function.sql`
**Purpose:** Creates atomic customer+contract creation function (bypasses RLS issues)
**Fixes these errors:**
- null value in column "customer_id" of relation "contracts" violates not-null constraint

**What it does:**
- Creates `create_customer_with_contract` RPC function
- Handles customer and contract creation atomically
- Bypasses RLS policy limitations

**Note:** If you don't run this, the system will fall back to manual creation method (slower but works)

---

## How to Run:

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy and paste the contents of `fix-rpc-functions.sql`
5. Click **RUN** or press `Ctrl+Enter`
6. Wait for success message
7. Repeat steps 3-6 for `create-customer-function.sql` (optional)

---

## Expected Results:

### After running fix-rpc-functions.sql:
✅ Outstanding balance queries work correctly
✅ Unpaid months queries work correctly
✅ Financial tracking dashboard displays data properly
✅ No more "column c.monthly_payment does not exist" errors

### After running create-customer-function.sql:
✅ Customer creation is instant (no delays)
✅ No more customer_id null errors
✅ Atomic transactions (all-or-nothing)
✅ Better reliability

---

## Verification:

After running the SQL:
1. Refresh your browser page (Ctrl+F5)
2. Go to Financial Tracking page
3. Try selecting a customer - should see outstanding balance
4. Try creating a new customer - should work instantly

---

## Need Help?

If you encounter errors while running the SQL:
1. Copy the full error message
2. Check which function failed
3. Share the error with me

The SQL is safe to run multiple times - it uses `CREATE OR REPLACE FUNCTION` so it will update existing functions without breaking anything.
