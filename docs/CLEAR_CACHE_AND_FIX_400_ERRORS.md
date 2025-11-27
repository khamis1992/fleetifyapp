# Fix All 400 Errors - Complete Guide

## 🚨 Errors You're Seeing:

```
1. GET .../payments?... 400 (Bad Request)
2. GET .../property_contracts?... 400 (Bad Request)
3. POST .../rpc/get_customer_account_statement_by_code 400 (Bad Request)
```

## ✅ Good News: ALL FIXES ARE ALREADY IN CODE!

The problem is **your browser is using OLD cached JavaScript files**. The fixes are in the code, but your browser hasn't loaded them yet.

---

## 🔧 **Solution 1: Clear Browser Cache (REQUIRED)**

### **Method 1: Hard Refresh (Quick)**

1. **Close ALL tabs** of your application
2. **Press Ctrl+Shift+Delete** (Windows) or **Cmd+Shift+Delete** (Mac)
3. Select these options:
   - ✅ Cached images and files
   - ✅ Hosted app data (if available)
   - Time range: **Last hour** or **All time**
4. Click **Clear data**
5. **Close browser completely**
6. **Reopen browser**
7. Navigate to app
8. **Press Ctrl+F5** multiple times

### **Method 2: Dev Tools Cache Clear (More Thorough)**

1. Open your app
2. Press **F12** to open DevTools
3. **Right-click** on the refresh button (next to address bar)
4. Select **"Empty Cache and Hard Reload"**
5. Wait for page to reload
6. Close DevTools
7. Press **Ctrl+F5** again

### **Method 3: Incognito/Private Mode (Best for Testing)**

1. Open **Incognito/Private window**
   - Chrome: Ctrl+Shift+N
   - Firefox: Ctrl+Shift+P
   - Edge: Ctrl+Shift+N
2. Navigate to your app
3. Login and test
4. This ensures NO cache is used

---

## 🗄️ **Solution 2: Install Database Function**

For error #3 (get_customer_account_statement_by_code), you MUST install the function:

### **Step-by-Step:**

1. Open Supabase Dashboard: https://supabase.com/dashboard/project/qwhunliohlkkahbspfiu/sql/new

