# Legacy receipt reconciliation: prevent unproven financial replay

Status: local implementation and tests; no production writes or deployment.
The preceding continuation implemented the canonical monthly reader and passed
its targeted gates, so it was progress rather than a wait/no-progress turn.
This turn addresses another consumer required before retiring receipt synthesis.

## Revalidated source findings

`/finance/sync-payments` remains an admin-protected route. Its previous page
implementation looked for a migration reference, otherwise matched the same
customer/date/amount (and optionally contract). A unique approximate match was
treated as linked and could trigger `ensure_payment_journal_entry`. If no match
or existing legacy journal was found, the page called the ordinary payment
creation hook using the receipt's total_paid. It did not consult
canonical_payment_id and filtered cancelled payments out of matching.

That is unsafe for invoice-generated cumulative summaries: a sum of several
partial payments can be a receipt row without ever being an independent cash
event. It is also unsafe to replay a canonical receipt whose original payment
has been reversed. These are source-level paths, not evidence that this tool
actually duplicated any particular production payment.

**Discarded hypothesis:** the migration key is not exclusively stored in a
different column. Inspection of `usePaymentOperations.ts` showed the provided
key is passed to create_payment_atomic's idempotency parameter and normally
copied to reference_number too (an explicit reference can override that copy).
The old page's lookup was incomplete, but a field mismatch alone was not proven
as the cause. The earlier user update was corrected after tracing this code.

## Implemented behavior

The page now calls the read-only `legacyRentalReceiptAudit` service. It cannot
create payments, repair journals, or mutate receipt links. No new RPC/migration
is needed for this particular consumer change.

- Prefer the explicit canonical pointer and inspect exact migration keys in
  both idempotency_key and reference_number. Conflicting candidates, missing
  direct links, or one payment used as proof for multiple receipts require review.
- Check tenant/customer/contract identity, valid two-decimal money, date,
  receipt direction and payment state. A same-date/same-amount coincidence with
  no direct pointer or migration key is not proof.
- Preserve cancelled/reversed evidence and report it without recreating money.
- Existing legacy journal conflicts or absent payment journal links require
  accounting review, not an automatic journal mutation from an approximate match.
- Positive invoice-linked summaries and unlinked originals without provenance
  remain review items. Zero-amount records are not treated as money to migrate.
- A linked result describes the observed payment identity only; this audit does
  not prove that the referenced journal's lines are balanced, posted to the right
  accounts, or unreversed. It is not a financial reconciliation certificate.

Queries read only the current company's receipts, payments (including cancelled
records), and legacy rental journals. Keyset pagination with stable ID order
continues until an empty page even if the server cap is lower than the requested
500 rows. Null/error responses, wrong-company rows, non-advancing pages, and the
10,000-page safety ceiling fail the whole report rather than accept partial data.

The UI keeps the existing route, clearly labels the action as a read-only audit,
uses company-scoped query state, suppresses old results while reading/on failure,
blocks a duplicate click, and offers contract links for follow-up. All results
remain accessible through 100-row display pages. It states that results can
change after the read and are neither a debt statement nor migration approval.

## Scope and remaining provenance workflow

This removes the unproven bulk-write path; it does **not** finish safe automatic
historical import. A future import command must accept authoritative source
evidence for an independent receipt, revalidate it atomically, prevent source
reuse, retain reversal history, and create exactly one payment/journal. The
current legacy table has mixed summary/transaction semantics, so absence of a
payment or journal cannot itself authorize new money. Normal payment registration
was not removed or changed by this patch.

Reads happen in several API requests, not a transaction-wide database snapshot.
No audit result authorizes a financial write, so a later command must reload and
validate all evidence under appropriate locks. The old invoice-to-receipt trigger,
legacy legal reports, historical classification, and the four SQL TODO failures
remain open. Do not deploy retirement of the trigger based on this page alone.

## Verification

- 25 service/transport cases cover direct/key provenance, duplicate/conflicting
  references, cancelled/missing/pending payments, financial identity mismatches,
  journal conflicts, synthetic invoice summaries, invalid money, company scope,
  full pagination under lower caps, read errors and absence of mutation RPCs.
- 5 mounted-page cases cover manual read-only execution, failed/partial reads,
  duplicate click, old-company late completion, 101 rows and absent company.
- Combined run with the existing monthly report tests: **57 ordinary passes**
  (25 + 5 + 21 + 6). Data transport is mocked; tests do not contact production.
- Full app/node TypeScript and targeted ESLint checks passed. The local build
  passed in 1m22s before the final cancelled-payment/legacy-journal message and
  branch-order refinement; final focused tests/type checks cover that refinement.
  Existing warnings concerned Browserslist, OpenCV browser externalization,
  mixed imports and large chunks. Production schema columns were verified
  read-only; no production payment/receipt mutation was executed.

The broader contract-details goal is still active and unproven. This is a
dependency repair, not a declaration that all financial/legal workflows are safe.
