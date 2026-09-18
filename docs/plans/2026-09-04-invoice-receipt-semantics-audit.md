# Invoice aggregates versus payment receipts

Status: diagnosis and executed regression evidence; no production repair or deployment.

Local candidate follow-up: [receipt-sync retirement](2026-09-04-invoice-receipt-retirement-design.md)
adds a reversible, schema-checked migration and 12 passing tests with all five
receipt-table triggers. The original four production-behavior TODOs remain as
failure evidence. Remaining reader migration and full integration gate deployment.

Implementation follow-up: [canonical monthly reader](2026-09-04-canonical-rental-month-summary-design.md)
replaces the monthly receipt-based report locally with a verified invoice/ledger
reader. This does not yet fix the old synchronization trigger or the other
consumers listed below. The four failing TODOs remain release blockers.

Next implementation follow-up: [legacy receipt provenance audit](2026-09-04-legacy-receipt-provenance-audit.md)
removes this UI's unproven bulk payment/journal creation and replaces it with
company-scoped evidence review. Automatic import from an authoritative original
source remains to be implemented; this is not a completed historical migration.

The preceding date investigation made evidence progress: a fresh read confirmed
LTO2024276 starts 2024-08-15, ends 2027-08-15, and still has a pending QAR 1,500
schedule on 2027-09-01. Date discovery is not the failing condition. This turn
continued the broader contract-details goal by auditing the receipt consumers
before changing invoice recalculation's side effects.

## Authoritative reads

Production function bodies still match the retained fixture on 2026-09-04:

- `sync_receipt_on_invoice_update`: `330e1ba91be25f6b05f7c265d4e59484`.
- `guard_canonical_rental_receipt_v1`: `1786bc264a42aedc98a6543c931bc58e`.

Company-scoped read-only counts for `24bc0b21-4e2d-4413-9842-31719a3669f4`:

| Observation | Count |
| --- | ---: |
| Rental receipt rows | 3,967 |
| Rows without canonical_payment_id | 3,967 |
| Invoice-linked receipt rows | 2,775 |
| Invoices linked to multiple receipt rows | 1 |
| Cross-company invoice links | 0 |
| Positive receipt rows on cancelled invoices | 982 |
| Positive receipt rows on non-cancelled invoices with paid_amount zero/null | 68 |

These are **review populations, not proven invalid payments**. A historical
receipt can remain after a legitimate cancellation/reallocation. An invoice
cache can also be wrong. No amounts were summed as customer loss, no rows were
deleted, and no specific cause was assigned to these 68 records without tracing
their payments, allocations, cancellation history and journals.

## Additional executed failure cases

`node --test tests/database/contract-financial-refresh.test.mjs` now executes
18 cases: **14 pass and 4 failing TODOs**. Zero process exit is NOT a green release
gate. The earlier canonical guard conflict is retained. Three new cases execute
the real inspected receipt sync function and accounting helpers:

1. Two legacy receipts of 500 on one invoice become 1,000 **each** when invoice
   paid_amount is correctly recalculated to 1,000. Unlike canonical receipts,
   the legacy records have no guard to reject this historical mutation.
2. Two payments of 500 cause a new aggregate rental receipt of 1,000 without a
   canonical payment identity. Its payment_date comes from invoice due_date,
   not from either underlying transaction. The fixture includes the customer
   join required for the real insert path; it does not stub receipt insertion.
3. A synthetic invoice-generated summary becomes paid at 1,500. Cancelling its
   sole payment and refreshing resets invoice paid_amount to zero but leaves
   the generated summary paid at 1,500. This assertion applies to the summary
   created in the test, not to immutable historical individual receipts.

Only the isolated PGlite fixture is mutated. It is still not the full production
schema, all triggers, authentication provider or multi-session concurrency.

## Consumer dependency review changes the proposed fix

- `src/pages/financial-tracking/UnpaidByMonthView.tsx` interprets a receipt's
  paid/partial status as monthly settlement and groups by payment_date. That
  conflates transaction month, invoice service month, and cumulative settlement.
- `src/hooks/usePaymentLegalIntegration.ts` sums receipt amounts and counts
  receipt month entries as paid months. Multiple receipts for one month are
  not deduplicated; reversing payments is not checked against the payment ledger.
- `src/pages/SyncPaymentsToLedger.tsx` treats an unmatched legacy receipt as a
  candidate new payment. Matching uses same customer/date/amount (optionally
  contract), not proof that an invoice aggregate is an independent transaction.
  An aggregate dated at invoice due_date can therefore miss its real partial
  payments. This is a source-level risk, NOT an executed production duplicate.
- `create_rental_receipt_payment_v1` creates an individual payment using
  p_total_paid and stores canonical_payment_id, initially with invoice_id null.
  Do not claim every new canonical receipt currently reaches the invoice-linked
  conflict; the existing regression exercises a supported linked-row state.

## Integrated repair design / next implementation boundary

Preferred: invoice balances and monthly reports derive from canonical payments,
active allocations and canonical invoice service months; individual receipts
retain transaction identity, amount and date. Stop aggregate refresh from
creating or overwriting receipt facts. Change all identified dependent readers
as part of the transition, and prevent legacy migration from treating invoice
summary records as new money without proven provenance. Historical receipt
classification/reconciliation must be audited and reversible, not inferred
solely from canonical_payment_id being null or from amount/date matching.

Rejected partial alternatives:

- Skip only canonical rows in the old trigger: leaves silent legacy inflation,
  synthetic receipt creation and stale summary consumers intact.
- Bypass the canonical immutability guard: corrupts per-payment history.
- Drop synchronization alone: stops future mutations but leaves reports relying
  on a stale aggregate table and does not address legacy migration duplication.
- Reset/delete positive historical receipts automatically: loses legitimate
  cancellation/reallocation evidence and is not justified by aggregate counts.

Next: implement canonical monthly-summary readers and migration provenance
checks, then a reversible retirement of aggregate-to-receipt writes. Convert
the four failing cases into ordinary regression passes without asserting the
legacy defective state is correct. Verify against the full trigger chain before
publishing the pending financial-refresh gateway. Production reconciliation,
fee-accounting decisions and the broader contract-details goal remain open.
