# Financial statement package verification — 18 September 2026

Status: implemented and verified locally. No production migration, frontend release, real financial entry, approval or period lock was performed. The earlier read-only deployment lookup returned Vercel HTTP 403; this implementation does not claim that deployment access has been restored.

## Automated verification

- Full application and Node TypeScript checks passed.
- Production Vite build passed; existing large bundle, Browserslist and OpenCV externalization warnings remain.
- Offline financial CI passed: 477 tests, with live database checks and health-snapshot writes explicitly disabled. It includes the package tests alongside the existing finance, permissions, reconciliation and lifecycle suites.
- New package service/validation: 39 tests. Screen workflow: 12 tests. Export: 31 tests. These include actual SQL-generated JSON, tampered line details, third-position and unclassified drafts, tenant scope, dated comparisons, independent approval, revoked versions and numeric spreadsheets.
- Package PostgreSQL-compatible tests: 23 passed. Existing balance-sheet SQL tests: 23 passed, including the added transaction-isolation guard. Period-lock SQL tests: 13 passed.
- Native PostgreSQL package concurrency test passed against a new temporary local cluster. It proves source changes committed during a lock wait invalidate approval, and source writers wait until the approval transaction commits. Balance-sheet and period-lock native concurrency tests also passed during this work.
- Focused ESLint completed with zero errors; non-null assertion style warnings remain at validated boundaries.

## Browser verification

The production screen and exporter were exercised with isolated synthetic data, including Arabic/English, 390px mobile layout, reviewer/preparer differences, recalculation after changing dates and actual PDF/XLSX downloads. At browser verification, normal packages rendered as 11 A4 pages and stress packages as 16 pages, with no measured overflow. See [browser evidence](../../tests/visual/financial-statement-package/QA.md). The later stricter validation checks and corresponding fixture details were covered by the automated suites. No real company statement or approval was created during these checks.

## Release scope

The package adds the financial-statement types, configuration/validation/export utilities, service, hooks and two finance components; the existing route panel, reports navigation and finance query synchronization connect them. The balance-sheet screen links to the package. Synthetic fixtures and SQL/UI/export tests remain separate from company records.

Install only `20260918001000`, `20260918002000` and `20260918003000` in dependency order, after target-schema preflight, then deploy the matching frontend. Do not include unrelated pending legal/document edits or migrations. See [implementation and installation notes](financial-statement-package.md) and [period-lock behavior](reporting-period-locks.md).

Authenticated end-to-end verification against the deployed services remains a post-installation step. Software verification does not establish that the company's data is complete, that a particular reporting framework applies, or that an external recipient has accepted the report. Company accounting data and supporting disclosures remain the next preparation stage requested by the user.
