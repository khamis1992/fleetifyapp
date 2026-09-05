# Canonical rental-month reader: implemented locally, not deployed

**Correction:** the initial implementation below incorrectly excluded every
`service` invoice. Its original test count and production aggregate observations
are historical, not evidence for the corrected classification. The continuation
at the end records the current behavior and verification.

The previous turn made concrete progress by reproducing three more receipt
sync failures and mapping dependent readers. This turn implements the first
consumer replacement required by that integrated repair. It does **not** retire
the old trigger prematurely or declare the contract-details goal complete.

## Decision and implementation

The selected design separates monthly invoice settlement from individual
payment evidence. Keeping the old receipts as live aggregates would preserve
the reproduced overcount and reversal bugs; ignoring only canonical receipts
would leave the same failures in legacy records. Instead, the monthly report
now reads invoices and payment allocations without changing any business row.

- New migration `20260903222544_canonical_rental_month_summary.sql` was created
  through the Supabase CLI, then implemented with a matching drop-only rollback.
- `get_canonical_rental_month_summary_v1(company,month)` is STABLE, read-only,
  SECURITY DEFINER with empty search_path, fully qualified tables, authenticated
  EXECUTE only, and explicit active company-membership checks. Service/anonymous
  roles are not granted execution. It is a scoped reporting gateway, not a grant
  to call the service-only recalculation helpers.
- One statement computes invoice service month using invoice_month with
  invoice_date fallback. Payment/due dates do not assign the reporting month.
- Successful receipt allocations contribute once; fees and other target types
  do not count as rent. Any active allocation suppresses legacy direct-link
  fallback. Cancelled/pending/outgoing payments and cancelled invoices are not
  counted. Cached invoice paid_amount is not used as financial truth.
- Each invoice's remaining amount is calculated separately before grouping by
  contract; an overpayment on one invoice does not settle another implicitly.
- Missing monthly invoices, unknown invoice months, identity/amount conflicts,
  orphan allocations, schedule discrepancies and out-of-period records are
  marked for review rather than reported as settled or proven debt.
- Result rows are wrapped in one JSON envelope to avoid silently accepting an
  API row cap as a complete list. Company/month identity, row shapes, known review
  codes and duplicate contract IDs are checked at the client boundary.

The existing `UnpaidByMonthView` is now connected to that reader through the
actual React Query hook. It distinguishes contracts, shows only verified totals,
keeps uncertain rows visible without actionable amounts, and navigates to the
specific contract for invoice review. Missing gateway/network errors never fall
back to receipt totals or a misleading empty debt list. The old nonfunctional
print/export buttons were removed from this view; this does not implement exports.

Company/month-scoped caching prevents showing the previous company's result.
The report refreshes while open every 30 seconds (not in the background), and
contract payment/synchronization invalidation now includes that company's month
reports. The manual refresh remains available. While fetching, old financial
values are not presented as current.

## Verification evidence

- `node --test tests/database/rental-month-summary.test.mjs`: **17 passing**
  ordinary tests using the actual migration in isolated PostgreSQL/PGlite.
  Covers split receipts/months, fee-only fallback suppression, cancellation,
  stale invoice cache, cancelled invoices, overpayment non-netting, invalid
  identities/overallocations/orphans, month precedence, service/traffic exclusion,
  period/schedule conflict, tenant/ACL validation, invalid inputs, 1,002 result
  rows, repeatability, read-only behavior and rollback preserving records.
- Targeted Vitest: **53 passing** across the new service (21), mounted view with
  actual hook/service and mocked transport (6), updated query invalidation (4),
  and existing financial synchronization regression suite (22).
- Full app and node TypeScript checks passed after implementation. Targeted
  ESLint passed. `npm run build:ci` passed in 1m24s with existing Browserslist,
  OpenCV browser-externalized fs/crypto, mixed-import and chunk-size warnings.
  This is a local build, not a runtime browser check or deployment.
- Live schema names/types were checked via information_schema. A production
  **read-only EXPLAIN of the SELECT body** confirmed it resolves on the real
  schema; this did not create or call the pending RPC. Materialized invoice
  projections were reduced to the fields required by the report.
- A production read-only execution of that SELECT body, returning counts only
  for August 2026, found 213 contract rows, 125 flagged review rows, and zero
  negative numeric outputs. These are data-quality review flags, **not 125
  proven debtor contracts**. The query did not refresh balances or send messages.

The SQL fixture has a minimal verified schema, text adapter for transaction_type,
test auth.uid, and RLS without application table grants. It is not the complete
production policies, all triggers, concurrency environment, or a browser test.
Transport/UI tests are isolated and do not contact production.

## Remaining integrated repair and release gates

