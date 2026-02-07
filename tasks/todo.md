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

### Changes Made (6 files total)

**Round 1 — Company ID stability fixes:**

1. **`src/contexts/CompanyContext.tsx`** — Changed `prevCompanyIdRef.current = currentId` to only update when `currentId` is truthy. Prevents false "company changed" detection during auth flickers.

2. **`src/hooks/useDashboardStats.ts`** — Removed `if (!user) stableCompanyIdRef.current = null`. Added `placeholderData` to keep previous data during refetch.

3. **`src/hooks/company/useCompanyAccess.ts`** — Same fix: removed null reset on auth flicker.

4. **`src/hooks/useUnifiedCompanyAccess.ts`** — Same fix: removed null reset on auth flicker.

**Round 2 — Dashboard inline queries (the main culprits):**

5. **`src/components/dashboard/bento/BentoDashboardRedesigned.tsx`** — Added `useRef` stabilization for `companyId` used by 3 inline queries (fleet status, maintenance, revenue chart). These queries were using `user?.profile?.company_id` directly — when user flickered to null, all 3 queries lost their data. Added `placeholderData` to all 3 queries.

6. **`src/pages/dashboard/DashboardLanding.tsx`** — Same fix as above for the landing dashboard variant. 3 inline queries now use stabilized `companyId` with `placeholderData`.

### Why this fixes the problem
- **Before**: Auth flicker → `user` becomes null → `companyId` undefined → query keys change → cached data lost → queries disabled → components show 0
- **After**: Auth flicker → `stableCompanyIdRef` keeps last known value → query keys stable → cached data preserved → `placeholderData` shows previous data while refetching
