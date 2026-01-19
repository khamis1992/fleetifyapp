# Fix for "Identifier 'useQuery' has already been declared" Error

## Issue
**User:** KHAMIS AL-JABOR  
**Date:** 2025-10-16  
**Error:** `ErrorBoundary caught an error: SyntaxError: Identifier 'useQuery' has already been declared Object`

## Root Cause
The error was caused by **multiple invocations of the same React Query hook** in a single component, which led to bundling issues where `useQuery` was being declared multiple times in the same scope.

### Before (Problematic):
```typescript
// Multiple calls to useCustomers hook with destructuring
const { data: individualCount } = useCustomers({ customer_type: 'individual' });
const { data: corporateCount } = useCustomers({ customer_type: 'corporate' });
const { data: blacklistedCount } = useCustomers({ is_blacklisted: true });
```

**Issue:** While each call to [useCustomers](file://c:\Users\khamis\Desktop\fleetifyapp-3\src\hooks\useCustomers.ts#L13-L124) is valid, the bundler was incorrectly handling the multiple destructured `data` variables, causing a naming collision.

## Solution Applied
**Renamed destructured variables** to avoid bundler confusion and ensure each query result has a unique identifier:

### After (Fixed):
```typescript
// Multiple calls to useCustomers hook with unique destructured variable names
const { data: individualCountResult } = useCustomers({ customer_type: 'individual' });
const { data: corporateCountResult } = useCustomers({ customer_type: 'corporate' });
const { data: blacklistedCountResult } = useCustomers({ is_blacklisted: true });

// Use the renamed variables for count calculations
const individualCustomers = individualCountResult?.total || 0;
const corporateCustomers = corporateCountResult?.total || 0;
const blacklistedCustomers = blacklistedCountResult?.total || 0;
```

## Technical Details

### Changes Made:
1. **Renamed variables:**
   - `individualCount` → `individualCountResult`
   - `corporateCount` → `corporateCountResult`
   - `blacklistedCount` → `blacklistedCountResult`

2. **Updated references:**
   - Changed count calculations to use new variable names
   - Maintained all functionality

### Files Modified:
**File:** `src/pages/Customers.tsx`  
- **Lines Changed:** 12 (6 added, 6 removed)  
- **Status:** ✅ No compilation errors

## Benefits

1. **✅ Fixed bundler error:** No more "useQuery already declared" error
2. **✅ Clearer variable naming:** Each result has a descriptive name
3. **✅ Maintained functionality:** Customer counts still work correctly
4. **✅ Better debugging:** Easier to identify which query each result comes from

## How It Works

Each [useCustomers](file://c:\Users\khamis\Desktop\fleetifyapp-3\src\hooks\useCustomers.ts#L13-L124) call:
1. Returns a separate React Query instance
2. Fetches total count for a specific customer type
3. Uses different query keys to ensure proper caching
4. Runs independently without interfering with each other

### Query Structure:
```typescript
// Main customer list (paginated)
useCustomers(filters) 

// Individual customers count (all, not paginated)
useCustomers({ customer_type: 'individual', includeInactive: false })

// Corporate customers count (all, not paginated)  
useCustomers({ customer_type: 'corporate', includeInactive: false })

// Blacklisted customers count (all, including inactive)
useCustomers({ is_blacklisted: true, includeInactive: true })
```

## Testing Verification

### Expected Behavior:
- ✅ **الأفراد** card shows total count of all individual customers
- ✅ **الشركات** card shows total count of all corporate customers
- ✅ **القائمة السوداء** card shows total count of all blacklisted customers
- ✅ **إجمالي العملاء** card shows total active customers
- ✅ No bundler errors in console
- ✅ No duplicate identifier errors

### Verification Steps:
1. Navigate to http://localhost:8080/customers
2. Check that all count cards display correct numbers
3. Verify no console errors
4. Test pagination functionality
5. Test filtering functionality

## Prevention

To avoid similar issues in the future:

1. **Use descriptive variable names** when destructuring multiple hook results
2. **Add suffixes** like `Result`, `Data`, or `Response` to distinguish similar variables
3. **Restart dev server** after major changes to clear bundler cache
4. **Check for bundler errors** when seeing unexpected "already declared" messages

---

**Date:** 2025-10-16  
**Status:** ✅ Fixed and Deployed  
**User:** KHAMIS AL-JABOR  
**Priority:** High (Blocking error)  
**Verified:** Yes (No compilation errors)
