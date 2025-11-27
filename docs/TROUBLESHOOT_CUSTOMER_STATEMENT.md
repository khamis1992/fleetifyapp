# Customer Account Statement - Troubleshooting Guide

## ⚠️ "كشف حساب العميل - not working"

If the customer account statement is still showing errors, follow these steps:

## 🔍 Step 1: Check Which File to Use

### Use SIMPLIFIED Version If:
- ❌ You get "table does not exist" errors
- ❌ You get "column does not exist" errors  
- ❌ You want quick setup without dependencies
- ❌ You don't use journal entries

**File**: [`CREATE_SIMPLE_CUSTOMER_STATEMENT.sql`](file:///c:/Users/khami/fleetifyapp-1/CREATE_SIMPLE_CUSTOMER_STATEMENT.sql)

### Use FULL Version If:
- ✅ You need journal entry integration
- ✅ You have customer_accounts table
- ✅ You need opening balance calculation
- ✅ You want complete accounting features

**File**: [`CREATE_CUSTOMER_ACCOUNT_STATEMENT_FUNCTION.sql`](file:///c:/Users/khami/fleetifyapp-1/CREATE_CUSTOMER_ACCOUNT_STATEMENT_FUNCTION.sql)

## 🚀 Step 2: Install the Function

### Via Supabase Dashboard:

1. Open: https://supabase.com/dashboard/project/qwhunliohlkkahbspfiu/sql/new
2. Copy content from chosen SQL file
3. Paste into SQL Editor
4. Click **RUN** or press **Ctrl+Enter**
5. Wait for success message

### Verification:

```sql
-- Check if function exists
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'get_customer_account_statement_by_code';
```

Should return 1 row if successful.

## 🧪 Step 3: Test the Function

### Get a Test Customer Code:

```sql
-- Find a customer with customer_code
SELECT id, customer_code, first_name, last_name, company_name, company_id
FROM customers 
WHERE customer_code IS NOT NULL 
  AND is_active = true
LIMIT 5;
```

### Test the Function:

```sql
-- Replace with actual values from above query
SELECT * FROM get_customer_account_statement_by_code(
  'COMPANY_ID_FROM_QUERY'::UUID,
  'CUSTOMER_CODE_FROM_QUERY',
  NULL::DATE,
  NULL::DATE
);
```

### Expected Results:

- ✅ Returns rows if customer has invoices/payments
- ✅ Returns empty if customer has no transactions (this is OK)
- ❌ Error = function not installed or wrong parameters

## 🐛 Step 4: Common Issues & Fixes

### Issue 1: "function does not exist"

**Problem**: Function not created in database

**Fix**:
1. Re-run the SQL file in Supabase Dashboard
2. Make sure you clicked RUN
3. Check for error messages in Results panel

### Issue 2: "customer_code IS NULL"

**Problem**: Customer doesn't have a customer_code

**Fix Option A** - Generate customer codes:

```sql
-- Generate customer codes for customers missing them
UPDATE customers 
SET customer_code = 'C' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 4, '0')
WHERE customer_code IS NULL;
```

**Fix Option B** - Modify hook to use customer ID:

Edit [`useCustomerAccountStatement.ts`](file:///c:/Users/khami/fleetifyapp-1/src/hooks/useCustomerAccountStatement.ts):

```typescript
// Change from customer_code to customer_id
const { data, error } = await supabase.rpc('get_customer_account_statement', {
  p_company_id: profile.company_id,
  p_customer_id: customerId,  // Use ID instead of code
  p_date_from: dateFrom || null,
  p_date_to: dateTo || null
});
```

### Issue 3: "column does not match"

**Problem**: Database schema doesn't match function

**Solution**: Use the SIMPLIFIED version which has minimal dependencies

### Issue 4: "permission denied"

**Problem**: RLS policies blocking access

**Fix**:
```sql
-- Grant permissions (run as database owner)
GRANT EXECUTE ON FUNCTION get_customer_account_statement_by_code TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_account_statement_by_code TO anon;
```

## 🔄 Step 5: Restart the Application

After installing the function:

1. **Clear browser cache**: Ctrl+Shift+Delete
2. **Refresh page**: Ctrl+F5 (hard refresh)
3. **Navigate to customer details**
4. **Check account statement tab**

## ✅ Step 6: Verify It Works

### In the Application:

1. Go to **Customers** page
2. Click the **eye icon** 👁️ on any customer
3. Go to **"المالية"** (Financial) tab
4. Scroll down to **"كشف حساب العميل"**
5. Should see either:
   - ✅ Transaction list (if customer has invoices/payments)
   - ✅ Empty state message (if no transactions)
   - ❌ Error message = function still not working

## 📊 Step 7: Advanced Debugging

### Check Function Installation:

```sql
-- Get function details
SELECT 
  routine_name,
  routine_definition,
  security_type
FROM information_schema.routines 
WHERE routine_name = 'get_customer_account_statement_by_code';
```

### Check Permissions:

```sql
-- Check who can execute the function
SELECT 
  grantee, 
  privilege_type
FROM information_schema.routine_privileges 
WHERE routine_name = 'get_customer_account_statement_by_code';
```

### Test with Actual Data:

```sql
-- Get company_id from your profile
SELECT company_id FROM profiles WHERE user_id = auth.uid();

-- Use that company_id to test
SELECT * FROM get_customer_account_statement_by_code(
  'YOUR_COMPANY_ID'::UUID,
  (SELECT customer_code FROM customers WHERE customer_code IS NOT NULL LIMIT 1),
  NULL::DATE,
  NULL::DATE
);
```

## 🆘 Still Not Working?

### Option 1: Use Simplified Function

If you've tried everything:

1. Use [CREATE_SIMPLE_CUSTOMER_STATEMENT.sql](file:///c:/Users/khami/fleetifyapp-1/CREATE_SIMPLE_CUSTOMER_STATEMENT.sql)
2. This version has minimal dependencies
3. Works without journal_entries or customer_accounts

### Option 2: Temporarily Disable Feature

If you don't need account statements right now:

Edit [`CustomerDetailsDialog.tsx`](file:///c:/Users/khami/fleetifyapp-1/src/components/customers/CustomerDetailsDialog.tsx):

```typescript
// Comment out the account statement tab
// <TabsTrigger value="accounting">الحسابات المحاسبية</TabsTrigger>

// Or hide the CustomerAccountStatement component
{/* <CustomerAccountStatement customer={customer} /> */}
```

### Option 3: Check Supabase Logs

1. Go to Supabase Dashboard → Logs → Postgres Logs
2. Filter by error level
3. Look for function-related errors
4. Share error messages for further help

## 📝 Quick Checklist

- [ ] Function SQL file executed in Supabase Dashboard
- [ ] Success message appeared after execution  
- [ ] Function exists in database (verified with query)
- [ ] Customers have customer_code values
- [ ] Permissions granted to authenticated users
- [ ] Browser cache cleared and page refreshed
- [ ] Tested with actual customer data

## 🎯 Expected Final Result

**Before Fix:**
```
كشف حساب العميل
⚠️ خطأ في تحميل البيانات
```

**After Fix:**
```
كشف حساب العميل
[Customer Name] - Code: C0001

📋 Transaction List:
Date       Type      Description    Debit   Credit   Balance
========== ========= ============= ======= ======== =========
2024-01-15 Invoice   Invoice #001   500.000    0.000   500.000
2024-01-20 Payment   Payment #001     0.000  200.000   300.000
...
```

---

**Files**:
- Full version: `CREATE_CUSTOMER_ACCOUNT_STATEMENT_FUNCTION.sql`
- Simple version: `CREATE_SIMPLE_CUSTOMER_STATEMENT.sql`

**Supabase Project**: qwhunliohlkkahbspfiu
**Last Updated**: 2025-10-24
