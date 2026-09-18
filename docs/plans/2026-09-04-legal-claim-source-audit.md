# Legal claim source audit — verified defects, not a fixed engine

## Scope and source evidence

The prior goal continuation completed local consumer integration and meaningful
tests. This continuation proceeds into the actual calculator called by contract
legal conversion; frontend success alone cannot certify its financial result.
All production access was read-only catalog inspection. No calculator was invoked
against real customer records and no migration, payment, legal action or message
was executed in production.

Read-only production `pg_proc.prosrc` hashes on 2026-09-04:

- `calculate_legal_claim_breakdown_v3(uuid,uuid,date)`:
  `4a27cf9dcd1bfd202ffb80834de3f1a9`.
- `calculate_legal_claim_statement_v4(uuid,uuid,date,text,uuid[])`:
  `36b78342a4ecc47adcdc6f9c5825f641`.

The new local PGlite audit extracts the exact function definitions from their
existing migrations, normalizes CRLF, and asserts these body hashes before
executing them. Neither financial calculation is mocked or reimplemented by the
test. The schema is minimal and privileged, with synthetic data, not a proof of
real RLS, triggers, enum constraints, legal entitlement or concurrency. Auth
functions for the pending-wrapper scenario are explicit fixture stubs. Company,
profile and case field types were checked against the live schema.

## Reproduced financial contradictions

Amounts below are synthetic test fixtures, not an audit of a named customer's
actual claim. The canonical rental helper is used as a cross-check for the first
four rows and does not itself certify the entire legal claim.

| Scenario | Actual claim rent/result | Required behavior |
| --- | ---: | --- |
| Invoice 1,500, real receipt 500, cache still 1,500 | 1,500 | Principal remainder 1,000 |
| Cancelled receipt, cache still paid/zero | 0 | Restore principal remainder 1,500 |
| Service-type rental invoice linked to matching installment | 0 | Include the 1,500 rental obligation |
| Receipt 620, allocations 500 principal + 120 fee | 1,500 | Rent remainder 1,000; fee is separate |
| Padded `tv-` invoice reference without penalty_id | 1,500 rent | Must not certify traffic as rent; reconcile the linked schedule |
| Returned July 15, August invoice | 1,500 despite July cutoff in output | No post-cutoff recorded rent |
| Pending cutoff wrapper; July debt 500, excluded August invoice 1,500 | 0 | Preserve July 500; exclusion intersection is empty |
| Pending wrapper; documented retention 20 days × 10 after termination | 0 | Preserve the existing separate retention calculation of 200 |

The last two failures are **integration defects in a pending local migration**,
not a claim it is deployed. Tests load only its function/privilege section and
exclude its case-specific production DML. Merely wrapping v3 with an earlier
as-of date is therefore not safe: v4 still audits/excludes invoices at a different
date, and retention loses its independent calculation horizon.

## Verification meaning

`node --test tests/database/legal-claim-source-audit.test.mjs`:

- Three controls pass (ordinary unpaid invoice, actual due-invoice exclusion,
  and read-only preservation of invoices/payments).
- Eight assertions of required financial behavior fail and are explicitly
  marked TODO. They are unresolved defects, **not eight passing regressions**.
  Node exits zero for TODO tests; do not use this audit's exit status as a release
  gate or fold its total into a successful-test count.
- Failure output records exact actual/expected values above.

No application code was changed and no build is needed for this test/docs-only
checkpoint. A warning was added to the pending cutoff migration so its two known
regressions and case-specific DML cannot be mistaken for a ready deployment.

## Selected repair direction

Rejected: refreshing invoice caches before calculating (still dependent on
trigger correctness and races); or replacing only the visible v4 rent total
(compensation counts, exclusions and v3 callers would still disagree).

Use one validated obligation source for the calculator family, with per-invoice
settlement from live allocations and the same verified rental classification as
billing. Preserve uncertainty as a review requirement instead of synthesizing
paid or unpaid amounts. The existing rental-only helper cannot be blindly reused
for traffic, fees or standalone schedules; those sources need explicit mapping.

Required implementation and verification sequence:

