# Professional statement of financial position

The report is available at `/finance/reports/balance-sheet`. For the requested comparison, use `?asOf=2026-08-31&compare=2025-12-31`. A separate year-end statement can use `?asOf=2025-12-31`.

## Preparing and reviewing a statement

1. Select the statement date and an optional earlier comparison date. Dates are interpreted using the finance calendar, Asia/Qatar.
2. Review signed assets, liabilities, equity, and cumulative unclosed earnings. Resolve blocking readiness findings. Check warnings against supporting records.
3. In the chart of accounts, explicitly classify each asset and liability as current or non-current. Contra-asset accounts have explicit matching classifications. Editing unrelated fields preserves old classifications; the feature does not recategorize historical data automatically.
4. Add preparation notes and save a fixed version. The database calculates and stores the amounts, source fingerprint and preparer identity. The client cannot submit statement amounts or approval metadata.
5. A different authorized user opens the saved version, completes the five review confirmations, enters a review conclusion, and records internal approval. Source changes require a newly saved version. Arithmetic balance alone never establishes approval.
6. Export the selected version to PDF or Excel, or print. Every PDF page identifies the company, statement date, version status and source fingerprint. Drafts remain clearly marked. Internal approval is not an external auditor's certification.

Saved content cannot be edited or deleted through application roles. An authorized preparer/reviewer can void a version with a reason; its contents, approval and event history are retained. Voided versions cannot be issued from the screen. The screen lists the latest 50 versions and rechecks the saved version's status with the server immediately before each export. It refuses issuance when that status is unavailable, revoked, or cannot be verified.

## Accounting source

The server reads **all** posted journal entries and lines cumulatively through each cutoff, with company isolation and without a REST row-limit truncation. It retains signed contra balances, inactive accounts with historical activity, and legacy posting accounts. Account classifications never default silently to current assets/liabilities.

Unclosed earnings are cumulative revenue less expenses after posted closing entries. The result can include earlier years and is not labeled as annual profit. Posted reversals affect their accounting dates. Ambiguous legacy `reversed` statuses or invalid reversal links block approval rather than inventing the original posting state. Draft entries are disclosed and excluded from balances.

Checks cover malformed/imbalanced journals, header totals, missing/cross-company accounts, unknown or unclassified accounts, the accounting equation, empty ledgers and missing company identity/currency. Vehicle completeness warnings explicitly describe the **current** vehicle register, not a reconstructed historic asset register.

For this company's 2025/2026 preparation, supporting asset cost/purchase dates, depreciation, capital, expenses, liabilities and bank/subledger reconciliations still require accounting review. No missing amounts are manufactured by this change.

## Storage and permissions

- Migration: `supabase/migrations/20260918001000_professional_balance_sheets.sql`.
- Saved reports: `public.professional_balance_sheet_reports`.
- Protected event log: `balance_sheet_private.report_events`.
- RPCs: `get_professional_balance_sheet_v1`, `list_professional_balance_sheets_v1`, `save_professional_balance_sheet_v1`, `approve_professional_balance_sheet_v1`, `void_professional_balance_sheet_v1`.
- All actions require an active profile in the currently selected company and `finance.reports.view`. Save requires `finance.reports.save`; review requires `finance.reports.approve`. Managers can view/save, while approval defaults to accountant/admin roles. Explicit permission denials override fallback roles. Explicit employee system-access revocation/suspension also blocks access. The database, not the UI permission catalog, is authoritative.
- Approval briefly locks source tables in SHARE mode to prevent a ledger write from racing the source verification. The five-second lock timeout fails rather than waiting indefinitely. Schedule approval outside busy posting runs if contention occurs.

The source fingerprint includes the relevant journals, lines, account metadata, company identity and current vehicle-readiness facts. A net-zero correction still invalidates an older draft. Changing display language or viewer permissions does not change source identity.

## Installation and rollback

Install only the named migration after schema preflight; do not push unrelated pending migrations. Publish the frontend after the migration is available. Without it, the screen displays an explicit service-installation error and does not export partial data. This feature does not depend on deploying older, unrelated financial-report migrations.

The matching rollback disables the report commands while preserving saved reports, review metadata, protected events, RLS and immutability. Revert the frontend release when rolling back. The rollback deliberately does not destroy previously issued records.

## Verification

`npm run type-check` and `npm run build:ci` verify the application build. `node scripts/run-finance-ci.cjs --offline` includes SQL, service validation, UI transitions, account-classification, presentation and export tests without writing live financial snapshots. `tests/visual/professional-balance-sheet` provides synthetic Arabic/English desktop and small-screen fixtures and real browser A4 pagination checks.

Live deployment and accounting approval are separate from these local checks; neither should be inferred from a successful test run.
