# Fix: Data shows 0 on refresh/minimize

## Problem
When the user refreshes or minimizes the browser, all dashboard data shows 0. A hard refresh is needed to see real values.

## Root Cause
Auth session briefly becomes null during page transitions (refresh, minimize/restore). This causes a chain of events:
1. `user` becomes null temporarily → `stableCompanyIdRef` gets reset to null
2. `CompanyContext` forgets the previous company ID (`prevCompanyIdRef` set to null)
3. When auth recovers, CompanyContext sees the transition as a "company change" (null → companyId)
4. CompanyContext invalidates ALL queries
5. During the refetch window, data is undefined → components show 0 via `|| 0` fallbacks

## Fix Plan

- [ ] **1. Fix CompanyContext.tsx** — Don't update `prevCompanyIdRef` when `currentId` is null. Only track valid company IDs, so null→sameId transitions don't trigger invalidation.

- [ ] **2. Fix useDashboardStats.ts** — Don't reset `stableCompanyIdRef` when user is briefly null. Keep the last known company ID to maintain query key stability during auth transitions.

- [ ] **3. Add `placeholderData` to useDashboardStats** — Add `placeholderData: (prev) => prev` as a safety net so previous data is shown while refetching.

## Review

### Changes Made (4 files, ~5 lines changed total)

1. **`src/contexts/CompanyContext.tsx`** — Changed `prevCompanyIdRef.current = currentId` to only update when `currentId` is truthy. Previously, when auth flickered and `currentId` became null, the ref was reset to null. When auth recovered, the null→companyId transition was falsely detected as a "company change", causing ALL queries to be invalidated.

2. **`src/hooks/useDashboardStats.ts`** — Removed `if (!user) stableCompanyIdRef.current = null`. The ref now keeps the last known company ID during brief auth transitions. Also added `placeholderData: (previousData) => previousData` to keep showing previous data while refetching.

3. **`src/hooks/company/useCompanyAccess.ts`** — Same fix: removed `if (!user) stableCompanyIdRef.current = null` to prevent losing the stable company ID during auth flickers.

4. **`src/hooks/useUnifiedCompanyAccess.ts`** — Same fix: removed `if (!user) stableCompanyIdRef.current = null`.

### Why this fixes the problem
- **Before**: Minimize/refresh → auth flicker → company ID refs reset to null → CompanyContext detects false "company change" → invalidates all queries → data shows 0
- **After**: Minimize/refresh → auth flicker → company ID refs keep last known value → no false invalidation → data stays visible
