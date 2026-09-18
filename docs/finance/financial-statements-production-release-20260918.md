# Financial statements production release — 18 September 2026

## Current status

The user explicitly authorized publication. All five reporting migrations are installed on production Supabase project `qwhunliohlkkahbspfiu`. Frontend deployment `dpl_9SxQb4X522ro2EQyzuBNV9yKWQ26` is `READY` and activated on [www.alaraf.online](https://www.alaraf.online). Production HTTP verification returned 200 and the exact local prebuilt index, with `X-Frame-Options: DENY`.

The release adds reporting functionality. No financial entry, report approval, saved statement or accounting-period lock was created as part of installation verification.

## Installed database migrations

The migration service recorded the following production versions. These are the remote application timestamps, which differ from the local source filenames. The fourth migration targets reporting request timeouts; the fifth removes repeated cutoff reads and quadratic JSON accumulation.

| Local migration source | Recorded production version | Recorded name |
| --- | --- | --- |
| `20260918001000_professional_balance_sheets.sql` | `20260917235302` | `professional_balance_sheets` |
| `20260918002000_financial_statement_packages.sql` | `20260917235336` | `financial_statement_packages` |
| `20260918003000_financial_reporting_period_locks.sql` | `20260917235406` | `financial_reporting_period_locks` |
| `20260918004000_financial_report_request_budget.sql` | `20260918002919` | `financial_report_request_budget` |
| `20260918005000_financial_report_calculation_performance.sql` | `20260918014423` | `financial_report_calculation_performance` |

The versions and names were confirmed directly from `supabase_migrations.schema_migrations` using a metadata-only query after installation.

## Database verification completed

- Required production helper signatures, accounting-period constraints and existing journal triggers were reviewed before installation; no blocking incompatibility or naming collision was found.
- All three public reporting tables have row-level security enabled. Authenticated users have read access subject to policies; direct insert, update and delete privileges are denied. Anonymous access is denied.
- The 13 public reporting RPCs are installed. Anonymous execution is denied and authenticated execution is available as designed.
- The three period-lock RPCs use `SECURITY DEFINER` with a fixed empty `search_path` and explicit authorization through `balance_sheet_private.has_access`. Lock and unlock commands also use a five-second lock timeout.
- The four private audit/capability tables have row-level security enabled with no policies and no direct data privileges for `anon`, `authenticated` or `service_role`. Access is deliberately restricted to the controlled database routines.
- Installation does not create, close, reopen or extend any accounting period.
- Post-correction metadata confirms `statement_timeout=45s` on exactly the six calculation RPCs: get, save and approve for the balance sheet and the financial-statement package. Their fixed empty `search_path` and existing permissions are preserved. List, void and period-lock RPC settings, and role-level timeouts, are unchanged.

The new security-advisor findings were reviewed: four informational [RLS-enabled-without-policy notices](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) for the private tables, and three [authenticated SECURITY DEFINER notices](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) for the period-lock RPCs. These correspond to the intended access design above and do not require changing the installed permissions.

## Authenticated runtime verification

An attempted read-only RPC smoke test requested only execution/version/structure and date metadata, without exposing statement amounts or financial record counts. It stopped with PostgreSQL error `42501` because the Supabase MCP SQL session runs as `supabase_read_only_user` and cannot execute the existing finance authorization helper or the authenticated reporting RPCs. That session is not a member of the `authenticated` database role. No role elevation or permission workaround was attempted.

Verification continued through the existing authorized application browser session. Only headings, dates, navigation, export-button availability and technical errors were inspected; financial amounts and journal rows were not collected. Successful live results are recorded below.

An optional financial-baseline aggregate query was declined by automatic approval review. It was not retried; installation checks used schema and permission metadata instead. No financial-baseline result is claimed here.

## Post-installation timeout correction

The first authenticated production check encountered a reporting failure. Safe browser diagnostics confirmed PostgreSQL SQLSTATE `57014`, establishing a server statement timeout rather than an assumed response-schema defect. Metadata showed an eight-second timeout for the authenticated role and authenticator. Historical statement reconstruction can exceed that budget.

Migration `20260918004000` adds a 45-second function-level request budget to the six RPCs that calculate statements, including save and approval because they recalculate the source. Its rollback resets only that setting and preserves `search_path`. PostgREST can apply this function setting before the main request query through its documented [hoisted function settings](https://postgrest.org/en/latest/references/transactions.html#hoisted-function-settings); `statement_timeout` is included in the [default hoisted-settings list](https://docs.postgrest.org/en/v13/references/configuration.html#db-hoisted-tx-settings).

The matching frontend gives these calculation requests a 60-second client budget. Automatic HTTP replay is disabled for the eight reporting write commands so a transport failure cannot blindly repeat a save, approval, void or period-lock operation. Safe report diagnostics emit only diagnostic codes and field paths, without financial values, identities or full response payloads. Timeout failures have an appropriate error message instead of being misclassified as missing review details.

The earlier timeout-correction verification passed: 216 unit tests plus six isolated integration tests, for 222 tests in this verification run. TypeScript checking and the production build passed. A separate synthetic PostgreSQL-compatible check confirmed the six targeted function settings, unchanged control RPC settings and permissions, and exact restoration by the rollback. These checks were supplemented by the authenticated browser verification recorded below.

## Frontend production release

The production baseline is Vercel deployment `dpl_3P2iVEFdouHngTgbjXnKLR7S6qTj`, at [the baseline deployment URL](https://fleetifyapp-g4wvfgq1a-khamis-1992-hotmailcoms-projects.vercel.app).

The release coordinator recovered 1,552 source files into `.tmp/financial-statements-release-20260918` to prepare a release from that deployed baseline. The isolated release includes the financial-reporting changes and timeout correction while preserving the baseline's legal functionality, public assets and dependencies. Unrelated pending legal/document changes in the shared working tree were excluded.

The active deployment is `dpl_9SxQb4X522ro2EQyzuBNV9yKWQ26`, status `READY`, at [the deployment URL](https://fleetifyapp-29r4nzbit-khamis-1992-hotmailcoms-projects.vercel.app). It is activated on [the production website](https://www.alaraf.online).

## Arabic, navigation and calculation correction

The deployed sidebar now has direct **الميزانية العمومية** and **القوائم المالية** links under **المالية**. Both report workspaces default to Arabic independently of the app language. An explicit report-language selector changes display direction and PDF/Excel/print locale while retaining selected dates and prepared configuration. The language is represented by the optional URL parameter `lang=en`; other values default to Arabic.

The live 45-second timeout initially remained insufficient for the full package. Migration 05000 replaces repeatedly copied JSON arrays with expanded PostgreSQL arrays and shares identical historical cutoff results. It changes calculation routines only; authorization gates and financial data remain unchanged. The new private assembly helper denies direct execution to anonymous, authenticated and service roles (verified after deployment).

Latest focused verification passed:

- 39 UI and mutation-safety tests, including default Arabic, locale-aware exports, preserved dates and all eight commands under application defaults that otherwise retry mutations.
- 25 synthetic SQL tests covering the package workflow, exact before/after payload and fingerprint equality, ordered findings, third-position reports, cutoff reuse and rollback.
- Native PostgreSQL 18.4 synthetic benchmark: 4,002 activity journals, 14,481 ms before and 170 ms after, with exact payload equality. This is a local synthetic measurement, not a production timing claim.
- Full isolated-release TypeScript check and Vercel production build.
- SHA-1 verification of 129 baseline legal, public and build-configuration files; unrelated workspace edits were excluded.

Report mutation hooks explicitly disable inherited retries and override raw default error logging with safe diagnostic summaries. The offline finance CI now includes these regression suites and the performance migration checks.

## Final authenticated production results

Verified on deployment `dpl_9SxQb4X522ro2EQyzuBNV9yKWQ26`:

| Report | Period / comparison | Result |
| --- | --- | --- |
| Balance sheet | 2025-12-31 / 2024-12-31 | Arabic RTL, no runtime alerts, PDF and Excel enabled |
| Balance sheet | 2026-08-31 / 2025-12-31 | Arabic RTL, no runtime alerts, PDF and Excel enabled |
| Financial package | 2025-01-01 through 2025-12-31 | Five statement sections in Arabic, no runtime alerts, PDF and Excel enabled |
| Financial package | 2026-01-01 through 2026-08-31 | Five statement sections in Arabic, no runtime alerts, PDF and Excel enabled |

Both sidebar links were opened through the Finance group and reached their report workspaces. Switching the balance-sheet selector to English changed the heading and direction while preserving both reporting dates. The final package page was left in Arabic. These are rendering and calculation checks, not assertions that company records are complete or that readiness findings are cleared. Exports were verified with synthetic automated tests; no live financial export, approval, save or period-lock command was triggered.

## Scope of assurance

The earlier local implementation and automated/browser test evidence remains documented separately in [financial-statement-package-verification.md](financial-statement-package-verification.md). This release record supplements that historical evidence; it does not rewrite its original local-only status.

Technical installation and verification do not establish completeness of company accounting data, external audit approval, comprehensive IFRS compliance or acceptance by a particular authority. Company data and supporting disclosures remain the subsequent preparation stage requested by the user.
