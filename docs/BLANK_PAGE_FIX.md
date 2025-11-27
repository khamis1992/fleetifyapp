# Blank Page Fix Implementation Guide

## Root Cause
Session timeout race condition in AuthContext causes silent failures, leading to blank page when network is slow or Supabase API times out.

---

## Fix 1: AuthContext Session Timeout (CRITICAL)

**File**: `src/contexts/AuthContext.tsx`
**Lines**: 117-120

### Current Code (BROKEN):
```typescript
      ]).catch(() => {
        console.warn('📝 [AUTH_CONTEXT] Session check timeout (5s), continuing without session');
        return { data: { session: null }, error: null };
      });
```

### Fixed Code:
```typescript
      ]).catch((err) => {
        console.error('🔴 [AUTH_CONTEXT] Session check failed - timeout or network error:', err);
        // Don't silently return null - provide clear error feedback
        if (mountedRef.current) {
          setSessionError('Unable to verify session. Please check your connection and refresh the page.');
        }
        // Return error instead of silently failing
        return { data: { session: null }, error: err };
      });
```

**What This Does**:
- Logs error clearly (changed from warn to error)
- Sets user-visible error message via `setSessionError`
- Returns the actual error instead of null
- User sees message instead of blank page

---

## Fix 2: ProtectedRoute Loading Timeout (HIGH PRIORITY)

**File**: `src/components/common/ProtectedRoute.tsx`
**Location**: After imports, before the component

### Add This Code:
```typescript
import { useState, useEffect } from 'react';

// Inside the ProtectedRoute component, add at the top:
const [loadingTimeout, setLoadingTimeout] = useState(false);

useEffect(() => {
  const timer = setTimeout(() => {
    if (loading) {
      console.error('🔴 ProtectedRoute: Auth loading timeout after 5 seconds');
      setLoadingTimeout(true);
    }
  }, 5000);

  return () => clearTimeout(timer);
}, [loading]);

// Then modify the loading check:
if (loading && !loadingTimeout) {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

if (loadingTimeout) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <div className="max-w-md space-y-4">
        <h2 className="text-2xl font-semibold text-destructive">Connection Timeout</h2>
        <p className="text-muted-foreground">
          The connection is taking longer than expected. This might be due to:
        </p>
        <ul className="text-left space-y-2 text-sm text-muted-foreground">
          <li>• Slow internet connection</li>
          <li>• Server temporarily unavailable</li>
          <li>• Network firewall or proxy issues</li>
        </ul>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
}
```

**What This Does**:
- Adds 5-second timeout for loading state
- Shows clear error message if timeout occurs
- Provides actionable "Refresh" button
- Prevents infinite loading skeleton

---

## Fix 3: Route-Level Error Boundaries (RECOMMENDED)

**File**: `src/App.tsx`
**Location**: Wrap critical routes

### For Index Route (Line ~381):
```typescript
// BEFORE:
<Route path="/" element={<Index />} />

// AFTER:
<Route path="/" element={
  <RouteErrorBoundary fallbackPath="/auth">
    <Index />
  </RouteErrorBoundary>
} />
```

### For Auth Route (Line ~383):
```typescript
// BEFORE:
<Route path="/auth" element={<Auth />} />

// AFTER:
<Route path="/auth" element={
  <RouteErrorBoundary fallbackPath="/">
    <Auth />
  </RouteErrorBoundary>
} />
```

### For Dashboard Route (Line ~454):
```typescript
// BEFORE:
<Route path="dashboard" element={
  <RouteWrapper routeName="Dashboard" fallbackPath="/">
    <Suspense fallback={<PageSkeletonFallback />}>
      <Dashboard />
    </Suspense>
  </RouteWrapper>
} />

// AFTER:
<Route path="dashboard" element={
  <RouteErrorBoundary fallbackPath="/auth">
    <RouteWrapper routeName="Dashboard" fallbackPath="/">
      <Suspense fallback={<PageSkeletonFallback />}>
        <Dashboard />
      </Suspense>
    </RouteWrapper>
  </RouteErrorBoundary>
} />
```

**What This Does**:
- Catches errors at route level before they cause blank page
- Redirects to safe fallback route if error occurs
- Prevents error propagation to root

---

## Testing Steps

### Test 1: Simulate Slow Network
1. Open DevTools → Network tab
2. Set throttling to "Slow 3G"
3. Hard refresh (Ctrl+Shift+R)
4. **Expected**: Error message instead of blank page

### Test 2: Simulate Offline
1. Open DevTools → Network tab
2. Check "Offline"
3. Hard refresh
4. **Expected**: "Connection Timeout" message with refresh button

### Test 3: Normal Operation
1. Remove network throttling
2. Clear cache and hard refresh
3. **Expected**: Normal login/dashboard flow (no regression)

---

## Rollback Plan

If any issues occur:

```bash
git diff src/contexts/AuthContext.tsx
git diff src/components/common/ProtectedRoute.tsx
git diff src/App.tsx

# If needed:
git checkout src/contexts/AuthContext.tsx
git checkout src/components/common/ProtectedRoute.tsx
git checkout src/App.tsx
```

---

## Success Criteria

✅ Blank page no longer appears on slow network
✅ User sees clear error message with action
✅ Normal auth flow works without regression
✅ Console shows helpful debug logs
✅ No infinite loading states

---

## Implementation Priority

1. **Fix 1** (CRITICAL) - Do this first
2. **Fix 2** (HIGH) - Do this second
3. **Fix 3** (RECOMMENDED) - Do after testing 1 & 2

---

**Generated by**: CTO Director Agent
**Date**: 2025-11-06
**Confidence**: 95% this will resolve the blank page issue