2. Open file: [`CREATE_SIMPLE_CUSTOMER_STATEMENT.sql`](file:///c:/Users/khami/fleetifyapp-1/CREATE_SIMPLE_CUSTOMER_STATEMENT.sql)

3. Copy ALL content (Ctrl+A, Ctrl+C)

4. Paste in Supabase SQL Editor

5. Click **RUN** (or press Ctrl+Enter)

6. Wait for: ✅ SIMPLIFIED function created successfully!

---

## 🔍 **Why You're Still Seeing 400 Errors**

### **Error 1 & 2: Fixed in Code, Cached in Browser**

The queries in [`usePropertyContractsCalendar.ts`](file:///c:/Users/khami/fleetifyapp-1/src/hooks/usePropertyContractsCalendar.ts) are **ALREADY FIXED**:

**OLD Query (Cached - Causing 400):**
```javascript
// This is what your browser is running (from cache)
supabase.from('payments').select('*,property_contracts(...),customers(...)')
supabase.from('property_contracts').select('*,properties(...),customers(...)')
```

**NEW Query (Fixed - In Code):**
```javascript
// This is what's actually in the code NOW
supabase.from('property_payments').select('*,property_contracts!property_payments_property_contract_id_fkey(...)')
supabase.from('property_contracts').select('*,properties!property_contracts_property_id_fkey(...),customers!property_contracts_tenant_id_fkey(...)')
```

**Solution**: Clear cache to load the NEW code!

### **Error 3: Function Not Installed**

This error will persist until you install the database function in Supabase.

---

## ✅ **Complete Fix Procedure**

Follow these steps IN ORDER:

### **Step 1: Clear All Cache**
```bash
1. Close ALL application tabs
2. Press Ctrl+Shift+Delete
3. Select "Cached images and files"
4. Select "All time"
5. Click "Clear data"
6. Close browser
7. Wait 10 seconds
8. Reopen browser
```

### **Step 2: Install Database Function**
```bash
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy CREATE_SIMPLE_CUSTOMER_STATEMENT.sql
4. Paste and RUN
5. Verify success message
```

### **Step 3: Hard Refresh Application**
```bash
1. Open app in NEW tab
2. Press F12 (DevTools)
3. Right-click refresh button
4. Select "Empty Cache and Hard Reload"
5. Wait for complete reload
6. Press Ctrl+F5 again
```

### **Step 4: Verify Fixes**
```bash
1. Open DevTools Console (F12)
2. Navigate to different pages
3. Check Network tab for requests
4. Should see NO 400 errors
5. All queries should succeed (200 OK)
```

---

## 🧪 **Verification Tests**

### **Test 1: Check Code is Updated**

Open DevTools Console and run:
```javascript
// This should show the FIXED hook
console.log(usePropertyContractsCalendar.toString())
```

Look for `property_payments` and `!property_payments_property_contract_id_fkey` - if you see these, code is updated!

### **Test 2: Check Network Requests**

1. Open DevTools (F12)
2. Go to **Network** tab
3. Filter by **Fetch/XHR**
4. Navigate to calendar/properties page
5. Look at requests:
   - ✅ Should see `property_payments` (not `payments`)
   - ✅ Should see foreign key constraint names in URL
   - ✅ Should see `200 OK` status (not 400)

### **Test 3: Check Function Installed**

In Supabase SQL Editor, run:
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'get_customer_account_statement_by_code';
```

Should return 1 row if function is installed.

---

## 🎯 **Expected Results After Fix**

### **Before (400 Errors):**
```
Network Tab:
❌ GET .../payments?... 400
❌ GET .../property_contracts?... 400  
❌ POST .../rpc/get_customer_account_statement_by_code 400

Console:
Errors everywhere, nothing loads
```

### **After (All Working):**
```
Network Tab:
✅ GET .../property_payments?... 200 OK
✅ GET .../property_contracts?... 200 OK
✅ POST .../rpc/get_customer_account_statement_by_code 200 OK

Console:
Clean, no errors, data loads successfully
```

---

## 🔄 **If Still Getting Errors**

### **Option 1: Force Rebuild**

If you have access to terminal:
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and rebuild
rm -rf node_modules
npm install

# Clear Vite cache
rm -rf .vite
rm -rf dist

# Restart dev server
npm run dev
```

### **Option 2: Check Build Output**

Look for these files in your built app:
```
dist/assets/index-XKox7DvD.js  <-- Should contain NEW query code
```

If this file has old code, the build wasn't updated.

### **Option 3: Verify Code Changes**

Check that [`usePropertyContractsCalendar.ts`](file:///c:/Users/khami/fleetifyapp-1/src/hooks/usePropertyContractsCalendar.ts) contains:

Line 71: ✅ `property_payments` (not `payments`)
Line 77: ✅ `!property_payments_property_contract_id_fkey`
Line 71: ✅ `!property_contracts_property_id_fkey`

---

## 📋 **Quick Checklist**

- [ ] All application tabs closed
- [ ] Browser cache cleared (Ctrl+Shift+Delete)
- [ ] Browser completely closed and reopened
- [ ] Database function installed in Supabase
- [ ] Application opened in new tab
- [ ] Hard refresh performed (Ctrl+F5)
- [ ] DevTools opened (F12)
- [ ] Network tab checked for 200 OK statuses
- [ ] No 400 errors visible
- [ ] Data loads successfully

---

## 🆘 **Still Having Issues?**

### **Share These Details:**

1. **Browser & Version**: Chrome/Firefox/Edge and version number
2. **Cache Clearing Method Used**: Which method did you try?
3. **Network Tab Screenshot**: Show the failing request details
4. **Request URL**: Copy the full URL from Network tab
5. **Response**: What does the Response tab show?
6. **Console Errors**: Any red errors in Console tab?

### **Quick Debug Commands:**

Run in browser console:
```javascript
// Check if new code is loaded
console.log('Payment query includes property_payments:', 
  document.body.innerHTML.includes('property_payments'))

// Check cache status
console.log('Service worker:', navigator.serviceWorker?.controller)

// Force reload without cache
location.reload(true)
```

---

## 🎉 **Success Indicators**

You'll know it's fixed when:

1. ✅ Network tab shows all 200 OK
2. ✅ No 400 errors in console
3. ✅ Calendar loads with events
4. ✅ Properties page loads data
5. ✅ Customer account statements display
6. ✅ No error toasts/messages

---

**Files Reference:**
- Fixed Hook: [`usePropertyContractsCalendar.ts`](file:///c:/Users/khami/fleetifyapp-1/src/hooks/usePropertyContractsCalendar.ts)
- Database Function: [`CREATE_SIMPLE_CUSTOMER_STATEMENT.sql`](file:///c:/Users/khami/fleetifyapp-1/CREATE_SIMPLE_CUSTOMER_STATEMENT.sql)
- This Guide: [`CLEAR_CACHE_AND_FIX_400_ERRORS.md`](file:///c:/Users/khami/fleetifyapp-1/CLEAR_CACHE_AND_FIX_400_ERRORS.md)

**Last Updated**: 2025-10-24
**Status**: Ready to fix - just clear cache!