1. Extract/reuse the settlement semantics for all necessary obligation types,
   preserving company/customer identity, active allocations, cancelled receipts,
   fee-only receipts, mixed/split allocations, and malformed evidence checks.
   Do not grant raw internal-helper access to API roles or bypass RLS as a shortcut.
2. Define the contract's recorded-rent rows once. Both v3 breakdown and v4 invoice
   audit/exclusion arrays must consume the same dates, classifications and
   remaining amounts. Manual exclusion applies to matching included rows, never
   blanket subtraction from a different component total.
3. Keep separate clocks for recorded rent, post-contract rent, compensation and
   evidenced post-termination retention. Preserve existing supported component
   behavior unless the actual contract evidence requires a reviewed change.
4. Validate traffic partial payments, linked/unlinked schedules, missing invoice
   recovery, duplicate month obligations, returned/terminated/judgment cases,
   Qatar timestamp boundaries, deposit application and per-invoice compensation.
   Reject ambiguous evidence before a legal write; do not turn unknown into zero.
5. Replace or supersede the unsafe pending wrapper, retain reversible migration
   order, and keep LTO2024276 case-specific correction separate from schema logic.
6. Convert these known-defect assertions into tests against the replacement in
   addition to the frozen-source baseline; exercise actual conversion callers,
   transaction races and authorization in a full-schema test environment.
7. Audit historical case snapshots only after the live calculation is verified.
   Existing cases must not be silently rewritten or filed from these findings.

This is an audit checkpoint, not implementation of the replacement, not legal
advice and not completion of the contract-details goal. The next action is the
shared legal obligation calculation, not another independent UI formula.

## Shared settlement implementation checkpoint

The next continuation implemented a prerequisite of that calculation in the
**still-undeployed** `20260903222544_canonical_rental_month_summary` migration.
Fresh read-only catalog inspection confirmed both settlement helpers absent in
production before editing the pending migration; no deployed migration history
was rewritten.

`canonical_contract_invoice_settlement_v1` now owns the single invoice/receipt/
allocation calculation for contract-linked invoices, including traffic invoices.
It exposes original classification metadata plus `is_traffic`, per-invoice paid
and remaining principal, receipt identities, and invalid-evidence flags. The
existing rental helper is a projection/filter over it, so monthly and arrears
readers do not duplicate receipt math. No invoice balance or paid cache is read.

This common source is not yet a complete legal obligation reader: standalone
penalties without invoices, unlinked schedules, missing invoices, ambiguous
classification, component cutoffs and legal extra amounts still require the
planned integration. Its internal invalid flags must not be discarded by a
future consumer. Raw helper execution is revoked from PUBLIC, anon,
authenticated and service_role; existing authorized report gateways remain the
only exposed readers. Rollback removes consumers before both helpers.

Additional verified source corrections:

- Direct receipt fallback with a conflicting non-null contract ID is review
  evidence, not payment for the invoice. Explicit invoice allocations may span
  contracts of the same customer and remain authoritative over the receipt's
  primary contract field.
- Null receipt direction is invalid, not assumed incoming money.
- Service-rent classification requires exact installment/invoice amounts; a
  one-cent discrepancy is no longer considered a match.
- Reversed invoices and schedules are excluded consistently from this SQL source,
  monthly and arrears schedule reads, and the frontend active-invoice predicate.
- The contract-details installment builder also excludes `inactive` and
  `reversed` schedules. Three SQL and two utility assertions failed before these
  lifecycle fixes. Two new mounted-tab cases verify they are not shown as debt.

Verification after these edits: **105 SQL tests pass** across monthly/common
settlement, arrears and billing graph; **114 Vitest tests pass** across invoice
lifecycle, installment ledger, employee statistics, real installment tab and
contract-details source failure handling. Type checks and targeted ESLint pass.
One earlier Vitest command included a nonexistent mounted-test path and therefore
ran only 46 utility tests; the corrected final command explicitly ran the real
11-case mounted suite plus the other five test files.

The frozen-source legal audit still reports **3 controls passing and 8 TODO
financial assertions failing**. That was rerun deliberately: the legal engine
has not been connected to this common source, and these eight issues are not
claimed fixed. The next required change remains the shared claim-row calculation
used by v3 and v4, with separate component clocks and same-row exclusions.