This reader is a dependency, not a substitute for the full receipt fix. Still
required: migrate the legacy legal-payment reader and other receipt aggregate
consumers; stop legacy ledger migration from interpreting aggregates as new
money; implement reversible retirement of aggregate-to-receipt writes; reconcile
historical records from provenance without deleting valid payment history.
The financial-refresh gateway's **four executed failing TODOs remain unresolved**.

No migration, app deployment, payment, waiver, legal action or WhatsApp message
was executed. The UI intentionally shows a deployment-required error until the
new read-only RPC is published together with its client. Production rollout,
full-trigger verification, the fee-accounting decision, LTO2024276's schedule
conflict and the full contract-details audit remain open.

Supabase's changelog markdown could not be fetched by the web tool (unsupported
content type); the current official database-function documentation was read:
https://supabase.com/docs/guides/database/functions .

## Continuation: producer/reader consistency and balance visibility

The previous user-facing diagnostic freshly confirmed that LTO2024276's dates
exist and its active installment 37 is due outside the end month. That evidence
does not authorize changing the signed terms. This continuation made local
progress on the related financial reporting path; no business rows were changed.

### Current implementation and decisions

- Service type alone neither proves nor disproves rent. The pending reader now
  checks a unique active schedule link belonging to the same company/contract,
  invoice ID, calendar month and amount. Multiple links, even in different
  months, remain ambiguous. Unlinked services appear with
  `unclassified_service_invoice`, excluded from verified UI totals. Explicit
  traffic markers (penalty ID or trimmed/case-normalized TV prefix) are excluded.
- The relation is structural evidence only, not verification of a signed PDF.
  Compared with blanket exclusion or free-text item classification, this matches
  the captured production generator's persisted output without guessing.
- The UI no longer drops a remaining 0.01 QAR. Its regression first failed with
  a displayed zero total and "no remaining balance", then passed after changing
  both visibility and verified-unpaid predicates to strictly greater than zero.
- The reader rejects contribution from a receipt if ANY active allocation has
  a nonpositive/null amount or wrong company, not just the current invoice's
  allocation. Otherwise an invalid sibling allocation could be ignored or
  offset the total. Historical inactive allocations do not invalidate current
  contribution. The row is reviewed, not declared a collectible debt or settled.
- Undated active invoice evidence is retained for review even after contract
  expiry. Its amount is not assigned to the requested month. Cancelled undated
  invoices do not bring a completed contract back into the report.

The last two defensive paths produced four failing SQL tests before correction
(negative, null, wrong-company sibling allocation, and undated expired contract).
Fresh information_schema confirms current production invoice_date and allocation
amount are NOT NULL. Those null cases intentionally relax fixture constraints to
test defensive behavior; they are **not reproduced production records**. No claim
is made that negative/wrong-company data passes all actual write triggers either.

### Integration and verification

- **53 SQL tests pass**: monthly reader 30, billing graph 23. The new integration
  installs the captured production core, its pending traffic patch, actual v2,
  actual reader, and observed rental-month unique index in one PGlite database.
  It generates two real service rental invoices, reads each, records a synthetic
  500 receipt/allocation, then cancels that receipt while retaining its allocation
  and a deliberately stale paid invoice cache. The reader returns the original
  1,000 balance and leaves both invoices unchanged. It does not create a new
  invoice. Receipt insertion/cancellation in this test is direct fixture SQL,
  **not the production payment command or its triggers**.
- The billing suite still contains a passing characterization of the unresolved
  TV-only unique-index collision. A green suite does not mean that workflow is
  fixed. Journal verification, authorization helpers and legacy schedule
  generation remain explicit doubles, not full-accounting proof.
- **55 Vitest tests pass**: report boundary 21, mounted actual hook/service view
  with mocked transport 8, financial query invalidation 4, synchronization 22.
- `npm run type-check` passed for app and node. Targeted ESLint passed. No full
  application suite, build, live browser or deployment was run in this turn.
- A fresh read-only production lookup confirms this reader RPC is still absent.
  Its SELECT body resolves in production EXPLAIN. No function was created and
  EXPLAIN did not execute the SELECT or any business mutation.

### Query review

The first EXPLAIN found a correlated scan of roughly 8,044 active schedules for
each of roughly 4,695 candidate invoices. Replaced it with one grouped schedule
link CTE and a join, preserving all classification tests. Same-scope planner cost
changed from 984,748.36 to 40,929.99. These are PostgreSQL cost estimates, **not
measured milliseconds or a benchmark**. Runtime timing under real load and full
schema/permissions still require verification. No index was added or removed.

Supabase's current database-function documentation was retrieved through its
documentation tool; changelog markdown remains unavailable (unsupported content
type). Code review checked tenant predicates, default privileges, null/duplicate
link semantics and the read-only boundary; generic skill checklist templates
are not treated as security certification.

### Still open

