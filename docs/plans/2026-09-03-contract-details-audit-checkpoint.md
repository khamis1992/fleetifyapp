# Contract details audit checkpoint — 2026-09-03

Status: ongoing; updated after isolated PostgreSQL verification. This is a checkpoint, not a declaration that the entire page or production system is error-free.

## Latest continuation — gateway database integration (2026-09-04)

Executed the pending refresh gateway with four real calculation helpers whose
body fingerprints match live definitions. Result: 14 passing tests + one executed
failing TODO. The new conflict is invoice aggregate synchronization trying to
rewrite immutable per-payment receipts (two receipts of 500 each to 1000 each),
causing SQLSTATE 42501. Keep the immutability guard; do not publish the gateway
as verified before separating aggregate and individual-receipt synchronization.
The company currently has zero invoice-linked canonical rental receipts in the
read-only aggregate, so this is not an asserted existing customer incident.
See [gateway database audit](2026-09-04-contract-financial-refresh-database-audit.md).
No production writes, runtime migration changes or deployment in this continuation.

## Earlier continuation — financial reader synchronization (2026-09-04)

Implemented the reproduced frontend stale-read repair: validated RPC success
always reloads financial readers, cancels pre-command reads, and distinguishes
read failure from command failure. Added read-only recovery and explicit missing
RPC errors. Both original expected-failure cases are now ordinary passing
regressions. Current targeted suite: 42 ordinary passes (22 real query-client,
12 mounted page, 4 reader utility, 4 static migration checks). TypeScript app/node
and targeted ESLint pass. No production writes or deployment.
`npm run build:ci` passed in 1m23s with Browserslist/OpenCV/chunk warnings;
this is not an end-to-end browser or production verification.

**Production gate freshly verified:** `public.refresh_contract_financial_state_v1`
is absent from pg_proc on the configured project (two read-only checks). Local
migration `20260903085138` and its TypeScript declaration do not prove deployment.
The frontend repair cannot restore production automatic synchronization until
the gateway and its prerequisites are reviewed, published and verified. See
[read synchronization audit](2026-09-04-contract-details-read-synchronization-audit.md)
for evidence boundaries and the proposed post-success refresh design.

## Earlier continuation — real receipt journal integration (2026-09-04)

Actual receipt-journal and bank journal/balance triggers now run in the canonical
fixture. Bank/payment share one journal, replay does not duplicate it, and posting
failure rolls back the entire receipt. **New unresolved blocker:** a newly
assessed 120 fee on a 620 receipt is credited with principal to RECEIVABLES;
the expected rental settlement is 500. The executed assertion fails and is TODO.
Live account 4200 (“إيرادات الغرامات”) is level 2, not an eligible posting leaf;
a suitable approved fee posting mapping/treatment remains required.
Combined results: 122 passes, 2 TODOs (one executed failing regression, one
unimplemented full-schema gate). Do not treat exit code zero as release approval.
See [receipt journal audit](2026-09-04-receipt-journal-integration-audit.md).
No runtime/production changes in this continuation. Wider goal remains active.

## Earlier continuation — actual bank receipt integration (2026-09-04)

Replaced bank helper doubles in the canonical-state suite with the real bank
selection, movement, balance and payment-link guard. Reproduced adoption of a
cancelled legacy movement. Pending `20260903213117` requires unambiguous internal
payment identity, status/date/amount/bank/direction/journal agreement before
reattaching history. External reference alone requires reconciliation, not a
guessed link or duplicate deposit. See [bank audit](2026-09-04-bank-payment-link-audit.md).
Final combined run: 117 passed, zero failed, one full-schema TODO (118 total).
The canonical-state suite now has 37 passing tests with the real bank-link trigger.
Bank journaling/activity/balance-update triggers, complete constraints/RLS,
concurrency and browser recovery remain open. No deployment or live mutations.

## Earlier continuation — fee-only invoice link (2026-09-04)

