# Fleetify — Phase 1 Repository Analysis Report

**Repo:** `C:\Users\khamis\Documents\fleetifyapp`  
**Date:** 2026-06-17  
**Status:** Phase 1 complete. Cleanup/system/UX still pending.

---

## 1. Repository Scale

| Metric | Value |
|--------|-------|
| Total files scanned (excl node_modules/dist/.git) | ~3,943 |
| `.tsx` files | 1,335 |
| `.ts` files | 974 |
| `.sql` files | 381 (467 incl `.archive`) |
| `.md` files | 838 |
| `.archive` files | 974 (~109.9 MB) |
| Dependencies | 118 |
| DevDependencies | 49 |

**Top `src` folders by file count:**
- `components/` — 1,079
- `hooks/` — 413
- `pages/` — 278
- `utils/` — 111
- `lib/` — 74
- `services/` — 64
- `modules/` — 54

---

## 2. Architecture

- **Stack:** React 18 + TypeScript + Vite + SWC plugin
- **UI:** shadcn/ui + Radix UI primitives + Tailwind CSS
- **State:** TanStack Query (React Query)
- **Backend:** Supabase (PostgreSQL) + Express server in `src/server/`
- **Mobile:** Capacitor (iOS/Android)
- **I18n:** i18next, Arabic/English RTL
- **Routing:** Centralized registry in `src/routes/index.ts` (~56 KB)

**Route registry stats:**
- ~151 route objects
- 130 protected routes
- 144 lazy-loaded routes
- 11 `super_admin` only, 8 `admin` only

**Key hub files (most imported):**
1. `src/components/ui/button.tsx` — 800 imports
2. `src/components/ui/badge.tsx` — 661
3. `src/components/ui/card.tsx` — 660
4. `src/integrations/supabase/client.ts` — 622
5. `src/lib/utils.ts` — 384
6. `src/components/ui/input.tsx` — 318
7. `src/contexts/AuthContext.tsx` — 312

---

## 3. Dead / Orphaned Code

### Orphan source files in `src/` (not imported by any alias or relative import)
- **1,009 files** out of 2,201 source files (~46%) are never imported.
- This includes ~142 pages not registered in `src/routes/index.ts`.
- Many component folders contain dozens of files that appear unused.

> **Caveat:** Some files may be referenced by dynamic string concatenation or barrel files that re-export them. Further verification needed before deletion.

### Duplicate / variant files
- 21 files with `Redesigned` suffix
- 8 `Demo` files
- 5 `New` files
- 18 probable duplicate groups (e.g. `ContractHeader.tsx` + `ContractHeaderRedesigned.tsx`).

### Deprecated artifacts
- `.archive/` contains 974 files / ~110 MB of old extensions, scripts, SQL dumps, reports.
- `apps/finance/vite.config.ts`, `apps/main/vite.config.ts`, `backup-1763846132785/` suggest prior failed monorepo migrations.

---

## 4. Dependencies

- 118 production dependencies; 49 dev dependencies.
- Likely **unused** production deps (never imported in `src/`):
  - `@fontsource/cairo`
  - `html-to-docx`
  - `i18next-resources-to-backend`
  - `openai`
  - `react-resizable`
  - `tailwindcss-animate`
  - `terser`
  - `three`
- Many `@types/*` packages are in `dependencies` instead of `devDependencies`.
- `@tailwindcss/postcss` present despite project using PostCSS v7-style config likely.

---

## 5. Code Quality

| Check | Result |
|-------|--------|
| `npm run type-check` | ✅ PASS |
| `npm run lint` | ❌ **7,996 issues** (437 errors, 7,559 warnings) |
| Top lint rule violations | `no-unused-vars` 3,417 / `no-explicit-any` 3,199 / `no-non-null-assertion` 524 |

**Other quality signals:**
- `console.log` calls: **2,118**
- `: any` usages: ~2,346
- `debugger` statements: 1
- TODO mentions: 65

---

## 6. Circular Dependencies

Only **4 real cycles** detected (depth ≤5):
1. `LazyPageWrapper` ↔ `pages/Finance.tsx`
2. `AccountingSystemWizard` ↔ `hooks/useAccountingWizard.ts`

These are low-risk but should be broken for long-term maintainability.

---

## 7. Internationalization