Skills influenced the design by preferring a single settlement calculation,
explicit private-helper permissions and rollback order. Supabase's current
function-security documentation was checked via MCP; changelog.md could not be
fetched because the browser tool rejected its content type. No production writes,
deployment, messages, financial generation or live browser actions occurred.

## Recorded obligation reader checkpoint — 20260904023524

Created the migration using the installed Supabase CLI, then implemented the
private `canonical_legal_recorded_obligations_v1(company, contract, as_of, exclusions)`
reader and its matching rollback. Verified the relevant profile/case columns
against production information_schema and local generated types before coding.
No production changes were made.

This supplies one row set for the upcoming v3/v4 integration, not a second final
claim calculator. It reads the shared invoice allocation settlement once;
classifies included, settled, manually excluded, post-cutoff and review rows;
and intersects exclusions with the **same currently collectible rows**. Excluding
a later invoice cannot subtract its value from earlier rent. Repeated/unrelated
exclusion IDs cannot multiply the deduction. Invalid evidence cannot be hidden
by selecting its invoice as excluded.

The result keeps three dates explicitly separate: original calculation date,
event-based rent cutoff, and recorded-rent cutoff capped by contract end.
Judgment timestamps use Asia/Qatar, not the caller's session timezone. Confirmed
termination and valid-case outcome dates are considered, including appeal,
enforcement and collection stages; cancelled cases do not stop rent.

Missing or unmatched invoice links, duplicate rental months, invoice/schedule
amount or month disagreements, traffic-linked rental schedules, unknown dates,
and out-of-contract schedules require reconciliation. This reader deliberately
does **not** treat a standalone schedule paid_amount cache as actual receipt
evidence. Review amounts and the aggregate rent are null rather than a fabricated
zero. An empty source is unknown, not a certificate of no debt. Non-finite or
fractional-cent currency values are rejected as review evidence.

Verification:

- 42 actual-reader SQL tests pass. Four tests initially failed for empty-source
  false-zero and malformed currency; the reader was corrected and rerun.
- A new integration test runs the captured real invoice core, its pending patch,
  real billing-graph generator, shared settlement and this recorded-row reader.
  It verifies generated service rent (2000), partial payment (1500), return cutoff
  and post-cutoff exclusion (500), then cancelled receipt with stale paid cache
  (1000). The invoice count remains two throughout.
- 148 SQL tests pass together: 42 recorded-reader, 48 shared/monthly, 26 arrears,
  32 billing-graph. No TODO cases are counted in that number.
- Node syntax checks and git diff whitespace check pass (existing CRLF warnings).
  No frontend runtime files changed in this checkpoint, so a new frontend build
  was not needed. The preceding shared-settlement checkpoint's build had passed.
- Raw execution remains revoked from PUBLIC/anon/authenticated/service_role;
  rollback removes only this reader, preserving the shared source and records.

**Still not fixed in the live engine:** v3/v4 have not yet been rewired, and the
eight frozen-source TODO defects remain open. No claiming, filing, receipt,
case-snapshot or reconciliation write is performed by this reader. The existing
unsafe pending cutoff wrapper and case-specific DML remain release blockers.

Next implementation must use these exact rows for v3 claim_rows/compensation
counts and v4 audit/exclusions, not merely overwrite v4's rent total. A review
result must raise a meaningful reconciliation error before existing callers can
coalesce null totals to zero. Resolve the authorized gateway/SECURITY INVOKER
call chain without exposing the raw helper or bypassing RLS. Then implement the
separate traffic obligation source (including partial payments and penalties
without invoices), preservation of extension/retention clocks and shared
coverage policy. This reader does not by itself prove that every contractual
month has an invoice, handle verified renewals, prorate intra-month termination,
or provide historical-as-of settlement: receipts are live/current. Those are
explicit integration requirements, not implicit certifications from its total.

The design and review skills influenced the single-row-source design, explicit
unknown states and private permissions. Review reference files were generic
placeholders, so actual SQL regression evidence was used instead of treating
their sample checklist as a certificate. The full contract-details objective
remains active and unverified; this is concrete local progress, not deployment.

## Public calculator integration checkpoint — 20260904024349

