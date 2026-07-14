# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.
Kept in sync with `CLAUDE.md` — both files contain identical guidance.

## Project Overview

**Fleetify** is a comprehensive ERP system for car rental and fleet management, built for شركة العراف لتأجير السيارات (Al-Araf Car Rental) in Qatar.

- **Company ID**: `24bc0b21-4e2d-4413-9842-31719a3669f4`
- **Currency**: QAR (Qatari Riyal)
- **Deployment**: Vercel (https://www.alaraf.online)

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite 7
- **UI**: shadcn/ui (Radix UI primitives) + Tailwind CSS
- **State**: React Query (@tanstack/react-query)
- **Backend**: Supabase (PostgreSQL 17.6)
- **Routing**: React Router v6 with centralized route registry (`src/routes/index.ts`)
- **i18n**: i18next (Arabic/English, RTL support) — 18 translation namespaces
- **Charts**: Recharts
- **Mobile**: Capacitor (iOS/Android)

## Essential Commands

```bash
npm run dev              # Dev server on port 8080
npm run build:ci         # Production build (npx vite build — skips tsc!)
npm run preview          # Preview production build
npm run type-check       # Full TS check (app + node configs, needs 8GB heap)
npm run lint             # ESLint
npm run test:run         # Vitest once
npm run test:e2e         # Playwright E2E (requires dev server on 8080)
npm run finance:ci       # Financial integrity checks
```

**Critical**: `build:ci` runs `npx vite build` directly — it does NOT type-check. Always run `type-check` separately before deploying.

## Architecture

### Route Registry (`src/routes/index.ts`)
All routes are centrally defined with config objects: `path`, `component` (lazy or eager), `protected`, `layout` (`bento`/`admin`/`none`), `requiredRole`, `group`, `priority`. Route groups: `public`, `dashboard`, `finance`, `customers`, `contracts`, `fleet`, `admin`, `legal`.

### Context Providers (App.tsx)
`AuthProvider` → `CompanyContextProvider` → `FABProvider` → `FinanceProvider` → `MobileOptimizationProvider` → `AIChatProvider`

### Component Organization
- `src/components/{domain}/` — feature components (contracts, customers, fleet, finance, legal, hr, etc.)
- `src/components/common/` — shared UI
- `src/components/ui/` — shadcn/ui base
- `src/pages/` and `src/pages/{domain}/` — page-level components
- `src/hooks/` — custom hooks organized by domain (`api/`, `business/`, `company/`, `finance/`, `integrations/`)

## Critical Gotchas

### 🔴 i18n: NEVER call t() at module scope

`useFleetifyTranslation` (from `src/hooks/useTranslation.tsx`) provides `t()` only inside React component bodies. Calling `t()` at module scope (e.g., `const arr = [{ label: t('key') }]` outside a component) throws `ReferenceError: t is not defined` and crashes lazy-loaded routes.

**Fix**: Use English literal strings for module-scope arrays, or restructure arrays into component bodies. The `t()` function is safe inside components, hooks, and event handlers.

### 🔴 React single-instance aliases (vite.config.ts)

The vite config has critical aliases that force a single React instance. Do NOT remove or modify these:
```ts
{ find: /^react$/, replacement: path.resolve(__dirname, './node_modules/react/index.js') },
```
Removing them causes "useState is null" / "createContext" errors in production.

### 🔴 build:ci skips type checking

`npm run build:ci` runs `npx vite build` — no `tsc`. Type errors only surface at runtime or via `npm run type-check`. Always run both before deploying.

### 🔴 Supabase types file is 32K+ lines

`src/integrations/supabase/types.ts` is enormous. Never read it whole — use grep or LSP to find specific types.

## Database Rules

### Never guess column names — verify first

| ❌ Wrong | ✅ Correct | Table |
|----------|-----------|-------|
| `description` | `line_description` | `journal_entry_lines` |
| `level` | `account_level` | `chart_of_accounts` |
| `parent_code` | `parent_account_code` | `chart_of_accounts` |
| `account_name_en` | `account_name` | `chart_of_accounts` |
| `status` | `payment_status` | `payments` |

### Pre-flight checklist for any DB change:
1. Read `docs/DATABASE_REFERENCE.md` (285 tables documented)
2. Verify schema via `information_schema` or Supabase MCP
3. Check `src/integrations/supabase/types.ts` for TypeScript types
4. Write reversible migrations with matching rollbacks
5. Migration naming: `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
6. Rollback naming: `supabase/rollbacks/YYYYMMDDHHMMSS_description.rollback.sql`

### Financial system rules:
- `chart_of_accounts`: only `is_header = false AND account_level >= 3` can have postings
- `journal_entry_lines`: each entry must have ≥2 lines, balanced debits/credits
- Always filter by `company_id` — RLS policies enforce company isolation

## Build & Deploy

- **Package manager**: npm (verify `package-lock.json` exists, not pnpm)
- **vercel.json** uses `npm install --production=false`
- **Pre-deploy**: `npm run build:ci && npm run preview` — verify no forwardRef errors in console
- **React must stay in main bundle** — the vite config explicitly returns `undefined` for React chunks to prevent context errors

## Testing

- Unit: Vitest + @testing-library/react (`src/__tests__/`, co-located `__tests__/`)
- E2E: Playwright (`tests/`), dev server must be running on port 8080
- Financial CI: `npm run finance:ci` (without DB) or `npm run finance:ci:required` (with DB)

## Localization

- Primary: Arabic (RTL), Secondary: English (LTR)
- Hook: `useFleetifyTranslation(namespace)` from `src/hooks/useTranslation.tsx`
- Namespaces defined in `src/lib/i18n/config.ts` (common, navigation, fleet, contracts, customers, financial, legal, hr, inventory, sales, reports, dashboard, settings, errors, validation, businessRules, ui)
- Translation files: `src/locales/`
- **Never call `t()` at module scope** — see Critical Gotchas above

## Common Pitfalls

| Issue | Cause | Solution |
|-------|-------|----------|
| `ReferenceError: t is not defined` | `t()` called at module scope | Use English literals or move into component body |
| Blank page in production | React chunked separately | Keep React in main bundle (vite config handles this) |
| forwardRef undefined | Radix UI chunking | Add to `optimizeDeps.include` |
| Type errors | Missing DB columns | Verify in `docs/DATABASE_REFERENCE.md` |
| RLS policy errors | Missing `company_id` filter | Always include `company_id` in queries |
| `useState is null` | Multiple React instances | Don't modify React aliases in vite.config.ts |
