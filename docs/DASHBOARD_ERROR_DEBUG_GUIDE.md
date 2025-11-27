# Dashboard Error Debugging Guide

## Error Message
```
نعتذر، حدث خطأ في التطبيق. يرجى تحديث الصفحة والمحاولة مرة أخرى.
(Sorry, an error occurred in the application. Please refresh the page and try again.)
```

## What We've Fixed

### 1. ✅ Fixed `usePropertyAlerts` Hook
**File:** `src/hooks/usePropertyAlerts.ts` (Line 103)
- **Issue:** Used `acknowledged` instead of `is_acknowledged`
- **Fix:** Changed to correct database field name
- **Status:** FIXED

### 2. ✅ Improved Error Boundary Logging
**File:** `src/lib/errorBoundary.tsx`
- **Enhancement:** Added detailed console logging with error stack traces
- **Enhancement:** Shows component stack in development mode
- **Enhancement:** Detects database table errors
- **Status:** ENHANCED

### 3. ✅ Fixed TypeScript Error in `useDocumentExpiryAlerts`
**File:** `src/hooks/useDocumentExpiryAlerts.ts`
- **Issue:** Incorrect TypeScript typing for error handling
- **Fix:** Changed `error: unknown` to `error: any` for proper error code access
- **Status:** FIXED

## How to Debug the Actual Error

### Step 1: Open Browser Console
1. Press `F12` to open DevTools
2. Go to **Console** tab
3. Clear console (click 🚫 icon)
4. Refresh the page
5. Look for the error in this format:

```
🔴 ERROR BOUNDARY CAUGHT ERROR
  Error: [Error message here]
  Error Stack: [Stack trace]
  Component Stack: [React component hierarchy]
```

### Step 2: Check Network Tab
1. Go to **Network** tab in DevTools
2. Filter by "Fetch/XHR"
3. Look for requests with status code `400` or `404`
4. Check the request URLs - do they include:
   - `property_contracts`
   - `property_payments`
   - `document_expiry_alerts`

### Step 3: Identify the Error Source

#### If you see database errors (PGRST116):
- **Cause:** A hook is trying to query a table that doesn't exist
- **Solution:** The hook should already handle this with error catching
- **Check:** Look for hooks without `.catch()` error handling

#### If you see component errors:
- **Cause:** A component is crashing during render
- **Solution:** Check the Component Stack in console
- **Look for:** The last component in the stack before the error

#### If you see query errors:
- **Cause:** React Query is throwing an unhandled error
- **Solution:** Add error boundaries around components using queries
- **Check:** Components using `useQuery` without `enabled` flag

## Expected Console Output (Normal Operation)

### For Car Rental Business:
```
✅ No property-related queries should run
✅ Only car rental hooks should execute
✅ Document expiry alerts should return empty array if table doesn't exist
```

### What's Normal:
- Network 400 errors are OK if they're caught and handled
- Hooks returning empty arrays is OK for missing tables
- Console warnings about missing tables are informational only

### What's NOT Normal:
- Uncaught errors in console (Red text without error boundary catching it)
- Dashboard not loading at all
- White screen with no error message

## Quick Fixes to Try

### Fix 1: Clear All Caches
```bash
# In Browser:
1. Ctrl+Shift+Delete
2. Select "Cached images and files"
3. Select "Cookies and site data"
4. Click "Clear data"
5. Hard refresh: Ctrl+Shift+R
```

### Fix 2: Clear Service Worker
```bash
# In DevTools:
1. Open Application tab
2. Click "Service Workers"
3. Click "Unregister" for Fleetify
4. Refresh page
```

### Fix 3: Reset React Query Cache
```bash
# In Console tab:
localStorage.clear()
sessionStorage.clear()
# Then refresh
```

### Fix 4: Check Database Connection
```javascript
// Paste in Console:
(async () => {
  const { supabase } = await import('/src/integrations/supabase/client');
  const { data, error } = await supabase.from('companies').select('*').limit(1);
  console.log('Database test:', { data, error });
})();
```

## Files to Check for Errors

### Primary Suspects:
1. `src/pages/Dashboard.tsx` - Main dashboard router
2. `src/pages/dashboards/CarRentalDashboard.tsx` - Car rental dashboard
3. `src/hooks/useModuleConfig.ts` - Module configuration
4. `src/contexts/CompanyContext.tsx` - Company context provider

### Secondary Suspects:
5. `src/components/dashboard/DocumentExpiryAlerts.tsx` - Uses document alerts
6. `src/hooks/useDocumentExpiryAlerts.ts` - Document alerts hook
7. `src/hooks/useOptimizedDashboardStats.ts` - Dashboard stats

## Common Error Patterns

### Pattern 1: "Cannot read property 'X' of undefined"
- **Cause:** Component accessing data before it loads
- **Fix:** Add proper loading checks and optional chaining
- **Example:** `company?.business_type` instead of `company.business_type`

### Pattern 2: "PGRST116" or "does not exist"
- **Cause:** Querying a table that doesn't exist
- **Fix:** Already handled in hooks with `.catch()`
- **Action:** Should NOT crash app - check if error is being re-thrown

### Pattern 3: "Maximum update depth exceeded"
- **Cause:** Infinite render loop
- **Fix:** Check useEffect dependencies
- **Look for:** setState in useEffect without proper deps

## Testing Checklist

- [ ] Clear browser cache
- [ ] Clear service worker
- [ ] Hard refresh (Ctrl+Shift+R)
- [ ] Check console for error stack trace
- [ ] Check network tab for failed requests
- [ ] Verify business_type is set in company data
- [ ] Test with different company if super admin

## Report Format

When reporting the error, please provide:

```
1. Error Message (from console red error)
2. Component Stack (from error boundary)
3. Failed Network Requests (URLs with 400/404)
4. Business Type of Company
5. User Role
6. Steps to reproduce
```

## Next Steps

1. **Check browser console** - This will show the actual error
2. **Copy the full error message** - Including stack trace
3. **Share the Component Stack** - Shows which component crashed
4. **Check if it's a specific business type** - Car rental vs real estate

The enhanced error boundary will now show ALL this information in the console!