The next continuation **connected recorded rent to the actual public v3/v4
entry points in a pending migration**. This supersedes the earlier statement
that the new reader had no calculator consumers; production remains unchanged.
Fresh read-only production catalog checks reconfirmed the v3/v4 body hashes
above and absence of the rejected uncapped wrapper before editing pending files.

Implementation:

- A hash-guarded migration retains exact baseline definitions for rollback and
  replaces only the audited calculation sections. v3 claim_rows and covered
  months now come from canonical recorded rows, not invoice/schedule paid caches.
  v4's included/excluded arrays and future/after-cutoff amount use the same rows.
  Exclusions are applied once and compensation counts use included unpaid rows.
- The public function signatures and `version: v4` envelope are preserved;
  `calculation_source: canonical_recorded_rows_v5` identifies the pending engine.
  Public entry points remain SECURITY INVOKER. A non-exposed
  `legal_claim_internal` schema contains the single company-authorized gateway,
  its private raw calculator and baseline backups. API roles cannot execute raw
  helpers or backups. The gateway requires trusted service-role JWT or a live
  authenticated user, matching selected company and active profile membership;
  it does not trust user_metadata or a postgres session_user shortcut.
- The private SECURITY DEFINER gateway is an explicit permission boundary for
  complete graph inspection (including malformed cross-tenant references), not
  an RLS-error workaround or blanket permission change. No table grants changed.
  Read-only production settings show exposed schemas are `public, graphql_public,
  zcrm`, not `legal_claim_internal`. Native full-schema authorization review is
  still required before release.
- A reconciliation-required rental source raises an Arabic error with hint
  `LEGAL_CLAIM_RECONCILIATION_REQUIRED`; it cannot become zero through legacy
  callers' COALESCE logic. Wrong TV-linked rental schedules are blocked rather
  than silently converted into a rent claim. Missing invoice evidence remains
  a reconciliation requirement, not automatic debt forgiveness.
- Both component calculations retain the requested as-of date. Only the rent
  rows/extension cutoff stop on the relevant events; the rejected whole-engine
  date rewind is removed. Qatar timestamp conversion and judgment outcome stages
  are aligned in the breakdown's event calculation.

The **undeployed** `20260903163803` migration and rollback are now no-ops. Their
rejected wrapper and case-specific mutation were removed from the migration
execution path. The original candidate is retained verbatim in
`tests/database/fixtures/rejected-legal-cutoff-wrapper-20260903.sql` for regression
evidence only. The frozen audit explicitly extracts only the function section,
never the case-specific DO block. No existing case value or audit log was changed
or deleted. The replacement's rollback is schema-only and restores exact v3/v4
body hashes; a changed baseline aborts migration rather than patching unknown SQL.

Verification after integration:

- 26 actual public-calculator SQL cases pass: partial/cancelled receipts,
  service rent, fee/principal separation, matching cutoff/audit rows, exclusion
  intersection, retention, compensation after exclusion/settlement, active
  authenticated access, unauthorized company/inactive/missing identity rejection,
  raw-helper denial, invoker public facades, baseline drift and exact rollback.
- Retention test now contains an actual fully settled July invoice so zero rent
  is established from receipts; the old completely empty-evidence fixture is
  still rejected instead of being falsely certified as debt-free.
- 173 SQL tests passed together before adding the baseline-drift case. The
  integration suite was rerun after that case: **26 pass, 2 TODO assertions fail**
  as documented below. These TODOs are explicit release blockers, not passes;
  Node's zero exit status is not a release certificate.
- Six relevant Vitest checks pass, and full app/node TypeScript checks pass.
  No application runtime frontend file changed, so no new frontend build was
  required. Syntax and targeted whitespace checks pass.
- The frozen old-source audit still reproduces 3 controls and 8 TODO failures;
  those verify the rejected/live baseline, not the new implementation. It is
  deliberately kept separate from replacement verification.

**Newly reproduced remaining traffic release blockers in the replacement**:

1. A penalty/invoice of 500 with a completed 200 receipt still yields a 500
   traffic claim, instead of 300: the legacy penalty aggregation ignores invoice
   settlement. The recorded-rent integration intentionally did not invent a
   separate unverified traffic payment formula.
