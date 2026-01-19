# Fleetify ERP - Performance Optimization Plan

**Created**: 2026-01-19
**Goal**: Reduce bundle size by 50%, improve load time by 60%, optimize database queries
**Estimated Duration**: 4 weeks (can be done faster with parallel execution)

---

## 📊 Performance Baseline (Current)

| Metric | Current | Target | Improvement Needed |
|--------|---------|--------|-------------------|
| Initial Bundle | ~3-5MB | <1MB | 50% reduction |
| Time to Interactive | 5-8s | <3s | 60% faster |
| Dashboard Load | ~150ms | <40ms | 73% faster |
| Data Transfer | ~250KB/request | <25KB | 90% reduction |

---

## 🎯 Optimization Strategy - 4 Waves

### Wave 1: Critical Bundle Reduction (Week 1)
**Goal**: Reduce initial bundle from 5MB to 2.5MB (50% reduction)
**Impact**: Immediate user-facing improvement
**Agent**: `performance-engineer` + `frontend-developer`

**Tasks**:
1. Remove server-only packages (ioredis, redis) → -400KB
2. Lazy load PDF.js worker → -1.2MB
3. Fix manualChunks strategy in vite.config.ts → -800KB
4. Consolidate PDF libraries (html2pdf OR jspdf) → -500KB
5. Add compression plugin (brotli/gzip)

**Files Modified**:
- `package.json`
- `vite.config.ts`
- Create `src/lib/pdfWorker.ts`
- Update imports in PDF-using components

**Acceptance Criteria**:
- [ ] `npm run build:ci` shows bundle < 2.5MB
- [ ] `dist/assets/` shows PDF worker in separate chunk
- [ ] Compression (.br, .gz) files present in dist/
- [ ] All tests pass: `npm run test:run`

---

### Wave 2: Database Query Optimization (Week 1-2)
**Goal**: Dashboard load 150ms → 40ms (73% faster)
**Impact**: Faster data loading, less bandwidth
**Agent**: `database-optimization` + `sql-pro`

**Tasks**:
1. Use `dashboard_summary` view instead of 3 parallel queries
2. Create RPC functions for stats aggregation
3. Add 3 missing indexes (idempotency, account_code, date_range)

**Files Modified**:
- `src/hooks/api/useDashboardApi.ts` (use dashboard_summary)
- `src/hooks/api/useInvoicesApi.ts` (use RPC)
- `src/hooks/api/useVehiclesApi.ts` (use RPC)
- `src/hooks/api/useCustomersApi.ts` (use RPC)
- Create migration: `supabase/migrations/YYYYMMDD_add_stats_rpc_and_indexes.sql`

**SQL to Create**:
```sql
-- RPC function for invoice stats
CREATE OR REPLACE FUNCTION get_invoice_stats(p_company_id UUID)
RETURNS TABLE (
  total BIGINT,
  draft BIGINT,
  pending BIGINT,
  paid BIGINT,
  total_amount DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE status = 'draft')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'paid')::BIGINT,
    COALESCE(SUM(total), 0)
  FROM invoices
  WHERE company_id = p_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Missing indexes
CREATE INDEX IF NOT EXISTS idx_payments_idempotency
ON payments(company_id, idempotency_key)
WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_company_code
ON chart_of_accounts(company_id, account_code)
WHERE is_header = false;

CREATE INDEX IF NOT EXISTS idx_invoices_contract_date_brin
ON invoices USING BRIN(contract_id, due_date);
```

**Acceptance Criteria**:
- [ ] Dashboard stats query < 50ms (measure with React Query DevTools)
- [ ] Invoice stats query < 15ms
- [ ] Network tab shows < 25KB for stats requests
- [ ] Migration applies successfully to staging
- [ ] All existing tests pass

---

### Wave 3: Runtime Performance & Code Splitting (Week 2)
**Goal**: Reduce unnecessary re-renders by 30%, lazy load routes
**Impact**: Smoother UI, faster route transitions
**Agent**: `frontend-developer` + `performance-engineer`