The earlier broader release gates remain open: production deployment, complete
financial-trigger and concurrency coverage, source-proven historical receipt
reconciliation, fee accounting, legacy legal-payment readers, and LTO2024276's
signed-term/schedule correction. In particular, do not retire receipt sync solely
because this dependent monthly reader passes isolated tests. Monetary response
precision/conservation, the browser business-timezone default, and the other
consumers' invoice classifications need further review. The full contract-details
goal is not complete.

## Shared settlement source extraction and direct-access verification

The pending migration now extracts per-invoice calculation into
`canonical_rental_invoice_settlement_v1(company)` and the monthly gateway reads
that source. The helper is STABLE, SECURITY INVOKER, empty search_path, with
EXECUTE revoked from PUBLIC, authenticated, anon and service_role. Its company
predicates remain internal; API callers must use the membership-checked gateway.
No old receipt-count arrears consumer has been switched yet: the shared source
is a prerequisite, not completion of that reader replacement.

Added real execution tests for all three API roles. Each direct helper call
fails specifically with function permission denied, and the authorized wrapper
continues working. Added a receipt allocated across two same-month invoices:
400 + 600 contributes 1000 paid but **one receipt**, with 2000 remaining on 3000
invoices. Existing different-month allocation, cancellation, overpayment,
identity, lifecycle and service-classification cases remain green.

**57 SQL tests pass**: 34 monthly/shared-source and 23 billing-graph cases.
The latter still includes a passing characterization of the unfixed TV-only
unique-index collision; do not interpret the test count as all billing flows
working. Fixtures run actual pending SQL but not the complete production schema,
triggers, RLS helper set or concurrent sessions. Rollback removes the helper and
gateway without changing financial rows in the fixture. String-body SQL caller
dependencies are not guaranteed to be tracked by DROP, so the rollback comment
now explicitly requires dependent readers to be removed first rather than
claiming automatic protection for unknown callers.

The extraction was tested locally only. Earlier EXPLAIN estimates described the
pre-extraction query, not measured runtime or a current helper benchmark. Pending
arrears work still needs exact prepaid due dates, legal cutoff treatment,
unresolved-evidence presentation and real consumer integration before switching.

## Continuation: monetary acknowledgement and Qatar reporting month

The previous goal turn made verified progress on service-rental classification
and shared-reader privileges. This turn addresses the open monetary-boundary
gate: the parser previously accepted any finite nonnegative amounts, including
unbalanced totals, unsafe integers, sub-cent money and impossible dates.

Design: reject malformed response envelopes before showing any totals, while
preserving explicitly quarantined review rows (e.g. overpayment with per-invoice
clamped remainder). Automatically fixing numbers would invent payment evidence;
accepting all rows would silently promote unverified balances. Neither is used.
No financial row is changed by this frontend validation.

- Require canonical two-decimal JSON money and safe integer currency units. A
  fixed epsilon is not used: it could accept a tiny positive sub-cent amount and
  round it to zero. Verified rows must conserve invoice = paid + remaining in
  currency units. Verified report aggregates must also remain safe integers.
- Count fields must be safe integers. Blank identifiers and impossible calendar
  dates are rejected. Empty verified envelopes remain supported.
- Review rows remain visible and excluded from totals even if an overpayment
  breaks contract-level conservation; review is not proof of legal liability.
- The view sums remaining currency units, and defaults to the Qatar business
  month instead of the employee device timezone. Explicit month selection stays
  unchanged; an open historical report is not switched at midnight.
- A real hook/service/view regression first loads valid data, then returns an
  inconsistent acknowledgement on refresh. It must hide both stale totals and
  rows, display the verification error, and never announce zero debt.

Initial regressions reproduced **13 failures, 31 passes**. After implementation,
44 tests passed under UTC, and 113 related tests passed under America/Los_Angeles.
An extra tiny-sub-cent regression and stricter precision check then passed with
**114 tests under Asia/Qatar** (35 parser, 10 mounted report, 44 schedule utility,
25 financial snapshot/diagnosis). These are mocked RPC/browser-component tests,
not production database or actual browser tests. Final build/type/lint outcomes
are recorded below after completion. The legacy arrears reader, full-trigger
coverage, signed-schedule reconciliation and other release gates are still open.

Final verification: the final 45 parser/view tests also pass under UTC and
America/Los_Angeles; the 114-test Qatar run includes the same final code.
App/node TypeScript and targeted ESLint pass. Final production build passes
(6,662 modules, 1m23s). The earlier build preceded the tiny-sub-cent guard, so it
was not used as final evidence: a second build was run after that last edit.
Existing Browserslist age, OpenCV browser externals, mixed static/dynamic imports
and large chunk warnings remain. No preview, live browser, production mutation,
database migration deployment or production publish occurred in this turn.