2. A penalty explicitly assigned to the company still produces a 500 claim
   against the customer, instead of zero: the legacy query ignores
   responsibility_party.

Next work is the shared traffic obligation source consumed by both v3 and v4,
including responsible customer/company, cancelled receipts, linked/TV-only and
standalone penalties, proof requirements and ambiguous evidence. Production
information_schema confirmed penalty identity/responsibility columns, and the
live allocation constraint only permits invoice/contract/obligation/late_fee;
there is no direct penalty allocation type to assume. Do not deploy this partial
engine until these defects and the existing full-schema/concurrency, coverage,
renewal, intra-month proration, custody/cutoff-source labeling and case-specific
reconciliation gates are satisfied. The full contract-details goal is still
active. No production writes, deployment, messaging or live browser actions
occurred in this checkpoint.

## Shared penalty settlement checkpoint — pending engine updated

The following continuation fixed both reproduced penalty defects in the
**undeployed replacement**. `legal_claim_internal.read_traffic_obligations_v5`
now supplies the penalty component to both v3 and v4, replacing both independent
legacy penalty SUM queries. The earlier two TODO assertions are now ordinary
passing regressions, not hidden or skipped failures.

Recorded penalty obligations use the already-shared customer receipt source:
exact penalty_id, or the verified legacy `TV-<penalty UUID>` reference convention.
Plate-only/customer-name guesses are not used. Each obligation is counted once;
duplicate invoices, amount mismatches, unresolved responsibility, wrong customer,
wrong company/contract or orphan TV invoices raise
`LEGAL_TRAFFIC_RECONCILIATION_REQUIRED` before a claim is certified.
Company-responsibility and cancelled penalties are excluded. Cancelled receipts
restore the debt even if invoice and penalty payment caches say paid. Proof
must have a nonblank path belonging to the same company and contract in both
calculators. A rental manual exclusion does not erase traffic principal.

Important source distinction confirmed from the actual posting functions:
`traffic_violation_payments` records company disbursements to the authority,
debiting receivables/expense/payable and crediting cash/bank. It is **not** a
customer collection ledger and is deliberately not subtracted from customer
liability. A standalone penalty with customer_payment_status=unpaid remains
collectible even if payment_status=paid after the company pays the authority.
Customer paid/partially-paid/null state without matching receipt evidence is
review-required, never automatically replaced with full or zero debt.

Standalone explicitly unpaid `penalties` remain supported without creating an
invoice: production had deliberately retired penalty-invoice generation
(`20260902170055_stop_penalty_invoice_generation`, mirror of applied change).
However, if an existing invoice is cancelled or linked to the wrong tenant or
contract, the reader does not resurrect its full principal as a standalone
penalty. It requires reconciliation. No payments/invoices/penalties were created
or corrected in production as part of this implementation.

Verification after the final edits:

- **56 public v3/v4 integration cases pass**, including both former TODOs,
  standalone obligations, company disbursement distinction, full/partial/
  cancelled customer receipts, TV-only exact matching, responsibility, identity,
  proof, duplicate reference/invoice detection and private-helper access.
- A mixed 820 receipt allocated 500 rent + 200 traffic + 120 fee gives 1000 rent
  and 300 traffic, total 1300, identically through v3 and v4.
- **204 SQL tests pass together**, zero TODOs in these five suites: 56 calculator,
  42 recorded-reader, 48 shared/monthly, 26 arrears and 32 billing-graph.
- Nine related Vitest tests pass. Node syntax / targeted whitespace checks pass.
  Only pending SQL/tests/docs changed in this continuation, so no new frontend
  runtime build was needed; prior full app/node TypeScript check had passed.
- Rollback was updated for the extra private function and modified internal
  signature and is exercised in the integration suite. Production is unchanged.

**New authoritative coverage evidence / next release blocker:** read-only
production count found **983 traffic_violations rows, 793 contract-linked** for
the company. The old engine and this initial penalty-source replacement only
consume `penalties`; do not mistake a zero penalty total for proof of no traffic
liability when the other source has records. Next work MUST reconcile both
sources (exact identity/date/amount/responsibility, linked invoice aliases,
customer receipts versus government disbursements), expose ambiguous duplicates
instead of adding both, and update readiness/display consumers to the same
obligations. The default ready-for-filing status, snapshot creation and legal
transfer must not rely on a partial-source total. This is an unresolved release
blocker in addition to the previous coverage, renewal, cutoff/custody-label,
proration, full-schema/authorization/concurrency and signed-contract repair gates.
The full contract-details goal remains active, not complete or blocked.

