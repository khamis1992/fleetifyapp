# Fix 400 Error - Customer Account Statement

## 🚨 Error Message:
```
Failed to load resource: the server responded with a status of 400 ()
```

## 🔍 Root Cause Analysis

The 400 error means the Supabase RPC call is failing. This happens when:

### ❌ **Most Common Cause: Function Not Installed**
The database function `get_customer_account_statement_by_code` doesn't exist in your Supabase database yet.

### Other Possible Causes:
- Function exists but has wrong signature
- Customer doesn't have `customer_code` field
- Parameters being passed are invalid

---

## ✅ Solution: Install the Database Function

### **Step 1: Open Supabase Dashboard**

Go to: https://supabase.com/dashboard/project/qwhunliohlkkahbspfiu/sql/new

### **Step 2: Copy the FIXED SQL File**

Open: [`CREATE_SIMPLE_CUSTOMER_STATEMENT.sql`](file:///c:/Users/khami/fleetifyapp-1/CREATE_SIMPLE_CUSTOMER_STATEMENT.sql)

**Important**: This file has been FIXED to use `i.notes` instead of `i.description`

### **Step 3: Paste & Execute**

1. Copy **ALL content** from the SQL file (Ctrl+A, Ctrl+C)
2. Paste into Supabase SQL Editor
3. Click **RUN** button or press **Ctrl+Enter**
4. Wait for success message

### **Step 4: Verify Installation**

Run this query in Supabase to verify:

```sql
-- Check if function exists
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines 
WHERE routine_name = 'get_customer_account_statement_by_code';
```

**Expected Result**: Should return 1 row

---

## 🧪 Testing After Installation

### **In Browser Console (F12):**

After installing the function, you should see in console:

**Before Fix (400 Error):**
```
❌ [useCustomerAccountStatement] RPC Error: {
  message: "function get_customer_account_statement_by_code does not exist"
  code: "42883"
}
```

**After Fix (Success):**
```
🔍 [useCustomerAccountStatement] Calling RPC with: {
  p_company_id: "24bc0b21-4e2d-4413-9842-31719a3669f4"
  p_customer_code: "C0001"
  p_date_from: null
  p_date_to: null
}
✅ Data loaded successfully
```

---

## 🔄 Steps to Test

### 1. Install Function (as shown above)

### 2. Clear Browser Cache
- Press **Ctrl+Shift+Delete**
- Select "Cached images and files"
- Click "Clear data"

### 3. Hard Refresh Page
- Press **Ctrl+F5** (Windows)
- Or **Cmd+Shift+R** (Mac)

### 4. Open Browser Console
- Press **F12**
- Go to "Console" tab
- Look for log messages

### 5. Test Customer Details
- Go to Customers page
- Click eye icon 👁️ on any customer
- Go to "المالية" (Financial) tab
- Check "كشف حساب العميل" section

---

## 📊 Expected Results

### ✅ Success Indicators:

**In Console:**
```
🔍 Calling RPC with: {...}
✅ Function returned X rows
```

**In UI:**
```
كشف حساب العميل
[Customer Name] - كود: C0001

📋 المعاملات:
━━━━━━━━━━━━━━━━━
Date | Type | Amount
━━━━━━━━━━━━━━━━━
(Transaction list or empty state)
```

### ❌ Still Seeing 400 Error:

**Check Console for Specific Error:**

1. **"function does not exist"**
   - Solution: Function not installed correctly
   - Action: Re-run SQL file in Supabase

2. **"customer_code is null"**
   - Solution: Customer missing customer_code
   - Action: Generate codes (see below)

3. **"column does not exist"**
   - Solution: SQL file not updated
   - Action: Make sure you used the FIXED version

---

## 🛠️ Common Fixes

### Fix 1: Generate Customer Codes

If customers don't have `customer_code`:

```sql
-- Run in Supabase SQL Editor
UPDATE customers 
SET customer_code = 'C' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 4, '0')
WHERE customer_code IS NULL;
```

### Fix 2: Verify Function Parameters

Test the function directly:

```sql
-- Get a test customer
SELECT id, customer_code, company_id 
FROM customers 
WHERE customer_code IS NOT NULL 
LIMIT 1;

-- Test function with those values
SELECT * FROM get_customer_account_statement_by_code(
  'COMPANY_ID_FROM_ABOVE'::UUID,
  'CUSTOMER_CODE_FROM_ABOVE',
  NULL::DATE,
  NULL::DATE
);
```

### Fix 3: Check Permissions

```sql
-- Grant permissions if needed
GRANT EXECUTE ON FUNCTION get_customer_account_statement_by_code TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_account_statement_by_code TO anon;
```

---

## 🔍 Debugging Checklist

- [ ] SQL file executed in Supabase Dashboard
- [ ] Success message appeared after execution
- [ ] Function exists (verified with query)
- [ ] Customers have customer_code values
- [ ] Browser cache cleared
- [ ] Page hard refreshed (Ctrl+F5)
- [ ] Browser console shows detailed logs
- [ ] No 400 errors in Network tab

---

## 📝 Files Reference

### Fixed SQL Files:
1. ✅ [`CREATE_SIMPLE_CUSTOMER_STATEMENT.sql`](file:///c:/Users/khami/fleetifyapp-1/CREATE_SIMPLE_CUSTOMER_STATEMENT.sql) - **USE THIS ONE**
2. [`CREATE_CUSTOMER_ACCOUNT_STATEMENT_FUNCTION.sql`](file:///c:/Users/khami/fleetifyapp-1/CREATE_CUSTOMER_ACCOUNT_STATEMENT_FUNCTION.sql) - Advanced version

### Diagnostic Tools:
- [`DIAGNOSTIC_CUSTOMER_STATEMENT.sql`](file:///c:/Users/khami/fleetifyapp-1/DIAGNOSTIC_CUSTOMER_STATEMENT.sql) - Run this to diagnose issues

### Guides:
- [`TROUBLESHOOT_CUSTOMER_STATEMENT.md`](file:///c:/Users/khami/fleetifyapp-1/TROUBLESHOOT_CUSTOMER_STATEMENT.md) - Complete troubleshooting guide

---

## 🆘 Still Getting 400 Error?

### Copy Browser Console Output:

1. Open Console (F12)
2. Look for red error messages
3. Copy the FULL error details
4. Share the error with:
   - Error message
   - Error code
   - Stack trace
   - Request details

### Check Network Tab:

1. Open DevTools (F12)
2. Go to "Network" tab
3. Filter by "XHR" or "Fetch"
4. Look for red/failed requests
5. Click on failed request
6. Check "Response" tab for error details

---

## 🎯 Quick Fix Summary

```bash
1. Open Supabase Dashboard SQL Editor
2. Copy content from CREATE_SIMPLE_CUSTOMER_STATEMENT.sql
3. Paste and RUN in SQL Editor
4. Wait for ✅ success message
5. Clear browser cache (Ctrl+Shift+Delete)
6. Hard refresh page (Ctrl+F5)
7. Test customer account statement
8. Check browser console for logs
```

---

**Last Updated**: 2025-10-24
**Supabase Project**: qwhunliohlkkahbspfiu
**Status**: Ready to install