**Tasks**:
1. Lazy load critical routes (Dashboard, MobileApp, Auth)
2. Add React.memo to dashboard components (StatCard, GlassCard)
3. Fix missing useMemo in BentoDashboard
4. Consolidate AuthContext state

**Files Modified**:
- `src/routes/index.ts` (add lazy() to routes)
- `src/components/dashboard/bento/BentoDashboardRedesigned.tsx` (memo, useMemo)
- `src/contexts/AuthContext.tsx` (consolidate state)

**Code Changes**:

**routes/index.ts**:
```typescript
// Change these imports:
import { Dashboard } from '@/pages/Dashboard';
import { MobileApp } from '@/pages/mobile/MobileApp';
import { Auth } from '@/pages/Auth';

// To lazy loading:
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const MobileApp = lazy(() => import('@/pages/mobile/MobileApp'));
const Auth = lazy(() => import('@/pages/Auth'));
```

**BentoDashboardRedesigned.tsx**:
```typescript
// Add React.memo
export const StatCard = React.memo<StatCardProps>(({ value, change, ... }) => {
  // ...
}, (prev, next) => {
  return prev.value === next.value && prev.change === next.change;
});

// Add useMemo
const fleetChartData = useMemo(() => [
  { name: 'متاح', value: fleetStatus?.available || 0, color: '#10b981' },
  // ...
], [fleetStatus]);
```

**AuthContext.tsx**:
```typescript
// Replace multiple useState with single object
const [authState, setAuthState] = useState({
  user: getCachedUser(),
  session: null,
  loading: true,
  sessionError: null,
  isSigningOut: false
});
```

**Acceptance Criteria**:
- [ ] React DevTools Profiler shows 30% fewer re-renders
- [ ] Route changes load code chunks on-demand (verify in Network tab)
- [ ] All tests pass
- [ ] No console errors or warnings

---

### Wave 4: Asset & Network Optimization (Week 3-4)
**Goal**: Reduce assets by 90%, increase cache hit rate
**Impact**: Faster repeat visits, less bandwidth
**Agent**: `frontend-developer` (can be done in parallel with other waves)

**Tasks**:
1. Optimize images (convert to WebP)
2. Move large PDF from public/ to CDN
3. Increase staleTime for static data (vehicles, customers)
4. Add Web Vitals monitoring

**Files Modified**:
- `public/icon-512.png` → `public/icon-512.webp`
- `public/sedan-top-view.png` → `public/sedan-top-view.webp`
- Remove `public/identifying-and-scaling-ai-use-cases.pdf` (6.1MB!)
- `src/hooks/api/useVehiclesApi.ts` (increase staleTime)
- `src/hooks/api/useCustomersApi.ts` (increase staleTime)
- Create `src/lib/webVitals.ts`

**Commands**:
```bash
# Convert images to WebP (requires ImageMagick)
magick public/icon-512.png public/icon-512.webp
magick public/sedan-top-view.png public/sedan-top-view.webp

# Update references in index.html and manifest.json
```

**Query Cache Updates**:
```typescript
// useVehiclesApi.ts
useVehicles(filters) {
  staleTime: 15 * 60 * 1000, // 15 minutes (was 2 min)
}

// useCustomersApi.ts
useCustomerStats() {
  staleTime: 10 * 60 * 1000, // 10 minutes (was 2 min)
}
```

**Acceptance Criteria**:
- [ ] Public folder size < 500KB (from 6.4MB)
- [ ] Lighthouse score for Performance > 90
- [ ] Web Vitals tracked in console (development)
- [ ] Cache hit rate > 80% (measure in React Query DevTools)

---

## 🚀 Execution Order (Parallel Strategy)

