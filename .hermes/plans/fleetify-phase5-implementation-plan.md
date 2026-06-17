# Fleetify — Phase 5: UX Implementation Plan

> Repo: C:/Users/khamis/Documents/fleetifyapp
> Date: 2026-06-17
> Goal: Implement Quick wins + Sprint A/B/C from Phase 4 UX findings.

---

## Scope

- **Quick wins** (this session): `/login` redirect, auth card polish, RTL login arrow, logo, remove duplicate `/help`, reduce primary nav to 8 items.
- **Sprint A — Security + Navigation** (1 week): localStorage password removal, role-based route guards, sidebar consolidation, navigation restructure, route variant consolidation plan.
- **Sprint B — Mobile-First Lists + Modals** (2 weeks): DataList/DataCard component, responsive table wrapper, top 10 data-heavy pages conversion.
- **Sprint C — Polish + i18n** (1–2 weeks): EmptyState/skeletons, onboarding manual trigger, global search ⌘K, top 100 labels translation.

---

## Architecture

- All UI changes use existing shadcn/ui + Tailwind; no new design system.
- Navigation config remains single source of truth in `src/navigation/navigationConfig.ts`.
- Route guards reuse `ProtectedRoute` with role/permission checks.
- Mobile list component is a generic wrapper around `DataCard` using existing `Card` + `Skeleton`.
- i18n keys follow namespace pattern `domain:key`.

---

## Quick Wins — Tasks

### Q1: Add `/login` redirect route
- File: `src/routes/index.ts`
- Add a public route object `{ path: '/login', redirectTo: '/auth' }` or map to component.

### Q2: Auth card improvements
- Files: `src/components/auth/AuthForm.tsx`, `src/pages/Auth.tsx`
- Add company logo/tagline inside form card.
- Remove disabled forgot-password or add tooltip.
- Fix RTL primary button icon (`ArrowRight` for forward).

### Q3: Remove duplicate `/help` route
- File: `src/routes/index.ts`
- Delete duplicate entry.

### Q4: Reduce primary navigation
- File: `src/navigation/navigationConfig.ts`
- Restructure `PRIMARY_NAVIGATION` to 8 items.
- Move admin/config items to `SECONDARY_NAVIGATION` / settings drawer.

---

## Sprint A — Tasks

### A1: Remove plain password from localStorage in AuthForm
- File: `src/components/auth/AuthForm.tsx`
- Stop storing password; store only email/username preference if needed.
- Update related type/interface.

### A2: Harden ProtectedRoute
- File: `src/components/routing/ProtectedRoute.tsx`
- Remove 1.5s forced render timeout.
- Wait for auth + company ready; show branded spinner.
- Add optional `requiredRole`/`requiredPermission` checks.

### A3: Add route-level role checks
- File: `src/routes/index.ts` + `src/lib/permissions.ts` (new)
- Add `requiredRole`/`requiredPermission` to admin/finance/legal/reports routes.
- Create permission map from `module_config`.

### A4: Consolidate sidebars
- Files: `src/components/layouts/AppSidebar.tsx`, `EnhancedSidebar.tsx`, `BentoSidebar.tsx`
- Decide canonical sidebar; remove duplicates or wrap behind feature flags.
- Unify active-state color to primary teal.

### A5: Consolidate page variants
- Files: route registry + pages (`Contracts.tsx` vs `ContractsRedesigned.tsx`, `CustomerCRM` vs `CustomerCRMRedesigned`, etc.)
- For each duplicated workflow, choose canonical route and redirect legacy paths.

---

## Sprint B — Tasks

### B1: Create `DataList` / `DataCard` mobile-first component
- Files: `src/components/ui/DataList.tsx`, `src/components/ui/DataCard.tsx`
- Props: items, renderCard, empty state, loading skeleton, toggle view mode.

### B2: Create `ResponsiveTable` wrapper
- File: `src/components/ui/ResponsiveTable.tsx`
- Wraps `Table` in `overflow-x-auto`, adds column visibility breakpoints.

### B3: Convert top 10 table-heavy pages
- Files: `src/components/inventory/InventoryReports.tsx`, `src/components/legal/LawsuitDataPage.tsx`, `src/components/finance/GeneralLedger.tsx`, etc.
- Add `ResponsiveTable` wrapper and `DataList` mobile fallback.

### B4: Replace deep modals on mobile
- Files: pages with heavy modal usage (`ContractDetailsPageRedesigned.tsx`, `LegalCasesTracking.tsx`, etc.)
- Use slide-over or dedicated route for complex workflows on small screens.

---

## Sprint C — Tasks

### C1: Standardize `EmptyState` + skeletons
- File: `src/components/ui/EmptyState.tsx`
- Audit list pages and ensure every list/search/error state uses it.
- Add skeleton variants for dashboard/list/detail.

### C2: Re-enable manual onboarding tour
- Files: `src/hooks/useOnboarding.ts`, `src/components/dashboard/bento/BentoDashboard.tsx`
- Add "Start tour" button in header/help; re-enable joyride with robust selectors.

### C3: Surface global search with ⌘K
- Files: `src/components/search/QuickSearch.tsx`, layout wrappers
- Render in all authenticated layouts; add visible top-bar input and keyboard shortcut.

### C4: Translate top 100 labels
- Files: `public/locales/ar/*.json`, `public/locales/en/*.json`
- Add missing namespaces: contracts, customers, finance, fleet, legal, dashboard.
- Replace top hardcoded labels with `t()` keys.

---

## Verification

- `npm run type-check` must pass after each task group.
- `npm run build:ci` must pass before final report.
- Browser spot-check: `/login` → `/auth`, auth page RTL, nav items ≤8, no console errors.
- Mobile viewport: table cards render, no horizontal overflow.

---

*Plan generated for Phase 5 implementation. Start with Quick wins, then proceed Sprint A → B → C.*
