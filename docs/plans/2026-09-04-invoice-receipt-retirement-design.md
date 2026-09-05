# Invoice aggregate receipt-sync retirement candidate

Status: local candidate only, not release-ready or deployed. The complete
contract-details goal remains active. The previous turn's shared payment reader
was concrete progress; this continuation addresses its underlying write-side risk.

## Fresh evidence

Read-only production queries on 2026-09-04 reconfirmed the inspected bodies:
`sync_receipt_on_invoice_update` = `330e1ba91be25f6b05f7c265d4e59484`,
`guard_canonical_rental_receipt_v1` = `1786bc264a42aedc98a6543c931bc58e`.
Neither the new monthly reader nor financial refresh gateway was present under
its exact v1 function name. The old invoice-to-receipt trigger remains attached.

The receipt table has five user triggers. The test fixture now includes all five
real function bodies (hash-checked), not only the immutability guard:
guard, receipt numbering, balance/status calculation, late marker, updated_at.
Fresh schema reads verified receipt_number text, fiscal_year integer, is_late boolean.
The invoice table has many other triggers (journals, audit, reminders, budgets,
multiple schedule synchronizers, etc.); these tests do NOT install that full graph.

## Design and changes

Pending migration `20260904001503_retire_invoice_aggregate_receipt_sync.sql`
removes only the inspected invoice-to-receipt trigger. It preserves function
definitions, the receipt guard, all receipt records, payments and allocations.
It requires the canonical monthly reader prerequisite and refuses unknown body
hashes, trigger events/state, or additional renamed synchronization triggers.
The DDL is inside one DO block, takes a bounded-wait table lock, normalizes the
deparser search path temporarily, and restores caller settings. Repetition is safe.

The matching rollback restores the exact original trigger without overwriting a
replacement or changed function. It **restores the known old defect**, so it is
an emergency schema reversal, not a repair of customer records.

Rejected alternatives remain: overwriting only legacy receipts still corrupts
their history; bypassing the canonical guard corrupts canonical facts; deleting
positive historical rows from aggregate counts has no transaction provenance.
Simply deploying this trigger change while consumers still read summaries is
also insufficient. This candidate is one part of the integrated transition.

## Executed verification

`node --test --test-name-pattern='local retirement candidate'
tests/database/contract-financial-refresh.test.mjs`: 12 ordinary passes, no TODOs.

Tests cover unchanged canonical and legacy receipt facts; original dates/numbers;
two 500 payments and reversal returning a 1,500 invoice to a 1,000 balance; no
synthetic receipt on payment/replay/reversal; fee-inclusive 620 receipt staying
620 while invoice principal is 500; legacy summary history retained but excluded
from canonical paid state; immutability and all five receipt triggers retained;
repeatable forward/rollback; missing prerequisite; changed function/trigger
rejection; restricted search_path and preservation of session settings.

Combined refresh and actual canonical monthly SQL suites: **43 ordinary passes
plus 4 executed failing TODOs** (47 cases). The TODOs deliberately still reproduce
the original production trigger, without applying the candidate. Exit code zero
does not make this a green production release gate. They were not rewritten to
approve legacy corruption. Monthly-reader tests exercise actual SQL separately;
installing its definition as a migration prerequisite in retirement tests is not
proof of end-to-end report deployment.

Initial failures were test fixture setup errors (missing terminators between
pg_get_functiondef snapshots, then numeric parameter inference), not additional
production defects. Both corrected. Cleanup now rolls back before resetting role
so one aborted fixture transaction cannot contaminate following tests.
Node syntax and diff whitespace checks passed. No frontend changed this turn;
the previous frontend build is not presented as validation of this SQL change.

## Release gates and next work

1. Replace remaining cumulative-receipt consumers, especially
   `usePaymentLegalIntegration.ts`; its paid-month counting and elapsed-30-day
   estimates are still wrong. Case creation/closing in that module also lacks
   adequate contract-specific lifecycle checks. No legal mutations were run.
2. Complete provenance-aware historical reconciliation. Existing positive legacy
   receipts must not be imported as new money or treated as current settlement.
3. Exercise the entire invoice/payment/schedule/journal trigger graph and real
   multi-session concurrency, not just this receipt-focused PGlite fixture.
4. Resolve fee-accounting and pending backend prerequisites; review deployment
   order and get the necessary production deployment authority.
5. Continue LTO2024276 signed-term/schedule reconciliation and the remaining
   contract page flows. No claim that the entire system is error-free.

No production DDL/DML, financial command, message, deployment or legal transition
occurred. PostgreSQL DROP TRIGGER syntax was checked against its official v17
documentation; the Supabase changelog markdown endpoint failed content-type
handling, so no changelog conclusion was inferred.
