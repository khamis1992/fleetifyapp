# Verification — 18 September 2026

Status: implemented and tested locally. The database migration has **not** been applied to production and the frontend has **not** been published. A read-only Vercel deployment lookup using the existing local session returned HTTP 403 (Not authorized). No accounting entries or company balances were changed.

## Passed

- Full app and Node TypeScript checks: `npm run type-check`.
- Final production build: `npm run build:ci` (1m39s). Existing large-chunk, Browserslist and OpenCV browser-externalization warnings remain.
- Financial permission coverage: 12 actions, 6 field guards, 7 segregation rules, 62 enforcement files.
- Offline finance CI passed. The final focused suite passed **92 tests** across service validation, report UI, classification editing, presentation and exports.
- Final isolated PostgreSQL-compatible suite: **22 tests** for complete cumulative balances, signed contra accounts, comparisons, closing/reversal treatment, malformed data, tenant access, manager/preparer/reviewer permissions, immutable snapshots, audit history and preserving rollback.
- One additional native PostgreSQL concurrency test passed: approval detects changes committed while waiting; source writes cannot race the approval transaction. Run with `BALANCE_SHEET_NATIVE_CONCURRENCY=1` when a local PostgreSQL runtime is available.
- Read-only live schema preflight confirmed required tables/columns/types/helper functions and built-in SHA-256/UUID functions. The new table/schema names do not collide with production objects.

## Actual browser checks using synthetic data

- Arabic report, signed depreciation and prior-period-only accounts rendered correctly.
- At a 390px browser viewport, the application document had no horizontal overflow (document width 375px excluding scrollbar).
- Arabic A4: normal report 3 pages, long names/notes 10 pages; zero measured horizontal/vertical overflows.
- English A4: normal report 3 pages, stress report 11 pages; zero measured overflows beyond the one-pixel rounding tolerance. Conflicting global RTL styles were contained in the report/export styles.
- Actual PDF button generated a parseable `%PDF-` document: 3 pages, each **210 × 297 mm**, 718,380 bytes for the English fixture.
- Actual Excel button generated a 13,045-byte XLSX ZIP container. Automated workbook roundtrip checks preserve numeric negatives/comparisons and safe text cells.
- Final production preview rendered the protected-route login screen with no browser console errors. Authenticated production RPC end-to-end behavior remains a post-installation check; it was not simulated as a successful deployment.

## Release scope

App implementation:

- `src/components/finance/BalanceSheetReport.tsx` and `.css`
- `src/components/finance/enhanced-editing/EnhancedAccountEditDialog.tsx`
- `src/hooks/finance/useProfessionalBalanceSheet.ts`
- `src/services/professionalBalanceSheet.ts`
- `src/services/financialQuerySynchronization.ts`
- `src/types/balanceSheet.ts`
- `src/types/permissions.ts`
- `src/utils/balanceSheetPresentation.ts`
- `src/utils/balanceSheetExport.ts`

Infrastructure and verification:

- `supabase/migrations/20260918001000_professional_balance_sheets.sql`
- `supabase/rollbacks/20260918001000_professional_balance_sheets.rollback.sql`
- `tests/database/professional-balance-sheets.test.mjs`
- `scripts/check-finance-permission-coverage.cjs`, `scripts/run-finance-ci.cjs`
- Report service/UI/classification/export tests and synthetic fixtures under `src/**/__tests__`, `src/test/fixtures/professionalBalanceSheet.ts`
- `tests/visual/professional-balance-sheet/`
- This document and `professional-balance-sheet.md`

Keep unrelated pending legal/document changes and earlier standalone financial drafts outside this release. The current checkout also differs from `origin/main`; select the intended release baseline explicitly before publishing.

After installation, verify the report as an authorized preparer for **2025-12-31** and **2026-08-31**, then have a different authorized reviewer approve only after blocking data findings and supporting accounting records have been resolved. Do not treat successful software verification as validation of missing company balances.