Reproduced the real synchronization regression (3 pass / 1 fail): fee-only
receipts lost their invoice link before immutable request recording. Pending
`20260903211652` derives one invoice only from complete matching fee evidence,
without counting fees as rent. The canonical-state suite now uses actual
principal totals, auto-seeding and synchronization. Scope, partial/voided
allocation, multiple-fee, ACL and guarded rollback cases are covered. See
[fee-only link audit](2026-09-04-fee-only-invoice-link-audit.md).
Final run: 99 passes, zero failures, one full-schema TODO across three suites;
19 cases exercise the newly expanded canonical synchronization suite.
No production mutations or caller activation; full-schema and concurrency
gates and the rest of the page audit remain open.

## Earlier continuation — scoped principal/fee guard (2026-09-04)

Pending migration `20260903210643` adds transaction-owned context and an exact
allocation postcondition to the unpublished v2. The financial guard deducts the
fee only for a matching authorized command in this transaction. Period, genuine
overpayment and allocation protections remain active; no GUC bypass is added.
Tests now attach the real allocation validator in addition to the financial and
warning triggers. 80 tests pass and one full-schema TODO remains. Rollback and
unexpected-context refusal are tested; no production writes or caller activation.
Full-schema journaling/banks/all-trigger behavior, concurrency, false gross-fee
warnings, browser recovery and the wider page audit remain open. See
[principal control audit](2026-09-04-fee-principal-control-audit.md).

## Earlier continuation — immutable fee-payment request identity (2026-09-04)

The pending v2 migration now records original normalized request data atomically
with its payment ID in a locked-down immutable ledger. The live-warning replay
regression failed before this repair and passes after it; edits to the original
request are still rejected. ACL/RLS, tenant identity, retention, actual receipt
consistency and failure rollback have targeted SQL tests. Rollback disables v2
without deleting command history. Neither the new table nor v2 is deployed;
frontend callers remain unchanged. The gross-receipt/principal control defect
is still reproduced and keeps a TODO release gate open. Full-schema/concurrency,
durable client recovery and the complete page audit remain required. See the
[latest replay audit](2026-09-03-invoice-fee-replay-audit.md) for counts and limits.

## Earlier continuation — actual fee-payment RPC and live-trigger conflicts

See [invoice fee replay audit](2026-09-03-invoice-fee-replay-audit.md).
The pending fee-payment v2 is NOT ready to activate. Wrapper tests pass, and
integration with the production-matching v1 body verifies receipt allocations
and rollback across downstream failures. Adding two enabled, production-matching
triggers reproduces two open defects: the financial guard treats fee-inclusive
cash as principal, and a gross-overpayment warning changes notes and invalidates
v2 replay identity. Two TODO release gates remain explicit. The new suite's
green defect-reproduction assertions are evidence of unresolved bugs, not fixes.
Production calls were read-only definitions/hashes/trigger-state checks; v2 is
absent from production. Tests/docs changed, not customer data or frontend callers.
Next: immutable command identity and canonical fee/principal validation, then
full-schema/concurrency and browser recovery checks. See linked audit for scope.

## Earlier continuation — payment command/read outcome and automatic retry

See [payment command outcome audit](2026-09-03-payment-command-outcome-audit.md).
Fresh source inspection found the app defaults to retrying failed mutations once.
Under that setting, three hook regressions demonstrated two payment RPC calls
after a confirmed save followed by a failed read. Both creation hooks now disable
blanket mutation retries, preserve confirmed payment IDs across read failures,
and distinguish that outcome in warnings. The details dialog closes/refreshes
the original form without resetting a newly selected invoice. Local regression
tests pass; final counts/build are in the linked audit. Production inspection
was read-only function-definition retrieval. Fee policy disagreements, lost
command acknowledgements/durable idempotency, other post-commit operations,
browser/full-schema validation and the complete audit remain open.

## Earlier continuation — verified fee reads and exact waiver acknowledgements

