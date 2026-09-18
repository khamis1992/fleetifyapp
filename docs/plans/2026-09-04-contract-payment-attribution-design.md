# Contract payment attribution and summary audit — 2026-09-04

Status: local implementation and verification, not deployed. No production
invoices, payments, contracts, schedules, legal cases or messages were mutated.
The contract-details goal remains active and substantially incomplete.

## Scope and evidence

The previous user-facing check reconfirmed LTO2024276's real dates and its
out-of-period September 2027 installment. It did not repair that schedule.
This continuation re-inspected the current worktree and completed the pending
parent payment reader and summary work, rather than claiming the date check
proved anything about the rest of the page.

Before this continuation, the worktree already contained the attributed payment
service, parent query wiring and initial snapshot changes. A fresh run verified
63 tests. Inspection then found remaining contradictory calculations:

- The paid total used applications, but outstanding/due-now still used cached
  invoice balances/status and ignored balances of one QAR or less.
- A cancelled last receipt could leave the original invoice looking settled.
- A dashboard tile still said settled during reconciliation or on zero/unknown
  contract value; its grand total lost attributed excess above capped principal.
- Allocation anchors discovered in one request could disappear/change in the
  final request, reviving the legacy gross fallback.

## Design and implementation

Selected explicit payment applications and evidence-driven invoice read models
over gross receipt summation, cached-paid fallback or merely hiding warnings.
Preserve raw gross receipt amounts and source invoice rows for audit; do not
create remainder invoices, change posted financial data or auto-allocate money.

`contractPaymentEvidence.ts` requires company/contract/customer scope. It reads
direct and allocation-only payment links, keeps advance receipts, follows all
pages to explicit EOF and batches ID lists at 100. All reads are company-scoped.
It loads all allocation types before deciding whether legacy direct-link
fallback is valid. Any active allocation suppresses gross fallback. Successful
receipt transactions contribute only allocations to this contract or its
invoice IDs. Other-target and non-invoice fee allocations do not contribute.
An invoice target may itself represent non-rental charges: this reader does NOT
yet separate invoice charge categories from contract rental principal.

Missing active receipts, identity/scope conflicts, invalid/negative/sub-cent
money, over-allocation, duplicate evidence and failed pages fail the read.
It compares observed allocation anchors with final evidence so disappearance,
deactivation, amount change or retargeting cannot silently restore gross credit.
This is not a transaction snapshot and cannot detect every concurrent insert.

The parent page uses company/customer-scoped payment cache keys and the reader.
The snapshot and diagnostic reconstruct invoice paid/balance from successful
applications in whole currency subunits. Balance is clamped per invoice before
summing; excess on one invoice does not settle another. A positive sub-QAR
balance remains open regardless of stale paid status. No source row is mutated.
The stored contract/invoice paid and balance values are compared with evidence,
and the actual page displays a reconciliation warning on mismatch. Contract
paid total is capped at positive contract value; excess remains separately
visible in the dashboard. The hero hides cached paid-installment counts during
financial reconciliation, and progress cannot round to 100 with money remaining.

## Verification

- Before repairing the remaining summary/UI defects, new tests reproduced
  eight failures (five financial snapshot/diagnosis, three mounted dashboard).
- After correcting the array shape of a test fixture, four allocation-change
  cases and three missing-scope cases reproduced seven genuine failures; these
  now pass. The earlier fixture type failures are not product defects.
- Combined run: 143 passing tests across ten suites: payment evidence 39,
  snapshot/diagnosis 20, mounted dashboard/hero 5, mounted parent source gates
  16, invoice evidence 16, schedule hook 11, installment ledger 19, page reader
  6, mounted installment UI 7, query invalidation 4.
- Tests use mocked backend data. The dashboard and hero tests mount real UI
  components (only chart rendering is stubbed). Parent query tests check wiring
  separately. This is not live browser, RLS, production repair or concurrency
  proof.
- Final TypeScript app/node passed; targeted ESLint passed with zero warnings
  and errors. The final source was re-tested: all 143 tests passed again.
- Final production build passed in 1m 22s (6,658 modules). Existing warnings
  remain for old Browserslist data, OpenCV browser externals, mixed imports and
  large chunks. No preview, live-browser verification or deployment is implied.

## Remaining work / next action

1. Follow-up: schedule paid counts, unpaid-schedule totals, next installment and
   the collection timeline have now been locally repaired and tested in the
   [schedule settlement audit](2026-09-04-contract-schedule-settlement-design.md).
   The tab now receives only reconciled snapshot rows, with explicit ambiguity
   and no gross-amount/status fallback. Source contractual print evidence remains
   distinct. Many-to-one legitimate invoice components, overnight refresh and
   end-to-end collection/print verification are still open.
2. The installment tab still has its own reader, no transaction-direction check
   equivalent to the parent, and unbatched large IN filters. Unify semantics
   without passing gross amounts off as principal or misclassifying charges.
3. Validate invoice/schedule monetary inputs and currency; handle snapshot
   consistency across invoice/payment/schedule requests and missing coverage.
   Invoice overpayment review and all invoice-tab payment/print actions need
   end-to-end consistency checks. No claim of safe automatic collection is made.
4. Resolve the four reproduced invoice/receipt synchronization failures against
   the actual DB trigger graph. Legacy receipt readers and accounting decisions
   still prevent treating the pending financial migrations as deployment-ready.
5. Canonical legal readers, fee accounting, pending deployment, signed-term
   reconciliation for LTO2024276, document/lifecycle/vehicle/quick-edit actions,
   and the broader page audit remain open. Targeted green tests do not close
   the full user goal or authorize financial/legal writes.
