# Financial statement package — technical implementation

Implemented locally on 18 September 2026 for individual-entity financial reporting. Route: `/finance/reports/financial-statements`, available from the finance reports library. Production installation, company data preparation and accounting approval are separate steps; no live ledger data or period locks were changed during this work.

## Reporting scope and dates

The workspace produces a statement of financial position, profit or loss and other comprehensive income, current and comparative changes in equity, a direct-method cash-flow statement, and structured notes. Amounts come from posted company journals calculated in PostgreSQL, without a REST row cap. The server computes saved amounts; the browser submits settings, never fabricated balances.

The requested calendar-year presets are:

| Package | Position comparison | Performance, equity and cash-flow comparison |
| --- | --- | --- |
| Year ended 31 December 2025 | 31 December 2024 | 1 January–31 December 2024 |
| Year to date ended 31 August 2026 | 31 December 2025 | 1 January–31 August 2025 |

The financial-year start is configurable. Interim packages cover the financial year to date; this version does not offer standalone quarterly statements with a separate year-to-date column. An optional third statement of financial position uses the opening date of the comparative financial year when retrospective changes require it. Comparative dates cannot be silently substituted with a different period. Date limits use Asia/Qatar.

## Presentation and accounting controls

- Account mappings distinguish current and non-current assets/liabilities, individual material presentation lines and equity components. Each position date has its own reviewed classification and optional conserving split. Inactive accounts and signed contra balances remain visible. Unclassified amounts are shown in drafts and block approval.
- Profit or loss excludes verified closing entries and their reversal families; cumulative unclosed earnings remain part of the position. Legacy opening carryforward journals are flagged for accounting investigation rather than silently removed.
- Equity movements show opening balances, profit, OCI, contributions, distributions, component transfers, prior adjustments and other reviewed movements. Transfers must conserve total equity and contain only equity lines. Every component and total reconciles with ledger closing balances.
- Cash flows show gross receipts and payments separately within operating, investing and financing activities, with an exchange-effect line. Simple counterpart classifications can be calculated directly. Mixed cash/noncash entries need a documented allocation, including any internal cash transfer. Allocations must match gross cash debits and credits after that transfer, as well as the net movement. Invented offsetting receipts/payments are rejected.
- Configuration amounts are bounded to ±1,000,000,000,000 currency units. This protects the JSON/JavaScript boundary and precision of presentation overrides; it does not rewrite ledger amounts.
- Structured notes cover entity information, basis, policies, estimates, assets, receivables, liabilities, equity, related parties, commitments, subsequent events, going concern, noncash transactions and interim changes. Notes start empty and pending. Completion or non-applicability requires a substantive explanation and evidence reference. The system does not invent policies, legal form, audit conclusions or missing transactions.
- Client validation checks source identity, date scopes, numerical totals and links between statements. An unavailable or inconsistent source cannot be issued from the screen. Changing settings requires recalculation before save/export.

## Review, issue and period protection

Saved drafts are immutable versions with preparer identity, settings, disclosures and a source fingerprint. Approval requires an independently authorized user, all five review confirmations, a conclusion and no blocking findings. Source verification runs inside READ COMMITTED with table locks; stale fixed transaction snapshots are rejected. A net-zero source edit still invalidates an older draft for approval. Internal approval is visibly separate from an external audit opinion.

Voiding preserves the original content and approval trail. The UI reads the latest 50 versions and rechecks status immediately before exporting a saved version. A draft export remains a draft. PDF, Excel and print share the same statement content. Arabic/English pages identify the company, dates, currency, status, version and fingerprint; notes and source annexes accompany the five statement sections.

Period locking is an explicit authorized action with a recorded reason; approving a report does not automatically lock the ledger. Guards protect old and new accounting dates, companies and journal lines. Reopening the managed cutoff does not reopen other closed periods. See [period lock design](reporting-period-locks.md).

## Qatar and standards basis

The technical presentation targets IAS 1 for the requested annual period and applicable IAS 34 requirements for interim year-to-date reporting. Qatar's Decision No. 2 of 2023 identifies approved professional standards, including IFRS and its interpretations. Selection of the applicable framework, entity-specific disclosures and any required auditor submission remain accounting decisions.

- [Qatar Decision No. 2 of 2023 — Al Meezan](https://almeezan.qa/LawView.aspx?LawID=9413&language=ar&opt=)
- [MOCI guide to the auditing profession](https://www.moci.gov.qa/wp-content/uploads/2025/02/دليل-مهنة-تدقيق-الحسابات-V3.pdf)
- [IAS 1 — IFRS Foundation](https://www.ifrs.org/issued-standards/list-of-standards/ias-1-presentation-of-financial-statements/)
- [IAS 34 — IFRS Foundation](https://www.ifrs.org/issued-standards/list-of-standards/ias-34-interim-financial-reporting/)
- [Qatar Companies Law, Article 262 — LLC statutory reserve](https://www.almeezan.qa/PrintArticle.aspx?LawArticleID=69629&language=ar)

The legal-form and equity-note review supports evaluating a statutory reserve where applicable. No reserve is automatically calculated from cumulative earnings or posted to the ledger. IFRS 18 is not applied early by this feature. This is an individual-entity package, not consolidated group reporting. More specialized transactions may need additional accounting schedules and disclosures. A balanced package, an internal approval or a successful software test is not a declaration of complete IFRS compliance or acceptance by a particular authority.

## Installation and operational rollback

Apply only these reviewed migrations, in order, after comparing their schema assumptions with the target database:

1. `20260918001000_professional_balance_sheets.sql`
2. `20260918002000_financial_statement_packages.sql`
3. `20260918003000_financial_reporting_period_locks.sql`

Then publish the tested frontend and verify access through the reports library. Do not push unrelated pending migrations. Missing services produce an explicit installation error rather than partial reports. Installation creates no accounting entries, automatic approvals or period locks.

Each migration has a matching file under `supabase/rollbacks/`. Operational rollbacks disable mutation/report commands while retaining saved history and protection; they intentionally do not erase issued statements or reopen locked dates. Coordinate the frontend release with rollback. The pending schema/API inventory is documented in `docs/DATABASE_REFERENCE.md`.

## Verification

Run `npm run type-check`, `npm run build:ci` and `node scripts/run-finance-ci.cjs --offline`. Offline financial CI includes the new SQL, service, screen and export suites and never writes live health snapshots.

The SQL suite uses synthetic ledgers and the actual migrations. `tests/fixtures/financial-statement-package-sql.json` is generated by the SQL suite and consumed by service/export tests, so the real server response contract is checked end to end. Coverage includes comparisons, closing/reversal families, gross cash allocation, OCI, conserving classification splits, large source sets, independent approval, source changes, permissions, immutable history and rollbacks.

Optional native PostgreSQL concurrency suites use isolated temporary local clusters: `FINANCIAL_STATEMENT_NATIVE_CONCURRENCY=1`, `FINANCIAL_PERIOD_NATIVE_CONCURRENCY=1`, and the balance-sheet suite's documented flag. They do not accept production database URLs.

Browser evidence is recorded in [package QA](../../tests/visual/financial-statement-package/QA.md): Arabic/English normal and long-content pagination, actual PDF/XLSX downloads, mobile layout, date-change export gating and independent reviewer interaction. Native print uses the same measured page layout; the OS print dialog was not submitted during QA.

Real company data remains a later preparation stage, as requested. Asset costs/depreciation, opening balances, capital, bank and subledger reconciliations, liabilities, tax assessments, accounting policies and supporting disclosures must be completed by the accounting team before a final version is approved for its intended recipient.