See the follow-up in [payment feedback audit](2026-09-03-contract-payment-feedback-audit.md).
Fee/allocation read failures now block collection with read-only retry, preserve
partial entered amounts and include company scope. Waivers require returned-row
confirmation of the company/invoice/status (and exact existing fee), then await
persisted fee reading rather than overriding all fees with a local boolean.
Confirmed-waiver/failed-refresh outcomes remain distinct; a previous invoice's
late response does not waive the currently selected invoice. The final local
run passes 78 tests in seven files, app/node type checking and build (1m 22s).
Live access was read-only schema verification; no payments, waivers, deployment
or customer data corrections were performed. Hardcoded fee policy, only-newest
fee selection, concurrent operations, full-schema/browser validation and all
broader audit gates remain open. The previous turn freshly confirmed that
LTO2024276 still has a 1,500 QAR September 2027 schedule after its August 2027 end.

## Earlier continuation — visible payment outcomes and complete page refresh

See [payment feedback audit](2026-09-03-contract-payment-feedback-audit.md).
Five runtime paths used a disabled toast logger. They now use the real store,
and the compatibility module also delegates to it. The payment dialog now
separates successful recording from failed synchronous/asynchronous parent
refresh, and the details callback awaits invoice, payment, schedule, contract
and audit readers, including UUID/number route keys. Ten new rendered and
QueryObserver tests pass; the combined regression run passes 62 tests. App/node
type checks and a fresh local production build (1m 30s) pass. No real payment,
waiver or deployment was performed. Remaining verified
risks include late-fee read failures represented as empty/zero data, hardcoded
fee assumptions, invoice date filtering and post-commit/double-submit behavior.

## Latest continuation — complete billing evidence and honest acknowledgements

See [billing evidence audit](2026-09-03-contract-billing-evidence-audit.md).
Current-source review found the page filtered earlier/undated schedules out
before validating the contract, and the billing service turned incomplete
success responses into zero invoice counts. The page now loads all contract
schedule dates; the existing snapshot still excludes out-of-period rows from
totals. The shared service rejects malformed counts/modes/totals, preserves an
unknown generated-schedule total as null, and no longer mislabels permission
errors as missing migrations. 52 targeted tests and app/node type checks pass;
targeted ESLint has zero errors and one existing warning. This does not repair
LTO2024276's persisted schedule or deploy the pending billing command. A fresh
local production build passed in 1m 23s with bundling/dependency warnings;
browser and full-schema tests remain separate gates. No customer data was mutated.

## Latest continuation — quick-edit audit

Document lifecycle continuation: [document audit](2026-09-03-contract-document-lifecycle-audit.md). Fixed the mismatched company/contract cache prefix and unified dependent legal evidence refresh in seven write/scan paths (43 targeted tests). Subsequently strengthened the pending last-signed-document guard with active/matched independent replacement checks, locked direct/canonical evidence, conservative nonterminal-case handling, and an explicit contention message. The latter passes 36 isolated PostgreSQL tests plus 10 targeted Vitest tests, TypeScript and targeted ESLint. Production catalog reconfirms the trigger is absent. Full-session concurrency, full-schema integration, filed-package preservation and storage cleanup remain gates. No production writes or storage deletion occurred.

- See [quick-edit audit](2026-09-03-contract-quick-edit-audit.md): production catalog inspection plus a new isolated reproduction establishes a notes-save amount-drift mechanism. An unchanged date/amount payload triggers legacy inclusive-month recalculation after the financial guard. Synthetic amount rises from 64,800 to 66,600; a description-only update preserves it.
- Reproduction command: `node scripts/audits/reproduce-contract-quick-edit-amount-drift.mjs`. This demonstrates the historical defect, not successful remediation or full-schema testing.
- Additional current-source findings: zero-row success acknowledgement, vehicle-edit UI/DB mismatch, omitted fine settings/unit mismatch, incomplete amendment cache refresh, and amendment concurrency/tenant-role/billing-reconciliation gaps.
- A later continuation added local amount-drift containment: pending migration `20260903185654`, a versioned description-only save service, and the wizard integration. 11 real-SQL fixture tests plus 16 service/rendered tests pass. See the quick-edit audit for boundaries. Production deployment, full-schema checks, and a verified amendment command remain gates before declaring quick-edit safe.

