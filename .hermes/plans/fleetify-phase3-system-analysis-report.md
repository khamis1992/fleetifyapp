# Fleetify — Phase 3: System Analysis Report

> Repo: `C:/Users/khamis/Documents/fleetifyapp`  
> Date: 2026-06-17  
> Phase 2 status: ✅ complete (build:ci PASS, type-check PASS)

---

## 1. Security — CRITICAL

### 1.1 Secrets committed to Git (CRITICAL)
- `.env` is **tracked in git** and contains live values:
  - `VITE_SUPABASE_SERVICE_ROLE_KEY` — service-role key bundled into client JS if read by Vite
  - `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `VITE_ENCRYPTION_SECRET`
- `.env.production`, `.env.build`, `.env.test`, `.env.example`, `.env.production.template` are also tracked.
- `.gitignore` only ignores `.env*.local` and duplicated lines; it does **not** ignore `.env`, `.env.production`, etc.
- `src/lib/validateEnv.ts` hardcodes **real Supabase URL and anon key** as `FALLBACK_SUPABASE_*` for mobile builds.
- **Impact:** Anyone with repo access has full admin DB access; service-role key could be bundled into production JS.

**Remediation (immediate):**
1. Rotate all Supabase keys immediately.
2. Add `.env`, `.env.*` (except `.env.example` and `.env.production.template`) to `.gitignore`.
3. Strip `.env*` files from git history (`git filter-repo` or BFG).
4. Remove hardcoded fallback URL/key from `validateEnv.ts`; use build-time injection for mobile only.
5. Ensure `VITE_*` is never used for server-side secrets (edge functions should use `SUPABASE_*`, not `VITE_SUPABASE_*`).
6. Add pre-commit secret scan (e.g. `git-secrets` or `detect-secrets`).

### 1.2 Edge functions with missing authorization / company isolation (HIGH)
15 edge functions never verify the caller or the company context:
- `auto-submit-taqadi`, `customer-id-ocr`, `deepseek-ocr`, `extract-traffic-violations`, `intelligent-contract-processor`, `manus-taqadi`, `monitoring-collector`, `olmocr`, `pdf-ocr`, `taqadi-automation`, `upload-legal-document`, `vehicle-ocr`
- `upload-legal-document` creates a Supabase client with `SUPABASE_SERVICE_ROLE_KEY` and uploads to `documents` bucket with no caller validation; any anonymous caller with the URL can upload.
- Several OCR functions use `Access-Control-Allow-Origin: *` with no API-key/auth check beyond optional provider keys.

**Remediation:**
- Require `Authorization` header with Supabase JWT in all stateful edge functions.
- Verify `company_id` claim matches the requested resource.
- For OCR/utility functions that are stateless, at least validate the JWT and log usage per company.

### 1.3 Client-side exposure of service-role concepts
- No direct usage of `VITE_SUPABASE_SERVICE_ROLE_KEY` in `src/` code found, but tracked `.env` files make it trivial to leak via build.
- Edge functions should not read `VITE_*` variables; some may accidentally because env files are shared.

### 1.4 CORS headers too permissive
Multiple edge functions return `Access-Control-Allow-Origin: *`, which is acceptable for public webhooks but not for authenticated endpoints.

---

## 2. Multi-Tenancy — HIGH

### 2.1 Company isolation in frontend
- `company_id` appears in 364 `src/` files and most queries include it.
- `CompanyContextProvider` provides stable company ID and invalidates React Query on company change — good pattern.
- **69 files** use `supabase.from(...)` but contain no `company_id`, `useCompany`, `CompanyContext`, or `useUnifiedCompanyAccess` reference. These are candidates for missing tenant filters.
- Heuristic only; some may rely on RLS or rpc. Need manual review.

### 2.2 Route-level access control
- Route registry has 130 `protected: true` routes.
- Only 19 routes define `requiredRole` and 2 use `requiredPermission/permission`.
- Most protected routes rely on `ProtectedRoute` checking authentication and company init, but not fine-grained permissions.
- `ProtectedRoute` has a 1.5s timeout that can force-render on slow auth; this is a workaround, not a robust access-control mechanism.

### 2.3 RLS policies
- 301 migrations, 225 RLS `enable` statements, 108 migrations create policies.
- No `disable row level security` found in migrations.
- RLS is clearly intended, but frontend must still pass `company_id` for performance and defense in depth.

### 2.4 Backend API
- `fleetify-backend/` exists as an empty directory in this checkout. No backend code audited.

---

## 3. Financial Module — MEDIUM

### 3.1 CLAUDE.md financial naming rules
- `chart_of_accounts` uses `account_name` and `account_name_ar` (no `account_name_en`) — ✅ correct.
- `journal_entry_lines` uses `line_description` and `line_number` — ✅ correct.
- `journal_entries` has `description` — ✅ correct (header description).

### 3.2 JournalEntryForm.tsx observation
- Local line type uses `description` and maps to `line_description` on save (line 238) — ✅ correct mapping.
- Uses `account_name` to display selected account — consistent.

### 3.3 Potential gaps
- Only 63 files use `line_description`; many financial components still reference generic `description` — need to ensure they refer to the right table column.
- Did not find use of `account_name_en` in types — good.
- No automated tests were run for finance correctness beyond type-check.

---

## 4. RTL / i18n — MEDIUM

### 4.1 i18n infrastructure
- i18next + react-i18next + browser detector configured in `src/lib/i18n/config.ts`.
- Supported languages defined: en, ar, fr, es, de, zh — but only en/ar translations exist in `public/locales/`.
- `public/locales/en/common.json` has 17 keys, `ar/common.json` 17 keys — fully matched.
- `en/fleet.json` 18 keys, `ar/fleet.json` 18 keys — fully matched.
- Namespaces like `contracts`, `customers`, `financial`, `dashboard`, etc. are declared in config but **no JSON files exist for them**. Loading these namespaces will fall back to key names.

### 4.2 Translation usage in code
- Only **2 source files** actually call `t()` outside tests: `src/__tests__/i18n.test.tsx` and `src/hooks/useTranslation.tsx`.
- The rest of the app appears to rely on **hardcoded Arabic/English strings** or the `accountNamesTranslation` map for finance terms.
- Hardcoded strings detected:
  - 686 `label:` / `title:` / `placeholder:` / `description:` patterns with English values.
  - 501 direct JSX text children that are English.
  - Many components (e.g., `InvoiceScannerAnalytics.tsx`, `IntelligentInvoiceScanner.tsx`) are almost entirely English.

### 4.3 RTL implementation
- `index.html` hardcodes `dir="rtl"` and `lang="ar"` — correct for Arabic-first app.
- `I18nProvider` applies `dir` and `lang` dynamically based on current language.
- `useFleetifyTranslation` provides `rtl`, `textDirection`, and `renderMixedContent` helpers.
- Tailwind responsive classes exist (`md:` 903, `sm:` 339) — responsive layout is partially implemented.

### 4.4 Arabic quality
- `accountNamesTranslation.ts` provides good Arabic finance term mappings.
- Many UI labels are still hardcoded English; switching to English/Arabic will leave English labels visible in Arabic mode.

---

## 5. Mobile / Capacitor — MEDIUM

### 5.1 Capacitor configuration
- Capacitor 6.x installed for iOS/Android.
- `capacitor.config.ts`: `appId: 'com.alaraf.fleetify'`, `webDir: 'dist'`, cleartext allowed, `allowNavigation: ['*']`.
- Android `webContentsDebuggingEnabled: true` — must be disabled for production builds.
- Scripts exist for `build:mobile`, `android:build`, `ios:build`, `mobile:sync`.

### 5.2 PWA
- `public/manifest.json` exists with Arabic name, RTL direction, icons.
- `index.html` references manifest and has viewport meta.
- `dist/sw.js` exists from build.

### 5.3 Mobile-specific components
- 40 mobile-related files including `MobileLayout`, `MobileFormWrapper`, `MobileDatePicker`, `MobileInput`, `TouchOptimization`, `FABMenu`, `VoiceInput`, mobile employee views.

### 5.4 Concerns
- `allowNavigation: ['*']` and `cleartext: true` weaken mobile security; restrict to app domain.
- WebView debugging enabled — must be production-gated.
- Mobile responsive Tailwind usage is moderate; many desktop-heavy tables may not be optimized for 430px width.

---

## 6. Build & Code Quality

- `npm run type-check`: ✅ PASS
- `npm run build:ci`: ✅ PASS (56s)
- Lint: 8,121 issues (439 errors, 7,682 warnings) — unchanged from Phase 2.
- Console statements in `src/`:
  - `console.log`: 1,231
  - `console.error`: 1,595
  - `console.warn`: 308
  - `console.debug`: 14
  - `console.info`: 4
- These should be removed or gated before production.

---

## 7. Summary of Severities

| Area | Critical | High | Medium |
|------|----------|------|--------|
| Security | 2 (secrets in git, permissive CORS/upload edge fn) | 2 (15 edge fns missing auth/company, hardcoded fallback keys) | 1 (VITE_ naming for secrets) |
| Multi-tenancy | 0 | 1 (69 frontend files possibly missing company filter) | 2 (route roles sparse, RLS not manually verified on all tables) |
| Finance | 0 | 0 | 2 (description vs line_description confusion, no finance tests) |
| RTL/i18n | 0 | 1 (missing namespaces cause key-name fallback; hardcoded English pervasive) | 2 (t() rarely used, HTML hardcoded RTL) |
| Mobile/Capacitor | 0 | 0 | 2 (webview debug, allowNavigation '*') |

---

## 8. Immediate Action Items (before go-live)

1. **Rotate Supabase keys** and purge `.env*` files from git history.
2. **Fix `.gitignore`** to ignore all `.env*` except templates.
3. **Remove hardcoded fallback Supabase credentials** from `src/lib/validateEnv.ts`.
4. **Add auth/company validation** to the 15 edge functions currently missing it.
5. **Audit the 69 frontend files** flagged for missing `company_id` filters; add explicit filters or document RLS reliance.
6. **Expand translation coverage** from 35 keys to all customer-facing strings; replace hardcoded labels with `t()`.
7. **Add translation files** for declared namespaces (`contracts`, `customers`, `financial`, `dashboard`, etc.).
8. **Harden Capacitor config** for production: disable WebView debugging, restrict `allowNavigation`.
9. **Strip console logs** or replace with a production-safe logger.
10. **Fix lint errors** (439 errors) before CI gating.

---

*Report generated during Phase 3 system analysis. Phase 4 (UX improvement proposals) will build on these findings.*