## Dual traffic-source reconciliation and same-source identity audit

The pending `20260904024349_integrate_canonical_legal_claim_rows.sql` now reads
both traffic sources. This supersedes the previous checkpoint's statement that
the replacement only reads penalties; it does not imply deployment or full
readiness integration.

Design decision: use one obligation for a uniquely matched source pair, retaining
both UUID invoice aliases. Summing both sources doubles imported mirrors;
unconditionally preferring penalties silently selects disputed responsibility or
amount. The selected design merges only exact normalized external reference or
UUID identity candidates whose contract, responsible customer, vehicle, date,
amount, responsibility and cancelled lifecycle agree. It never matches by plate,
name or amount alone. Conflicting facts or one-to-many identities require review.
Independent references remain independent obligations, even when dates and
amounts match. Government disbursement state is not customer receipt evidence.

Company-wide identity discovery precedes per-contract filtering so a conflicting
copy assigned to another contract cannot be hidden by that filtering. Separate
UUID and normalized-reference equality joins, combined by UNION, replace the
quadratic OR identity join. A pair matching both identifiers is one edge, not a
false one-to-many conflict. Actual native full-engine performance remains a gate.

### Authoritative read-only production evidence

Information_schema reconfirmed source column names/types. Running the same
identity CTEs directly as a SELECT (not installing or calling the pending helper)
gave:

- 983 legacy traffic rows, 793 contract-linked; all 983 have an identity candidate
  in penalties. These are not 983 additional customer liabilities.
- 710 pairs satisfy **all** merge predicates; 273 pairs conflict and touch 64
  non-null contract IDs across either source. The preliminary 725 count from a
  narrower comparison was insufficient and is superseded by this result.
- Within the 273 conflicting pairs: 24 contract mismatches, 42 responsible-
  customer mismatches, 63 amount mismatches, 179 responsibility mismatches and
  8 lifecycle mismatches; zero vehicle/date mismatches. Counts overlap, so they
  must not be added. All 273 have at least one potentially customer-liable copy.
- No same-source duplicate reference with potential customer liability was found
  by this query in the current company. The regression below is a reproduced
  implementation vulnerability, not a claim that such duplicates exist live.

These checks establish conflict presence, not which historical copy is correct.
No contracts, invoices, receipts, violation rows, snapshots or messages changed.

### Additional defect reproduced and corrected in this continuation

The previous pending duplicate-reference check inspected only current-contract,
active customer rows. Eight new assertions failed with `Missing expected
rejection`: for each source, a same-reference company copy, cancelled copy,
other-contract copy, or company row with an other-contract customer copy could
silently pass. The replacement now groups same-source references company-wide
before filtering, and checks identity conflict before excluding individual
company/cancelled rows. All-customer-excluded copies still yield no customer debt;
they do not force a new liability or merge customer receipts speculatively.

The prior 78 calculator tests were re-run successfully before this change. With
eight corrected regressions and two negative controls, **88 calculator tests
pass**. All five affected SQL suites run together: **236 pass, zero fail, zero
skipped, zero TODO** (88 calculator + 42 recorded reader + 48 shared/monthly +
26 arrears + 32 billing graph). These exercise actual pending SQL in PGlite with
explicit minimal authentication/schema fixtures, including rollback and source
non-mutation checks; they are not a native full-schema/concurrency certificate.
Node syntax checks pass. This continuation changed only pending SQL/tests/docs,
not application runtime TS, and did not run a new frontend build or type-check.

### Verified remaining integration work