- Translation files in `public/locales/{en,ar}/{common,fleet}.json`.
- 642 total keys, kept in sync between languages.
- Only ~181 key usages found in `src/` — most keys appear unused (likely because many components are not currently mounted or the regex missed dynamic key construction).
- RTL infrastructure exists but needs verification in active components.

---

## 8. Security / Production

- `.env` files are **committed to the repo** (`.env`, `.env.build`, `.env.production`, `.env.test`).
- `.env` contains `VITE_SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_ENCRYPTION_SECRET`.
- These are **high-severity** findings: service-role keys and encryption secrets should never be in source control.
- `vercel.json` is configured correctly (`npm install`, `npm run build:ci`).
- Capacitor config has `webContentsDebuggingEnabled: true` flagged for Android — ensure this is disabled in release builds.

---

## 9. Key Risks

1. **Massive dead-code surface** (~46% of `src/` unused). Increases build time, confusion, and bug surface.
2. **Committed secrets** in `.env` files — immediate security risk.
3. **Lint is effectively red** (7,996 issues). Code quality gates are not enforced.
4. **Duplicate file variants** create confusion and drift.
5. **.archive is 110 MB** — bloats repo clone/push.
6. **Unused dependencies** increase bundle size and supply-chain risk.
7. **Many finance/accounting pages are orphaned** — suggests financial features were partially built or disconnected.

---

## 10. Recommendations (Pre-Cleanup)

1. **Rotate all secrets immediately** and move `.env` files to `.gitignore` + secure vault.
2. **Do not delete orphan files blindly** — verify against route registry, barrel exports, and dynamic imports.
3. **Archive strategy:** Move `.archive/` to external storage or Git LFS; do not keep 110 MB in the working tree.
4. **Start cleanup with safe targets:**
   - `src/pages/finance/*` orphans (if no routes reference them)
   - `*Redesigned.tsx` / `*New.tsx` variants after confirming which is active
   - Components with zero imports and no barrel re-exports
5. **Set lint baseline:** Run `eslint --fix` to auto-fix 66 fixable issues; triage remaining errors by rule.
6. **Remove/move unused dependencies** after confirming no server/build-time use.
7. **Break the 4 circular dependencies** by extracting shared types/hooks.

---

## Next Steps

Phase 2 (Repo Cleanup) should:
1. Export the full orphan list to a CSV.
2. Verify top 100 orphans against barrel exports and route registry.
3. Move confirmed dead non-TS assets (old markdown, reports, SQL dumps) to external archive.
4. Delete confirmed duplicate/variant TSX files in small batches, fixing barrels after each batch.
5. Run `npm run type-check` and `npm run build:ci` after each batch.

## Phase 2 — Cleanup Results (Completed)

### Actions Taken
- **Archive `.archive` folder**: Moved entire `.archive` directory (974 files, ~110 MB) out of repo to `C:\Users\khamis\Documents\fleetify_archive\.archive`.
- **Restore live doc**: Restored `docs/DATABASE_REFERENCE.md` from archive (needed for future DB work).
- **Batch 1 — dead source files**: Moved 36 TS/TSX files that were neither directly imported nor re-exported via a live barrel.
- **Batch 2 — duplicate/variant source files**: Moved 23 redundant variant files (`*Redesigned.tsx`, `*New.tsx`, `*V2.tsx`, `.ts`/`tsx` duplicates).
- **Fixed barrel exports and route registry** to point to the surviving canonical files.
- **Fixed broken imports**: removed dead imports from `Finance.tsx` and stale route object for `HeroDemo`; resolved circular/wrapper component references.

### Verification
| Check | Result |
|-------|--------|
| `npm run type-check` | ✅ PASS |
| `npm run build:ci` | ✅ PASS |
| Duplicate/variant groups | 0 remaining |
| Live orphan count | significantly reduced (initial ~1,009 direct orphans reduced after barrel-aware scan; many were barrel-re-exported) |

### Files Created/Updated
- `.hermes/plans/fleetify-phase2-cleanup-summary.json`
- `.hermes/plans/fleetify-cleanup-batch2-log.json`
- `.hermes/plans/fleetify-orphan-files-updated.csv`
- External archive: `C:\Users\khamis\Documents\fleetify_archive`

### Security Note
- `.env.production` and `.env` secrets remain exposed in Git history and must be rotated/revoked (not addressed in this phase).