### Phase 1: Quick Wins (Days 1-2) - Can run in parallel
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Wave 1.1:       │     │ Wave 2.1:       │     │ Wave 4.1:       │
│ Remove packages │     │ Use dashboard_  │     │ Image optimize  │
│ (-400KB)        │     │ summary view    │     │ (-6MB assets)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Phase 2: Medium Wins (Days 3-5)
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Wave 1.2-1.4:   │     │ Wave 2.2:       │     │ Wave 3.1:       │
│ PDF lazy load,  │     │ Create RPC      │     │ Lazy routes     │
│ manualChunks,   │     │ functions       │     │                 │
│ compress        │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Phase 3: Final Polish (Days 6-7)
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Wave 2.3:       │     │ Wave 3.2-3.4:   │     │ Wave 4.2-4.4:   │
│ Add indexes     │     │ React.memo,     │     │ Cache tuning,   │
│                 │     │ useMemo, Auth   │     │ Web Vitals      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## 📋 Checklist by Wave

### Wave 1: Bundle Reduction
- [ ] Uninstall ioredis and redis packages
- [ ] Create `src/lib/pdfWorker.ts` with dynamic import
- [ ] Update all PDF.js imports to use lazy worker
- [ ] Update `vite.config.ts` manualChunks strategy
- [ ] Add vite-plugin-compression to build
- [ ] Run build and verify bundle size < 2.5MB
- [ ] Test all PDF functionality still works

### Wave 2: Database Optimization
- [ ] Create migration file with RPC functions and indexes
- [ ] Test migration on staging database
- [ ] Update `useDashboardApi.ts` to use dashboard_summary view
- [ ] Update `useInvoicesApi.ts` to use get_invoice_stats RPC
- [ ] Update `useVehiclesApi.ts` to use RPC
- [ ] Update `useCustomersApi.ts` to use RPC
- [ ] Measure query times in React Query DevTools
- [ ] Verify all stats display correctly

### Wave 3: Runtime Performance
- [ ] Update `src/routes/index.ts` with lazy imports
- [ ] Add loading states for lazy routes
- [ ] Add React.memo to StatCard component
- [ ] Add React.memo to GlassCard component
- [ ] Add useMemo to BentoDashboard computed values
- [ ] Consolidate AuthContext useState calls
- [ ] Profile with React DevTools to verify 30% reduction

### Wave 4: Assets & Network
- [ ] Convert all PNG images to WebP format
- [ ] Update HTML references to use WebP
- [ ] Move large PDF to CDN or remove
- [ ] Increase staleTime for vehicles query to 15min
- [ ] Increase staleTime for customers query to 10min
- [ ] Add Web Vitals tracking to performance monitor
- [ ] Run Lighthouse audit and verify score > 90

---

## 🎯 Success Metrics

### Bundle Size
```
Before: 5,000KB (5MB)
After:  2,500KB (2.5MB)
Target: 50% reduction
```

### Time to Interactive
```
Before: 8 seconds
After:  3 seconds
Target: 60% faster
```

### Dashboard Load Time
```
Before: 150ms
After:  40ms
Target: 73% faster
```

### Network Transfer (Stats)
```
Before: 250KB per request
After:  25KB per request
Target: 90% reduction
```

---

## 🔄 Rollback Plan

Each wave is independently revertable:

**Wave 1 Rollback**:
```bash
git revert <wave-1-commit>
npm install ioredis redis  # Restore packages
```

**Wave 2 Rollback**:
```bash
# Supabase migrations are reversible
supabase db rollback --version <previous-version>
```

**Wave 3 Rollback**:
```bash
git revert <wave-3-commit>
```

**Wave 4 Rollback**:
```bash
git revert <wave-4-commit>
# Restore original images from git
```

---

## 📝 Implementation Notes

1. **Parallel Execution**: Waves 1, 2, and 4 can run in parallel. Wave 3 depends on Wave 1 completion.
2. **Testing**: Each wave should have its own test suite run before merging
3. **Staging First**: Always test database changes on staging before production
4. **Performance Budget**: Update `.env` with new budgets after Wave 1
5. **Monitoring**: Enable Web Vitals tracking after Wave 4 for continuous measurement

---

**Next Step**: Execute Wave 1.1 (Remove server packages) using `performance-engineer` agent