Production `legal_claim_internal` is still absent. Live v3/v4 body hashes remain
`4a27cf9dcd1bfd202ffb80834de3f1a9` and
`36b78342a4ecc47adcdc6f9c5825f641`, matching the pending migration baseline guard.
Live `get_legal_transfer_readiness_v2` hash is
`96f660a8b730ac550f12eb184dd297ff`; its body still contains hardcoded
`responsibility_party = customer`, the `due_rental_sales_only` source marker and
cached invoice.paid_amount. The local wizard consumes those invoice/violation
arrays for its display and selection. This is independent of fixing v3/v4 and
must be aligned with the canonical financial sources; otherwise the screen and
claim calculator can disagree. Do not invoke the volatile readiness getter as a
read-only production test: its downstream v1 can request documents or mutate
readiness state.

Next implementation work is a shared readiness/display financial adapter that
preserves explicit review/null amounts and proof requirements, uses canonical
receipt settlement, and cannot turn a source conflict into a zero/ready result.
Then verify the complete transfer/snapshot/filing consumer chain. Historical
conflict reconciliation, complete rental coverage, renewal and proration,
cutoff/custody labeling, native schema/authorization/concurrency/performance,
deployment/rollback ordering and LTO2024276 signed-schedule correction remain
open. The full contract-details goal is neither achieved nor at an impasse.

## Readiness display integration checkpoint

The next continuation implemented the local readiness financial adapter and
connected the wizard to it. See
`2026-09-04-legal-readiness-financial-source-design.md` for the baseline guard,
private permission boundary, rollout order and verification limits. The prior
readiness/display blocker is now locally addressed, but not deployed or certified
through the full transfer/snapshot/filing chain.

The same canonical sources now supply selectable rental invoices and displayed
traffic responsibility/remaining principal. Review remains null, and proof-required
uses actual outstanding customer liability rather than total record count. Fixed
the wizard's zero-to-original-fine fallback, final-step use of failed/refetching
cached financial data, mismatched independently fetched amounts, and duplicate
readiness-completion clicks before the conversion mutation became pending.

Verification: 251 SQL cases across five suites, 35 Vitest cases including six
rendered-control tests with all external effects mocked, full app/node type-check
and local production build passed. Production remains unchanged. Native schema,
document-agent side effects, payment-record evidence, full transfer/snapshot/
filing integration and historical reconciliation are still release gates. The
new frontend must not ship before its pending backend dependencies; old financial
payloads intentionally block rather than masquerading as a verified balance.

### Subsequent completion-boundary correction (local only)

`20260904034603` now makes readiness persistence consume the canonical claim,
instead of allowing the with-scope wrapper to overwrite it with raw penalties.
Fresh read-only production definitions confirmed all three guarded hashes.
The first four executable completion regressions failed against the old functions
and passed after the replacement. There are now 36 completion tests (139 in the
combined claim/readiness suite), covering saved audit totals as well as returned
results, responsibility/proof, real/cancelled receipts, authorization, malformed
confirmations, exclusions, source marker and exact rollback.

Also fixed the wizard continuing conversion after an empty completion response.
It now verifies ready/claim agreement and refreshes both financial sources when
the returned claim differs from what was reviewed. Thirteen rendered controls
tests use mocked external effects. See `2026-09-04-legal-readiness-completion-design.md`.

The later `auto_verify_legal_transfer_review_v1` remains a concrete next gate:
its live definition uses government-paid penalty state and a saved proof flag,
not a freshly verified canonical liability. No production conversion, historical
audit rewrite, deployment, message, or live financial mutation was performed.

### Subsequent automatic-review correction (local only)

The next continuation addressed that specific automatic-review gap with pending
`20260904040649`, reusing the shared canonical snapshot validator extracted into
pending completion migration `20260904034603`. Fresh production read-only hashes
and the service-only ACL were verified. Three initial real-SQL regressions proved
stale amounts after receipt cancellation, removed proof accepted, and changed
customer accepted. They now pass, with 35 system-review tests and 322 SQL tests
across five suites. See `2026-09-04-legal-system-review-revalidation-design.md`.

The new review recalculates current financial facts, retains original readiness
evidence, scopes customer/vehicle identity, preserves exclusions, validates current
documents and prevents premature closure of pending reviews. It preserves private
function permissions and rollback evidence. Actual existing-case reuse, cancelled/
expired conversion and frozen-snapshot branches remain the next gates; the full
conversion graph and native concurrency effects are not certified. No deployment
or production write occurred.