## Scope and evidence

Latest evidence-retention continuation: production already restricts deleting
direct signed sources from preparations/jobs, but eleven other legal evidence
references silently become NULL on document deletion. Pending migration
`20260903192847` changes these to RESTRICT with a matching rollback; 20 new
real-SQL tests cover the old loss behavior, restriction, existing source guards,
and atomic migration failure/rollback. The delete hook explains referenced-record
rejection without storage cleanup. Legacy URL-only job payloads remain a separate
gap: 18 of 19 company jobs have no relational source ID, and none of those 18
has a source ID in its contract payload either. This is not evidence of actual
filing or missing bytes. See the document audit for scope and verification limits.

The user goal remains the complete contract-details workflow: accurate dates and billing, payments and cancellations, vehicle lifecycle, documents and identity, legal transfers/reversals, audit history, retry safety, and automatic synchronization.

Read-only production checks against project `qwhunliohlkkahbspfiu` at this checkpoint:

- `pg_proc` contains `public.revert_contract_from_legal_v1`, but not `revert_contract_from_legal_v2`.
- `supabase_migrations.schema_migrations` returns no versions at or above `20260903160000`. This is a history observation, not proof that every earlier migration is deployed or every later function is absent.
- Remote `profiles.role` is constrained to `admin`, `manager`, `employee`, and `customer`; authorization must also be checked against the application's real role source before publishing v2. Remote `lawsuit_preparations.status` is varchar with no table CHECK constraint found. `contract_operations_log.idempotency_key` is absent, confirming that this prerequisite is still pending.
- The browser shows dates 2024-08-15 through 2027-08-15 for LTO2024276, and blocks invoice creation because a schedule exists for 2027-09. Date detection works; the persisted schedule conflict remains unresolved.

## Findings addressed locally in this checkpoint

1. **Inconsistent legal reversal validation:** `ContractStatusManagement` accepted five characters, while the pending v2 database function requires ten. The dialog and shared service now use one ten-character minimum for legal reversal. Ordinary suspension retains its five-character rule. Whitespace is excluded, and Unicode code points are counted consistently with PostgreSQL character length.
2. **Divergent reversal entry points:** the exported `useRevertFromLegal` hook used v1 while contract details used the shared v2 service. The exported hook now delegates to that service, accepts an optional stable idempotency key, and invalidates the legal queue and case-existence cache after success.
3. **Weak success acknowledgement:** the service previously accepted any object containing `success: true`. It now also requires the requested `contract_id` and a boolean `changed`. A malformed or mismatched acknowledgement produces an explicit verification warning rather than success. Missing migration errors still fail closed without falling back to the old mutation.
4. **Reversal versus queue writers:** the pending SQL now locks case, job, and preparation rows before reading guards. It uses NOWAIT with an explicit `55P03` failure because the existing enqueue and complete functions take locks in different orders. This avoids waiting while holding contradictory dependent locks. Actual multi-session concurrency remains a separate gate below.
5. **Restart after reversal:** a queue-entry trigger checks the company/contract/case relationship and open preparation stage under a shared case lock. Old restart RPCs cannot requeue a job whose case has been closed by reversal.
6. **Submission uncertainty and incomplete filing metadata:** reversal now rejects `SUBMISSION_UNCERTAIN`, a case reference, or submitted/registered preparation timestamps even if job/case stage fields are stale. Evidence of possible external filing is not discarded.
7. **Authorization:** a caller-supplied actor ID is not a replacement for `auth.uid()`. Active profiles may obtain manager/admin privileges through a same-company `user_roles` row as well as the legacy profile role. Other-company grants and inactive profiles are denied.
8. **Retry and orphan state:** request-key reuse with a different request is rejected; replay preserves preparation counts. An orphaned unsubmitted preparation is included in the cleanup decision rather than returning a false no-op.

