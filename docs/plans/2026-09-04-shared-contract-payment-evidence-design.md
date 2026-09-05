# Shared contract payment evidence — 2026-09-04

Status: implemented locally; not deployed. This continues the full contract-details
audit and does not claim that the whole page or financial backend is complete.

## Evidence and decision

The latest read-only date investigation reconfirmed LTO2024276's real dates and
its out-of-period September 2027 installment. No contract data was changed.
The next source inspection found separate payment readers in the header and tab.
The tab's three queries omitted transaction direction, did not discover contract-only
allocation anchors, and built unbounded ID filters. It could disagree with the
parent's validated payment source and treated completed outbound money as rent.

Three executed regression tests reproduced that last defect: a completed payment,
refund or transfer of 500 reduced a 1,500 invoice to 1,000. All now pass normally.

Preferred design: one scoped evidence bundle/cache entry containing original
payments, contract-attributed applications and complete allocation history.
The parent selects payments; the ledger consumes the bundle. Invoice IDs are
deduplicated/sorted for cache identity, alongside company, customer and contract.
Existing paginated/batched validation remains in the shared reader. Display
filters operate locally and cannot alter financial scope or trigger a new read.

Alternatives considered: duplicating the source checks in the tab would retain
two cache lifecycles; forcing a tab refresh alone would not fix missing direction,
ownership checks or allocation-only discovery. A transactional server read remains
a stronger future consistency boundary: multiple HTTP reads are not atomic.

Creator names are optional, company-scoped, paginated and batch-limited separately.
Their failure does not erase financial evidence. Invoice display metadata comes
from the already scoped parent invoices, not an independent invoice join.

The collected metric uses this contract's applications, while original receipt
amounts stay intact. Removed the misleading percentage based on receipt count
(not percentage of debt settled). Completed outbound money does not settle rent
or enter collected-receipt printing; the print total explicitly describes gross
receipts, which may include other allocations. Existing cancellation authority
was not broadened to additional lifecycle states.

## Verification

- 230 passing tests across 11 files: 206 unit/component/query tests plus 24
  source-pattern guards. No expected-failure tests in this run.
- Real QueryClient/QueryObserver coverage proves shared cache, reordered invoice
  IDs, refresh propagation and error propagation to both observers.
- Mounted tab tests cover incomplete reads, missing receipts, wrong customer,
  over-allocation, advance receipts, direction, partial attribution, optional
  profile failure, local filters and failed background refresh.
- Parent mounted test executes its bundle query and checks its payment selector.
- Five initial mounted assertions failed because the exact text matcher omitted
  the metric subtitle; corrected the matcher, not the settlement expectations.
- Two source guards required updating: the removed invoice join now maps scoped
  invoice objects; an already changed wizard warning includes vehicle protection.
  The latter was an outdated string expectation, not a new wizard code change.
- TypeScript app/node checks passed. Targeted ESLint: zero errors, 12 existing
  style/unused/type warnings in the payments tab and ledger utility.
- Production build completed in 1m23s, 6,659 modules. Existing warnings remain:
  Browserslist age, OpenCV browser-externalized Node modules, mixed imports and
  large chunks. Build is not browser runtime or production verification.

## Still open

No production deployment, payment mutation, invoice creation, WhatsApp message
or legal transition occurred. The original goal remains active. Required follow-up
includes full-schema receipt-trigger/financial-refresh repair and concurrency
verification, fee accounting, the pending migration deployment review,
LTO2024276 signed-term reconciliation, contract-allocated/fee-only review semantics,
currency and malformed invoice/date handling, print/browser verification, and the
remaining document, lifecycle, vehicle and quick-edit flows.
