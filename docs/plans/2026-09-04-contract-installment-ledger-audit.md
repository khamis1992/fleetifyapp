# Contract installment ledger audit and design — 2026-09-04

Local implementation only; no production financial writes or deployment.
The previous turn provided new live evidence: LTO2024276's dates are present,
but its pending September 2027 schedule exceeds its August 2027 end. That is
progress in diagnosis, not correction of the contract or completion of the goal.

## Evidence and chosen behavior

The actual installment builder used max(traced payments, cached invoice paid),
netted an entire month's invoices before clamping remaining, used a one-QAR
paid threshold, and considered only visible invoice allocations when deciding
whether to use a payment's legacy invoice link. New executed regression tests
reproduced 11 failures before repair (5 passes).

Keep cached balances as discrepancy evidence, not a second payment source.
Use effective successful receipts and active invoice allocations; any active
allocation suppresses gross legacy invoice fallback, including fees, contracts
and other invoice targets. Inactive history does not suppress that fallback.
Calculate remaining per invoice before month aggregation. A positive rounded
remaining balance is not paid. Determine lateness from unpaid invoices.
Retain cancelled/inactive history without calling it effective collection.

Alternatives rejected: trusting cache perpetuates cancelled/reallocated money;
blindly showing trace-only numbers as verified hides missing evidence. The
selected design uses trace-only values with a visible review status for each
invoice-level cached discrepancy, even when differences offset at month level.
No automatic financial correction is performed by this display.

## Read boundary and UI

- All three payment/allocation queries now keyset-page until an explicit empty
  page, not a server-dependent row cap. Null data, query errors, unordered or
  duplicate IDs and excessive pages fail without returning partial balances.
- Removed the receipt start-date filter: advance receipts may pay an invoice.
- All query keys include company and contract. Allocation keys share the
  contract-payments prefix so existing financial refresh invalidates them too.
- Creator-profile lookups now include company scope.
- A failed source, missing active allocation's receipt, or missing scope hides
  the ledger with a read-retry action. Empty all-allocation results no longer
  fall back to an earlier invoice-only response.
- Cache disagreement is visible before expanding the installment, and is not
  labelled verified debt. Progress uses remaining, caps at 99 while money is
  outstanding, and cannot imply completion from cross-invoice overpayment.
- Parent page currently gates invoice read errors before rendering financial
  tabs (ContractDetailsPageRedesigned), inspected separately from child tests.

## Verification

- 36 tests passed: ledger 19, pagination 6, rendered payment tab 7, existing
  financial invalidation 4. UI tests mount the actual React component with
  QueryClient and mocked Supabase, including all three read failures, advance
  receipt inclusion, company predicates, cache divergence and failed background
  refresh, and a missing receipt referenced by an active allocation. They do
  not constitute a live browser or database integration run.
- App and node TypeScript checks passed during implementation; targeted lint
  had zero errors and ten existing warnings in the large payment-tab component.
- Production build passed in 1m 23s (6,656 modules). Existing warnings include
  large bundles, old Browserslist data, OpenCV browser externals and mixed
  static/dynamic imports. This is not preview/browser or deployment evidence.

## Still incomplete in the full goal

These paged HTTP reads are not a transaction snapshot. Concurrent source changes,
large IN-filter URL limits, source amount/schema validation and full parent
invoice pagination still need end-to-end verification. The review status does
not repair server caches, receipts or journal entries. The full financial
trigger fixture's four known failing scenarios, canonical legal readers,
deployment/migrations, LTO2024276 signed-term reconciliation, fee accounting,
document lifecycle and the rest of the contract-page audit remain open.
No claim is made that all contracts or the entire system are error-free.