## Verification

- 29 targeted tests passed: rendered status/reason behavior (2), service behavior (19), conversion/reversal hooks (3), and existing migration source checks (5).
- Full Vitest run passed: 259 files, 1,821 tests, 123.66 seconds. Test logs contain existing mock-path errors/warnings; a green suite does not prove those paths or production behavior are healthy.
- TypeScript app and node checks passed after the changes and new tests.
- Targeted ESLint: zero errors; one existing `any` warning in the dialog's contract prop.
- `git diff --check` passed (line-ending notices only).
- The rendered dialog test substitutes the Select control to isolate validation from jsdom pointer behavior. It does not claim native browser or production end-to-end coverage.
- Migration source checks are static assertions. They do not establish transaction, concurrency, authorization, or production runtime correctness.

### Isolated database verification added in the continuation

- `npm run test:legal-db`: 26 passing tests executing the actual pending reversal migration and actual deployed claim-function migration on PGlite/PostgreSQL **17.5** (production reports **17.4**). The server-major assertion prevents an accidental upgrade of this fixture to PG18.
- Uses a minimal schema subset with column names/types verified from production; all records are synthetic. The vehicle derivation function is deliberately stubbed. Production financial/agent triggers and production RLS policies are not reproduced.
- Runs authenticated/anonymous/service identities via session authorization, checks company isolation and supplied-actor spoofing, performs real dependent updates, injects an audit constraint failure to verify complete rollback, and executes the rollback migration without deleting business records.
- Verifies all seven running/filed statuses, uncertain submissions, independent filing evidence, restart/enqueue rejection after reversal, orphan preparation cleanup, retry counts, and the real worker claim RPC skipping a reversed job.
- The harness is under `tests/database/`, outside the Vitest jsdom suite. It uses pinned dev-only `@electric-sql/pglite` 0.3.16. No credentials, `.env` files, network requests, or external database connections are used by the test runner.
- Docker's daemon was confirmed unavailable. PGlite is single-connection, so these tests **do not prove multi-session concurrency**. See [PGlite connection limitation](https://pglite.dev/docs/).
- Updated migration-source suite: 7 passing tests. TypeScript app/node checks pass. The earlier full-suite result above predates these SQL changes; it must not be presented as current full deployment coverage.

## Remaining verification gates

- Review and deploy the pending legal-reversal migration with verified remote columns, constraints, permissions, and rollback. **Do not ship the frontend change as a completed production repair while v2 is absent.**
- Verify the new NOWAIT/shared-lock protocol with two independent PostgreSQL sessions: enqueue-first/reversal-first, claim-first/reversal-first, restart, completion, and statement rollback under lock contention. The locking implementation is present, but single-connection tests are insufficient evidence for this requirement.
- Verify handling of historical filed jobs versus a current unfiled legal episode. The pending SQL blocks any historical filed job for the contract; do not silently weaken that protection without defining the case scope.
- Repeat the isolated tenant-isolation, permission, retry, no-op, and partial-failure cases against the complete deployed schema (including agent/financial triggers and RLS) in a disposable environment. Do not use customer contracts to exercise destructive cancellation paths.
- Reconcile LTO2024276's persisted dates, amounts, and schedule against its signed evidence before generating invoices. This checkpoint changed no contract or financial records.
- Complete current-state review of quick contract edits, document reclassification, payment cancellation and allocation, vehicle return, and cache refresh behavior. Prior tests and previous turn summaries are leads, not proof of current production completion.

No production writes, migration deployment, legal reversal, payment mutation, or customer messaging were performed in this checkpoint.
